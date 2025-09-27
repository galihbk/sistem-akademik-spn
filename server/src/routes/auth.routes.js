const router = require('express').Router();
const { login, check } = require('../controllers/auth.controller');

router.post('/login', login);
router.get('/check', check);

module.exports = router;
