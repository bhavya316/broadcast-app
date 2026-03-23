const express = require("express");
const router  = express.Router();

const authController = require("../controllers/authController");

router.post("/verify-otp", authController.verifyOTP);
router.post("/refresh",    authController.refreshToken);

module.exports = router;