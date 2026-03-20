const express = require("express");
const router = express.Router();

const noticeController = require("../controllers/noticeController");

const verifyAccessToken = require("../middleware/verifyAccessToken");

router.post(
  "/create",
  verifyAccessToken,
  noticeController.createNotice
);

router.get(
  "/list",
  verifyAccessToken,
  noticeController.getNotices
);

module.exports = router;