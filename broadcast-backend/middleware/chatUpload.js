const multer = require("multer");
const path   = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/chat");
  },
  filename: (req, file, cb) => {
    // Sanitise the original name to avoid UTF-8 encoding corruption.
    // Replace the en-dash and other non-ASCII chars that caused the
    // "â" corruption issue seen in uploaded PDF filenames.
    const safe = file.originalname
      .replace(/[^\x00-\x7F]/g, "_")   // replace non-ASCII with _
      .replace(/\s+/g, "_");            // replace spaces with _

    cb(null, `${Date.now()}_${safe}`);
  }
});

const upload = multer({
  storage,

  // FIX 4: was 1MB — too restrictive for PDFs and documents.
  // Flutter compresses images to ~200-400KB but raw PDFs can be several MB.
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB

  fileFilter: (req, file, cb) => {
    const forbidden = ["text/plain", "text/csv"];
    if (forbidden.includes(file.mimetype)) {
      cb(new Error("File type not allowed"), false);
    } else {
      cb(null, true);
    }
  }
});

module.exports = upload;