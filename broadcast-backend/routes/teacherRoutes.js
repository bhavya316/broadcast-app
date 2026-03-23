const express          = require("express");
const router           = express.Router();
const verifyAccessToken = require("../middleware/verifyAccessToken");
const requireRole      = require("../middleware/requireRole");
const profileUpload    = require("../middleware/profileUpload");
const teacherController = require("../controllers/teacherController");
const { Teacher }      = require("../models"); // FIX: was missing, caused ReferenceError

router.post("/signup", teacherController.signup);

router.get(
  "/students",
  verifyAccessToken,
  requireRole("teacher"),
  teacherController.getTeacherStudents
);

router.post(
  "/upload-profile",
  verifyAccessToken,
  requireRole("teacher"),
  profileUpload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No image provided" });
      const imageUrl = `uploads/profiles/${req.file.filename}`;
      await Teacher.update({ profile_image: imageUrl }, { where: { id: req.user.id } });
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
  requireRole("teacher"),
  async (req, res) => {
    try {
      const { fcm_token } = req.body;
      if (!fcm_token) return res.status(400).json({ message: "fcm_token is required" });
      await Teacher.update({ fcm_token }, { where: { id: req.user.id } });
      res.json({ success: true, message: "FCM token registered" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to register token" });
    }
  }
);

module.exports = router;