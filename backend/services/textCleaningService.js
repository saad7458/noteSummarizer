// services/textCleaningService.js
// ONLY responsibility: normalize/clean raw extracted PDF text so it is
// readable and consistent before it is sent to Gemini.
//
// This is PREPROCESSING, not summarization:
// - We do NOT remove content because it seems "unimportant".
// - We do NOT paraphrase or shorten the meaning of the notes.
// - We only fix formatting noise introduced by PDF text extraction.

/**
 * Removes lines that are almost certainly page numbers.
 * Matches lines that are just a number, or "Page 3", "3/10", etc.
 */
function removePageNumberLines(lines) {
  const pageNumberPattern = /^(page\s*)?\d{1,4}(\s*(of|\/)\s*\d{1,4})?$/i;
  return lines.filter((line) => !pageNumberPattern.test(line.trim()));
}

/**
 * Detects lines that repeat very frequently across the document
 * (a strong sign of a repeated header/footer, e.g. a course title
 * printed on every page) and removes them.
 * Only removes a line if it repeats often AND is short (headers/footers
 * are typically short — this avoids accidentally deleting real content
 * that happens to repeat, like a bullet point used twice).
 */
function removeRepeatedHeadersFooters(lines) {
  const counts = new Map();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    counts.set(trimmed, (counts.get(trimmed) || 0) + 1);
  }

  const totalNonEmptyLines = lines.filter((l) => l.trim()).length;
  // A line repeating on a large fraction of "pages" (approximated by
  // frequency relative to overall line count) and being short is
  // treated as a repeated header/footer.
  const repeatThreshold = Math.max(3, Math.floor(totalNonEmptyLines * 0.02));

  const linesToRemove = new Set();
  for (const [text, count] of counts.entries()) {
    if (count >= repeatThreshold && text.length <= 80) {
      linesToRemove.add(text);
    }
  }

  if (linesToRemove.size === 0) return lines;

  return lines.filter((line) => !linesToRemove.has(line.trim()));
}

/**
 * Fixes common PDF extraction artifacts without touching real content:
 * - hyphenated words broken across a line break ("exam-\nple" -> "example")
 * - stray control characters
 * - common ligature/spacing glitches
 */
function fixExtractionArtifacts(text) {
  return text
    .replace(/\u0000/g, "") // null bytes
    .replace(/[\u2018\u2019]/g, "'") // smart single quotes -> normal
    .replace(/[\u201C\u201D]/g, '"') // smart double quotes -> normal
    .replace(/-\n(?=[a-z])/g, "") // de-hyphenate words broken across lines
    .replace(/\r\n/g, "\n") // normalize Windows line endings
    .replace(/\r/g, "\n");
}

/**
 * Main cleaning function.
 * @param {string} rawText - text straight out of pdfService
 * @returns {string} cleaned text, safe to send to Gemini
 */
function cleanExtractedText(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return "";
  }

  let text = fixExtractionArtifacts(rawText);

  // Split into lines so we can filter out page numbers / repeated headers.
  let lines = text.split("\n").map((line) => line.replace(/[ \t]+/g, " ").trim());

  lines = removePageNumberLines(lines);
  lines = removeRepeatedHeadersFooters(lines);

  // Collapse the lines back into text, preserving paragraph breaks.
  text = lines.join("\n");

  // Normalize excessive blank lines (3+ newlines -> 2, i.e. one blank line).
  text = text.replace(/\n{3,}/g, "\n\n");

  // Remove lines that are now completely empty at the very start/end.
  text = text.trim();

  // Normalize multiple spaces within a line (but keep single newlines intact,
  // which preserves bullet points and paragraph structure).
  text = text
    .split("\n")
    .map((line) => line.replace(/ {2,}/g, " "))
    .join("\n");

  return text;
}

module.exports = { cleanExtractedText };
