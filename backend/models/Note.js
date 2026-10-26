// models/Note.js
// Defines the shape of a "Note" document stored in MongoDB.
// A Note represents one uploaded PDF and everything derived from it:
// the raw extracted text, the cleaned text, and Gemini's summary + flowchart.

const mongoose = require("mongoose");

// A single node in the flowchart (e.g. one concept/topic).
const NodeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false } // we use our own "id" field, no need for Mongo's _id here
);

// A single edge (relationship) connecting two nodes.
const EdgeSchema = new mongoose.Schema(
  {
    source: { type: String, required: true },
    target: { type: String, required: true },
    label: { type: String, default: "" },
  },
  { _id: false }
);

const FlowchartSchema = new mongoose.Schema(
  {
    nodes: { type: [NodeSchema], default: [] },
    edges: { type: [EdgeSchema], default: [] },
  },
  { _id: false }
);

const NoteSchema = new mongoose.Schema(
  {
    // The name of the file as the user uploaded it (for display only).
    originalFileName: {
      type: String,
      required: true,
    },
    // The safe, unique, generated filename actually used on disk.
    storedFileName: {
      type: String,
      required: true,
    },
    // Full path where the PDF was saved on disk.
    filePath: {
      type: String,
      required: true,
    },
    // Raw text extracted directly from the PDF (before cleaning).
    extractedText: {
      type: String,
      default: "",
    },
    // Text after whitespace/artifact cleanup, sent to Gemini.
    cleanedText: {
      type: String,
      default: "",
    },
    // Gemini-generated summary of the notes.
    summary: {
      type: String,
      default: "",
    },
    // Gemini-generated flowchart representing relationships between concepts.
    flowchart: {
      type: FlowchartSchema,
      default: () => ({ nodes: [], edges: [] }),
    },
    // Tracks how far along the processing pipeline this note got.
    // Useful for debugging and for knowing whether a note "succeeded".
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
  },
  {
    timestamps: true, // automatically adds createdAt and updatedAt
  }
);

module.exports = mongoose.model("Note", NoteSchema);
