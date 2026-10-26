// services/geminiService.js
// ONLY responsibility: send cleaned note text to Gemini and get back
// a structured { summary, flowchart } result.
//
// Uses the current official Google Gen AI SDK for Node.js: "@google/genai"
// (this replaced the older, now-deprecated "@google/generative-ai" package).
//
// Uses the Interactions API (ai.interactions.create), which is Google's
// current recommended way to call Gemini models — the older
// ai.models.generateContent() call still works but is now considered
// legacy. The Interactions API requires @google/genai >= 2.3.0.
//
// Model choice: "gemini-3.6-flash"
// - This is Gemini's current general-purpose workhorse model (the model
//   previously used here, "gemini-2.5-flash", is no longer available to
//   new users).
// - It fully supports structured JSON output via response_format, which we
//   rely on so we don't have to parse Markdown code fences ourselves.
// - It's well suited to text understanding + summarization + structured
//   relationship extraction, which is exactly what this app needs.

const { GoogleGenAI } = require("@google/genai");

const MODEL_NAME = "gemini-3.6-flash";

// Describes the exact JSON shape we want Gemini to return, as a plain
// JSON Schema object. The Interactions API's response_format.schema field
// accepts standard JSON Schema, so Gemini's output is constrained at
// generation time and we never need to strip ```json fences ourselves.
const responseJsonSchema = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "A concise but useful summary of the notes.",
    },
    flowchart: {
      type: "object",
      properties: {
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              label: { type: "string" },
            },
            required: ["id", "label"],
          },
        },
        edges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              source: { type: "string" },
              target: { type: "string" },
              label: { type: "string" },
            },
            required: ["source", "target"],
          },
        },
      },
      required: ["nodes", "edges"],
    },
  },
  required: ["summary", "flowchart"],
};

const SYSTEM_INSTRUCTION = `You are an expert study-notes analyst.
You will be given cleaned text extracted from a student's PDF notes.

Your job:
1. Understand the entire input.
2. Identify the important concepts.
3. Create a useful, concise summary.
4. Preserve important definitions, relationships, processes, and key facts.
5. Identify the logical relationships between concepts.
6. Generate a flowchart representing the structure/relationships of the notes.

Rules:
- Base the summary ONLY on the supplied notes. Do not invent information.
- The flowchart must represent concepts actually present in the notes.
- Every node must have a unique "id" and a human-readable "label".
- Every edge's "source" and "target" must reference an existing node id.
- Avoid duplicate nodes.
- Keep the flowchart understandable rather than creating hundreds of tiny nodes
  (aim for a clear, readable diagram, not exhaustive detail).
- If the notes describe a process, represent it in logical order.
- If the notes describe a hierarchy, represent that hierarchy.
- If the notes describe relationships between concepts, represent those relationships
  with meaningful edge labels (e.g. "causes", "is part of", "leads to").
- Return ONLY the structured JSON result. Do not include any other commentary.`;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined. Please set it in your .env file.");
  }
  // Never log the API key anywhere.
  return new GoogleGenAI({ apiKey });
}

// Rejects with a timeout error after the given number of milliseconds.
// Used with Promise.race() since interactions.create() does not expose
// an abort-signal option in the current SDK.
function timeoutAfter(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Gemini request timed out. Please try again.")), ms);
  });
}

/**
 * Sends cleaned note text to Gemini and returns the parsed
 * { summary, flowchart } object.
 *
 * @param {string} cleanedText
 * @returns {Promise<{summary: string, flowchart: {nodes: any[], edges: any[]}}>}
 * @throws {Error} on API failure, timeout, or malformed response
 */
async function generateSummaryAndFlowchart(cleanedText) {
  if (!cleanedText || typeof cleanedText !== "string" || cleanedText.trim().length === 0) {
    throw new Error("Cannot summarize empty text.");
  }

  const ai = getClient();

  let interaction;
  try {
    interaction = await Promise.race([
      ai.interactions.create({
        model: MODEL_NAME,
        input: `Here are the notes to analyze:\n\n${cleanedText}`,
        system_instruction: SYSTEM_INSTRUCTION,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: responseJsonSchema,
        },
        generation_config: {
          temperature: 0.3,
        },
      }),
      timeoutAfter(180_000), // guard against Gemini hanging indefinitely (allow up to 3 mins for large notes)
    ]);
  } catch (err) {
    throw new Error(`Gemini API request failed: ${err.message}`);
  }

  // "output_text" is the SDK's recommended convenience accessor for the
  // final text output of an interaction — no need to walk the steps array
  // or strip Markdown fences ourselves.
  const rawText = interaction && interaction.output_text;

  if (!rawText) {
    throw new Error("Gemini returned an empty response.");
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error("Gemini returned a response that was not valid JSON.");
  }

  return parsed;
}

module.exports = { generateSummaryAndFlowchart };