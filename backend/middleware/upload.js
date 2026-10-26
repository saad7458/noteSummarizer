// middleware/upload.js
// Configures Multer to accept ONLY PDF files, store them in uploads/
// with a safe, unique, auto-generated filename, and enforce a size limit.

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const multer = require("multer");

// In serverless (Vercel / AWS Lambda), the filesystem is read-only except /tmp
const UPLOAD_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "uploads")
  : path.join(__dirname, "..", "uploads");

// Make sure the uploads folder exists before Multer tries to write to it.
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch (e) {
  console.warn("[upload] Could not ensure upload directory:", e.message);
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
