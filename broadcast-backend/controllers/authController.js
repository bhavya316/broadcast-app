const Teacher = require("../models/teacher");
const Student = require("../models/student");

const generateAccessToken = require("../utils/generateAccessToken");
const generateRefreshToken = require("../utils/generateRefreshToken");

exports.verifyOTP = async (req, res) => {

  try {

    const { phone_number, role } = req.body;

    if (!phone_number || !role) {
      return res.status(400).json({
        message: "phone_number and role required"
      });
    }

    let user;

    if (role === "teacher") {

      user = await Teacher.findOne({
        where: { phone_number }
      });

    } else if (role === "student") {

      user = await Student.findOne({
        where: { phone_number }
      });

    }

    if (!user) {
      return res.status(404).json({
        message: "User not registered"
      });
    }

    const accessToken = generateAccessToken(user, role);
    const refreshToken = generateRefreshToken(user, role);

    res.json({
      success: true,
      accessToken,
      refreshToken,
      role,
      user
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Login failed"
    });

  }

};

/*
================================================
Refresh Access Token
POST /api/auth/refresh
Body: { refreshToken: string }
Returns: { success, accessToken }
================================================
*/
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: "Refresh token required" });
    }

    let decoded;
    try {
      decoded = require("jsonwebtoken").verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
    }

    const { id, role } = decoded;

    // Verify user still exists
    const model   = role === "teacher"
      ? require("../models/teacher")
      : require("../models/student");

    const user = await model.findByPk(id);
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const generateAccessToken = require("../utils/generateAccessToken");
    const accessToken = generateAccessToken(user, role);

    return res.json({ success: true, accessToken });

  } catch (error) {
    console.error("refreshToken error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};