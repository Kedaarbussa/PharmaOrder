const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed. Access token is missing or malformed.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET || 'pharmaorder_local_fallback_secret_32_chars';
    const decoded = jwt.verify(token, secret);
    req.user = decoded; // { id, username, email, name }
    next();
  } catch (err) {
    console.error('JWT Token Verification Error:', err.message);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token. Please sign in again.',
    });
  }
};

module.exports = authMiddleware;
