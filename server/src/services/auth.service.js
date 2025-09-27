const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ADMIN_USER, ADMIN_PASS_PLAIN, ADMIN_PASS_HASH, JWT_SECRET } = require('../config/env');

async function verifyCredentials(username, password) {
  if (username !== ADMIN_USER) return false;

  // dev fallback: plaintext
  if (ADMIN_PASS_PLAIN && password === ADMIN_PASS_PLAIN) return true;

  if (!ADMIN_PASS_HASH) return false;
  return bcrypt.compare(password, ADMIN_PASS_HASH);
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { verifyCredentials, signToken, verifyToken };
