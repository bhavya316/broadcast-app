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

router.post(
  "/read",
  verifyAccessToken,
  requireRole("student"),
  chatController.markMessageRead
);

/*
Send private message
Supports text + file
*/
router.post(
  "/private/send",
  verifyAccessToken,
  upload.array("file", 5),
  chatController.sendPrivateMessage
);

/*
Get private chat history (paginated)
*/

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

module.exports = router;