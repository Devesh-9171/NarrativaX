const express = require('express');
const controller = require('../controllers/chapterController');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();
router.post('/', authMiddleware, requireAdmin, controller.createChapter);
router.get('/:slug/:chapterSlug', controller.getChapter);
module.exports = router;
