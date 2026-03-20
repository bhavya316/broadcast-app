const express = require("express");
const router = express.Router();

const reminderController = require("../controllers/reminderController");
const verifyAccessToken = require("../middleware/verifyAccessToken");
const requireRole = require("../middleware/requireRole");

router.post(
  "/send",
  verifyAccessToken,
  requireRole("teacher"),
  reminderController.sendReminder
);

module.exports = router;