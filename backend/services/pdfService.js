// services/pdfService.js
// ONLY responsibility: read a PDF file from disk and extract its raw text.
// This file does NOT clean, summarize, or interpret the text in any way.

const fs = require("fs");
const pdfParse = require("pdf-parse");

/**
 * Extracts text from a PDF file on disk.
 * @param {string} filePath - absolute path to the uploaded PDF
 * @returns {Promise<string>} the raw extracted text
 * @throws {Error} if the file cannot be read or no meaningful text is found
 */
async function extractTextFromPDF(filePath) {
  let dataBuffer;

  try {
    dataBuffer = fs.readFileSync(filePath);
  } catch (err) {
    throw new Error("Could not read the uploaded PDF file from disk.");
  }

  let result;
  try {
    // pdf-parse reads all pages and concatenates their text automatically.
    result = await pdfParse(dataBuffer);
  } catch (err) {
    // This typically means the PDF is corrupted or not a valid PDF at all.
    throw new Error("Failed to parse the PDF. The file may be corrupted or invalid.");
  }

  const text = (result.text || "").trim();

  // Detect extraction failure: e.g. a scanned/image-only PDF with no real text layer.
  if (!text || text.length < 10) {
    throw new Error(
      "No meaningful text could be extracted from this PDF. It may be a scanned image without a text layer."
    );
  }

  return text;
}

module.exports = { extractTextFromPDF };
