// routes/noteRoutes.js
// Defines the URL paths for note-related endpoints and wires them to
// the upload middleware and controller functions.

const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const {
  uploadNote,
  listNotes,
  getNoteById,
  deleteNote,
} = require("../controllers/noteController");

// POST /api/notes/upload  (multipart/form-data, field name: "file")
router.post("/upload", upload.single("file"), uploadNote);

// GET /api/notes  -> list all notes (metadata only)
router.get("/", listNotes);

// GET /api/notes/:id  -> full details for one note
router.get("/:id", getNoteById);

// DELETE /api/notes/:id  -> delete a note and its PDF
router.delete("/:id", deleteNote);

module.exports = router;
