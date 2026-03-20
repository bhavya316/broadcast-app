const jwt = require("jsonwebtoken");

// Separate middleware for admin routes.
// Admin tokens are signed with ADMIN_JWT_SECRET (or fallback
// "admin_secret_key"), NOT the same secret as student/teacher tokens.
// Using verifyAccessToken on admin routes caused 401s because the
// secrets didn't match.

const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Admin token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.ADMIN_JWT_SECRET || "admin_secret_key"
    );

    req.admin = decoded;
    next();

  } catch (error) {
    res.status(401).json({ message: "Invalid or expired admin token" });
  }
};

module.exports = verifyAdminToken;