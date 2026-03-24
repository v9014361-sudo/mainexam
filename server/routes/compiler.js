const express = require('express');
const router = express.Router();
const compilerController = require('../controllers/compilerController');
const { authenticate, authorize } = require('../middleware/auth');

// Run code (Students during exam or practice)
router.post('/run', authenticate, compilerController.runCode);

// Submit code (Students during exam)
router.post('/submit', authenticate, authorize('student'), compilerController.submitCode);

module.exports = router;
