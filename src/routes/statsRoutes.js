const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { protect } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const {
  getPlatformStatsSchema,
  syncPlatformStatsSchema,
} = require('../validators/schemas');

// All routes are protected
router.use(protect);

router.get('/', statsController.getAllUserStats);
router.get('/summary', statsController.getUserStatsSummary);
router.get('/:platform', validateRequest(getPlatformStatsSchema), statsController.getPlatformStats);
router.post('/:platform/sync', validateRequest(syncPlatformStatsSchema), statsController.syncPlatformStats);

module.exports = router;
