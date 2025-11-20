const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.get('/', statsController.getAllUserStats);
router.get('/summary', statsController.getUserStatsSummary);
router.get('/:platform', statsController.getPlatformStats);
router.post('/:platform/sync', statsController.syncPlatformStats);

module.exports = router;
