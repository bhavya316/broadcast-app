const multer = require("multer");
const path   = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/batch");
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    cb(null, `batch_${req.params.batchId}_${Date.now()}${ext}`);
  }
});

const batchUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  }
});

module.exports = batchUpload;