// controllers/noteController.js
// Orchestrates the full pipeline for each endpoint:
// PDF -> extract -> clean -> save -> Gemini -> validate -> save -> respond
//
// This file coordinates the services; it does not implement extraction,
// cleaning, or Gemini logic itself (that lives in services/).

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Note = require("../models/Note");
const { extractTextFromPDF } = require("../services/pdfService");
const { cleanExtractedText } = require("../services/textCleaningService");
const { generateSummaryAndFlowchart } = require("../services/geminiService");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Deletes a file from disk without crashing the server if it fails.
function safeDeleteFile(filePath) {
  if (!filePath) return;
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error(`[cleanup] Failed to delete file ${filePath}:`, err.message);
    }
  });
}

// Validates the shape of Gemini's parsed JSON result.
// Returns { valid: true } or { valid: false, reason: "..." }.
function validateGeminiResult(result) {
  if (!result || typeof result !== "object") {
    return { valid: false, reason: "Result is not an object." };
  }

  if (typeof result.summary !== "string" || result.summary.trim().length === 0) {
    return { valid: false, reason: "Missing or invalid 'summary'." };
  }

  const flowchart = result.flowchart;
  if (!flowchart || typeof flowchart !== "object") {
    return { valid: false, reason: "Missing or invalid 'flowchart'." };
  }

  if (!Array.isArray(flowchart.nodes)) {
    return { valid: false, reason: "'flowchart.nodes' must be an array." };
  }

  if (!Array.isArray(flowchart.edges)) {
    return { valid: false, reason: "'flowchart.edges' must be an array." };
  }

  const seenIds = new Set();
  for (const node of flowchart.nodes) {
    if (!node || typeof node.id !== "string" || node.id.trim() === "") {
      return { valid: false, reason: "Every node must have a non-empty string 'id'." };
    }
    if (typeof node.label !== "string" || node.label.trim() === "") {
      return { valid: false, reason: "Every node must have a non-empty string 'label'." };
    }
    if (seenIds.has(node.id)) {
      return { valid: false, reason: `Duplicate node id found: ${node.id}` };
    }
    seenIds.add(node.id);
  }

  for (const edge of flowchart.edges) {
    if (!edge || typeof edge.source !== "string" || typeof edge.target !== "string") {
      return { valid: false, reason: "Every edge must have string 'source' and 'target'." };
    }
    if (!seenIds.has(edge.source) || !seenIds.has(edge.target)) {
      return {
        valid: false,
        reason: `Edge references a node id that does not exist (${edge.source} -> ${edge.target}).`,
      };
    }
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// POST /api/notes/upload
// ---------------------------------------------------------------------------
async function uploadNote(req, res) {
  // 1. Check that a file was uploaded.
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No PDF file uploaded." });
  }

  const filePath = req.file.path;
  let note; // will hold the initial saved MongoDB document

  try {
    // 2. Multer's fileFilter already validated this is a PDF before we get here.

    // 3. Extract text.
    let extractedText;
    try {
      extractedText = await extractTextFromPDF(filePath);
    } catch (err) {
      safeDeleteFile(filePath);
      return res.status(422).json({ success: false, message: err.message });
    }

    // 4. Check that extracted text is meaningful/non-empty (extractTextFromPDF already
    //    throws for this, but we double-check defensively).
    if (!extractedText || extractedText.trim().length === 0) {
      safeDeleteFile(filePath);
      return res.status(422).json({ success: false, message: "Extracted text is empty." });
    }

    // 5. Clean the extracted text.
    const cleanedText = cleanExtractedText(extractedText);

    // 6. Check that cleaned text is meaningful/non-empty.
    if (!cleanedText || cleanedText.trim().length === 0) {
      safeDeleteFile(filePath);
      return res.status(422).json({ success: false, message: "Cleaned text is empty." });
    }

    // 7. Create/save the initial MongoDB document (status: processing).
    try {
      note = await Note.create({
        originalFileName: req.file.originalname,
        storedFileName: req.file.filename,
        filePath: filePath,
        extractedText,
        cleanedText,
        status: "processing",
      });
    } catch (err) {
      console.error("[uploadNote] Failed to save note to database:", err.message);
      safeDeleteFile(filePath);
      return res.status(500).json({ success: false, message: "Failed to save note to database." });
    }

    // 8 & 9. Send cleaned text to Gemini and receive the result.
    let geminiResult;
    try {
      geminiResult = await generateSummaryAndFlowchart(cleanedText);
    } catch (err) {
      console.error("[uploadNote] Gemini processing error:", err.message);
      note.status = "failed";
      await note.save().catch(() => {}); // keep DB state consistent, but don't crash if this fails too
      return res.status(502).json({ success: false, message: `Gemini processing failed: ${err.message}` });
    }

    // 10. Validate Gemini result.
    const validation = validateGeminiResult(geminiResult);
    if (!validation.valid) {
      note.status = "failed";
      await note.save().catch(() => {});
      return res.status(502).json({
        success: false,
        message: `Gemini returned an invalid result: ${validation.reason}`,
      });
    }

    // 11. Save summary and flowchart to MongoDB.
    note.summary = geminiResult.summary;
    note.flowchart = geminiResult.flowchart;
    note.status = "completed";
    await note.save();

    // 12. Return the result to the client.
    return res.status(201).json({
      success: true,
      message: "Note processed successfully",
      noteId: note._id,
      summary: note.summary,
      flowchart: note.flowchart,
    });
  } catch (err) {
    // Catch-all safety net. Clean up the uploaded file if something
    // unexpected happened before/without a database record being finalized.
    safeDeleteFile(filePath);
    console.error("[uploadNote] Unexpected error:", err.message);
    return res.status(500).json({ success: false, message: "An unexpected error occurred while processing the note." });
  }
}

// ---------------------------------------------------------------------------
// GET /api/notes
// ---------------------------------------------------------------------------
async function listNotes(req, res) {
  try {
    // Exclude large text fields from the list view for performance.
    const notes = await Note.find({}, "originalFileName status createdAt updatedAt").sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      notes: notes.map((n) => ({
        id: n._id,
        originalFileName: n.originalFileName,
        status: n.status,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
    });
  } catch (err) {
    console.error("[listNotes] Error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch notes." });
  }
}

// ---------------------------------------------------------------------------
// GET /api/notes/:id
// ---------------------------------------------------------------------------
async function getNoteById(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid note id." });
  }

  try {
    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found." });
    }

    return res.status(200).json({
      success: true,
      note: {
        id: note._id,
        originalFileName: note.originalFileName,
        extractedText: note.extractedText,
        cleanedText: note.cleanedText,
        summary: note.summary,
        flowchart: note.flowchart,
        status: note.status,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
    });
  } catch (err) {
    console.error("[getNoteById] Error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch note." });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/notes/:id
// ---------------------------------------------------------------------------
async function deleteNote(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid note id." });
  }

  try {
    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found." });
    }

    // Delete the MongoDB document first.
    await Note.deleteOne({ _id: id });

    // Then attempt to delete the corresponding uploaded PDF.
    // If this fails, log it but do not fail the whole request —
    // the database record is already gone, which is the primary intent.
    if (note.filePath) {
      fs.unlink(note.filePath, (err) => {
        if (err && err.code !== "ENOENT") {
          console.error(`[deleteNote] Failed to delete file ${note.filePath}:`, err.message);
        }
      });
    }

    return res.status(200).json({ success: true, message: "Note deleted successfully." });
  } catch (err) {
    console.error("[deleteNote] Error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to delete note." });
  }
}

module.exports = {
  uploadNote,
  listNotes,
  getNoteById,
  deleteNote,
};
