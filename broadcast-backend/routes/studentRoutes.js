const express = require("express");
const router = express.Router();
const verifyAccessToken = require("../middleware/verifyAccessToken");
const requireRole = require("../middleware/requireRole");
const { getStudentById } = require("../controllers/studentController");
const studentController = require("../controllers/studentController");
const batchController = require("../controllers/batchController");
const profileUpload = require("../middleware/profileUpload");

router.post("/signup", studentController.signup);

router.get(
  "/batches",
  verifyAccessToken,
  requireRole("student"),
  studentController.getStudentBatches
);

router.post(
  "/get-student",
  verifyAccessToken,
  studentController.getStudentById
);

router.post(
  "/batch-details",
  verifyAccessToken,
  requireRole("student"),
  batchController.getStudentBatchDetails
);

router.post(
  "/upload-profile",
  verifyAccessToken,
  requireRole("student"),
  profileUpload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No image provided" });
      const imageUrl = `uploads/profiles/${req.file.filename}`;
      await Student.update({ profile_image: imageUrl }, { where: { id: req.user.id } });
      res.json({ success: true, profile_image: imageUrl });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to upload profile image" });
    }
  }
);

router.post(
  "/register-token",
  verifyAccessToken,
  requireRole("student"),
  async (req, res) => {
    try {
      const { fcm_token } = req.body;
      if (!fcm_token) return res.status(400).json({ message: "fcm_token is required" });
      await Student.update({ fcm_token }, { where: { id: req.user.id } });
      res.json({ success: true, message: "FCM token registered" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to register token" });
    }
  }
);

module.exports = router;