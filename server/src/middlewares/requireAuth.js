const { verifyToken } = require('../services/auth.service');

module.exports = function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid/expired token' });
  }
};
