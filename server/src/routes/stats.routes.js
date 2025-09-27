const router = require('express').Router();
const requireAuth = require('../middlewares/requireAuth');
const { summary, recentActivity, latestLogs } = require('../controllers/stats.controller');

router.get('/summary', requireAuth, summary);
router.get('/latest-logs', requireAuth, latestLogs);
router.get('/recent',  requireAuth, recentActivity);

module.exports = router;
