const express = require("express");
const router = express.Router();

const batchController = require("../controllers/batchController");

const verifyAccessToken = require("../middleware/verifyAccessToken");
const requireRole = require("../middleware/requireRole");

router.post(
  "/add-students",
  verifyAccessToken,
  requireRole("teacher"),
  batchController.addStudents
);

router.get(
  "/students/:batch_id",
  verifyAccessToken,
  requireRole("teacher"),
  batchController.getBatchStudents
);

router.post(
  "/message",
  verifyAccessToken,
  requireRole("teacher"),
  batchController.sendMessage
);

router.get(
  "/messages/:batch_id",
  verifyAccessToken,
  batchController.getBatchMessages
);

router.get(
  "/teacher-batches",
  verifyAccessToken,
  requireRole("teacher"),
  batchController.getTeacherBatches
);

router.post(
  "/details",
  verifyAccessToken,
  requireRole("teacher"),
  batchController.getBatchDetails
);

module.exports = router;