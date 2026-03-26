const express = require('express');
const router = express.Router();
const complianceController = require('../controllers/complianceController');

// Internal compliance routes (no auth middleware for now)
router.post('/link-record', complianceController.linkRecordToEmail);
router.post('/update-status', complianceController.updateStatus);

module.exports = router;

