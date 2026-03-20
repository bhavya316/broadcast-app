const jwt = require("jsonwebtoken");

const generateRefreshToken = (user, role) => {

  return jwt.sign(
    {
      id: user.id,
      role: role
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES
    }
  );

};

module.exports = generateRefreshToken;