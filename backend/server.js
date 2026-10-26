// server.js
// Entry point of the application.
//
// Order matters here:
// 1. Load dotenv FIRST, before anything touches process.env.
// 2. Create the Express app.
// 3. Connect to MongoDB Atlas.
// 4. Add middleware.
// 5. Register routes.
// 6. Provide a health endpoint.
// 7. Start listening.

require("dotenv").config(); // MUST be first

const express = require("express");
const cors = require("cors");
const multer = require("multer");

const connectDB = require("./config/db");
const noteRoutes = require("./routes/noteRoutes");

const app = express();

// --- Middleware ---------------------------------------------------------
app.use(cors()); // simple/open CORS for development; frontend will call this API
app.use(express.json()); // parse JSON bodies (not used heavily here, but harmless/useful)

// Ensure DB is connected for serverless environments (e.g. Vercel)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("[server] Database connection error:", err.message);
    res.status(500).json({ success: false, message: "Database connection failed." });
  }
});

// --- Routes --------------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "Server is running" });
});

app.use("/api/notes", noteRoutes);

// --- 404 handler -----------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// --- Centralized error handler -----------------------------------------
// Catches errors thrown by Multer (e.g. file too large, wrong file type)
// and any other errors passed to next(err), and returns clean JSON
// without ever leaking stack traces or secrets to the client.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ success: false, message: "File is too large. Maximum size is 15MB." });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }

  if (err && err.message === "Only PDF files are allowed.") {
    return res.status(400).json({ success: false, message: err.message });
  }

  console.error("[server] Unhandled error:", err.message);
  return res.status(500).json({ success: false, message: "Internal server error." });
});

// --- Startup -------------------------------------------------------------
const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
  } catch (err) {
    // Do NOT silently continue if MongoDB fails to connect on startup.
    console.error("[server] Startup aborted: could not connect to MongoDB Atlas.");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[server] Listening on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  start();
}

module.exports = app;
