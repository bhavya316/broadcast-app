const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");

const verifyAccessToken = require("../middleware/verifyAccessToken");
const requireRole = require("../middleware/requireRole");

router.get(
  "/recent-notices",
  verifyAccessToken,
  requireRole("teacher"),
  dashboardController.recentNotices
);

module.exports = router;