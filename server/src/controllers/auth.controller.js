const { verifyCredentials, signToken, verifyToken } = require('../services/auth.service');

async function login(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: 'Missing credentials' });

  const ok = await verifyCredentials(username, password);
  if (!ok) return res.status(401).json({ message: 'Invalid user or password' });

  const token = signToken({ role: 'admin', username });
  res.json({ token, role: 'admin' });
}

function check(req, res) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const payload = verifyToken(token);
    res.json({ ok: true, payload });
  } catch (e) {
    res.status(401).json({ message: 'Invalid/expired token' });
  }
}

module.exports = { login, check };
