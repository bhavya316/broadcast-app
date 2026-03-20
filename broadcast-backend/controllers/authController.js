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
