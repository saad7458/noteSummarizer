// config/db.js
// Responsible for connecting to MongoDB Atlas using Mongoose.
// This file does NOT know about routes, controllers, or Gemini.
// Its only job is: read the connection string, connect, and report success/failure.

const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  // Fail loudly and immediately if the connection string is missing.
  // We never fall back to a local MongoDB instance.
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not defined. Please set it in your .env file (MongoDB Atlas connection string)."
    );
  }

  if (uri.includes("127.0.0.1") || uri.includes("localhost")) {
    throw new Error(
      "MONGODB_URI points to a local MongoDB instance. This project requires MongoDB Atlas."
    );
  }

  try {
    await mongoose.connect(uri);
    console.log("[db] Connected to MongoDB Atlas successfully.");
  } catch (err) {
    console.error("[db] Failed to connect to MongoDB Atlas:", err.message);
    throw err; // Let server.js decide what to do (it will stop startup).
  }

  mongoose.connection.on("error", (err) => {
    console.error("[db] MongoDB connection error:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[db] MongoDB disconnected.");
  });
}

module.exports = connectDB;
