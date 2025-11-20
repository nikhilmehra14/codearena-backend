const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const { protect } = require('../middleware/auth');
const { validateReminder, validateUUID } = require('../validators/validators');

// All routes are protected
router.use(protect);

router.post('/', validateReminder, reminderController.addReminder);
router.get('/', reminderController.getUserReminders);
router.get('/stats', reminderController.getReminderStats);
router.get('/:id', validateUUID, reminderController.getReminderById);
router.put('/:id', validateUUID, reminderController.updateReminder);
router.delete('/:id', validateUUID, reminderController.deleteReminder);

module.exports = router;
