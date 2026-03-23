const express = require("express");
const router = express.Router();

const chatController = require("../controllers/chatController");
const verifyAccessToken = require("../middleware/verifyAccessToken");
const requireRole = require("../middleware/requireRole");
const upload = require("../middleware/chatUpload");

router.post(
  "/history",
  verifyAccessToken,
  chatController.getBatchMessages
);

router.post(
  "/send",
  verifyAccessToken,
  requireRole("teacher"),
  upload.array("file", 5),
  chatController.sendBatchMessage
);

/*
FIX: Removed requireRole("student") from /read.
Previously only students could mark messages as read, which meant teachers
had no way to clear the badge when a student sent them a private message.
Both roles now hit the same markMessageRead handler, which already validates
that the caller is the actual receiver of the message before updating.
*/
router.post(
  "/read",
  verifyAccessToken,
  chatController.markMessageRead
);

router.post(
  "/private/send",
  verifyAccessToken,
  upload.array("file", 5),
  chatController.sendPrivateMessage
);

router.post(
  "/private/history",
  verifyAccessToken,
  chatController.getPrivateMessages
);

router.post(
  "/conversations",
  verifyAccessToken,
  chatController.getConversations
);

router.post(
  "/message-page",
  verifyAccessToken,
  chatController.getMessagePage
);

router.post(
  "/media",
  verifyAccessToken,
  chatController.getChatMedia
);
router.post(
  "/report",
  verifyAccessToken,
  chatController.submitReport
);

module.exports = router;