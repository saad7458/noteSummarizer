// middleware/upload.js
// Configures Multer to accept ONLY PDF files, store them in uploads/
// with a safe, unique, auto-generated filename, and enforce a size limit.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

// Make sure the uploads folder exists before Multer tries to write to it.
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // Never trust the original filename for filesystem paths.
    // Generate a random, unique name instead, but keep the .pdf extension.
    const uniqueSuffix = crypto.randomBytes(16).toString("hex");
    const safeName = `${Date.now()}-${uniqueSuffix}.pdf`;
    cb(null, safeName);
  },
});

// Only accept files that are actually PDFs (by mimetype AND extension).
function fileFilter(req, file, cb) {
  const isPdfMime = file.mimetype === "application/pdf";
  const isPdfExt = path.extname(file.originalname).toLowerCase() === ".pdf";

  if (isPdfMime && isPdfExt) {
    cb(null, true);
  } else {
    // Passing an Error here causes Multer to reject the file;
    // it will surface in the controller/error handler as err.
    cb(new Error("Only PDF files are allowed."));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB max
  },
});

module.exports = upload;
