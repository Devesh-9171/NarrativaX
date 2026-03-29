const express = require('express');
const auth = require('../middleware/auth');
const { optionalAuth } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.post('/', optionalAuth, reportController.createReport);
router.get('/', auth('admin'), reportController.getReports);

module.exports = router;
