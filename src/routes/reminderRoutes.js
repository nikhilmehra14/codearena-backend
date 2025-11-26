const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const { protect } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');
const {
  addReminderSchema,
  updateReminderSchema,
  uuidParamSchema,
} = require('../validators/schemas');

// All routes are protected
router.use(protect);

router.post('/', validateRequest(addReminderSchema), reminderController.addReminder);
router.get('/', reminderController.getUserReminders);
router.get('/stats', reminderController.getReminderStats);
router.get('/jobs/:jobId', reminderController.getJobStatus);
router.get('/:id', validateRequest(uuidParamSchema), reminderController.getReminderById);
router.put('/:id', validateRequest(updateReminderSchema), reminderController.updateReminder);
router.delete('/:id', validateRequest(uuidParamSchema), reminderController.deleteReminder);

module.exports = router;
