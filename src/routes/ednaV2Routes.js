/**
 * E-DNA v2 routes (website, 17 Nov 2026). Strict Cognito auth lives inside the controller —
 * these endpoints are new, so nothing legacy depends on the old fallbacks.
 */
const express = require('express');
const router = express.Router();
const ednaV2Controller = require('../controllers/ednaV2Controller');

/** POST /api/v2/edna/complete — score the finished assessment server-side and store it. */
router.post('/complete', ednaV2Controller.completeAssessment);

/** The unfinished-assessment mirror (23 Nov 2026): the browser saves its snapshot here so
 *  the resume email works on any device; cleared when the finished result is stored. */
router.put('/progress', ednaV2Controller.saveProgressV2);
router.get('/progress', ednaV2Controller.getProgressV2);

module.exports = router;
