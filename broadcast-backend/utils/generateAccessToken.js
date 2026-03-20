const jwt = require("jsonwebtoken");

const generateAccessToken = (user, role) => {

  return jwt.sign(
    {
      id: user.id,
      role: role,
      phone_number: user.phone_number
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES
    }
  );

};

module.exports = generateAccessToken;