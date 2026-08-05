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
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is missing in environment variables');
      return res.status(500).json({
        success: false,
        error: 'Server authentication configuration error.',
      });
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded; // { id, googleId, email, name, picture }
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token. Please sign in again.',
    });
  }
};

module.exports = authMiddleware;
