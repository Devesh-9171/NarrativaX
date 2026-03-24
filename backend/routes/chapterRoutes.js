const express = require('express');
const controller = require('../controllers/chapterController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const auth = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/uploadMiddleware');

const router = express.Router();
router.post('/', authMiddleware, requireRole('author'), uploadSingleImage('image'), controller.createChapter);
router.post('/complete-view', auth.optionalAuth, controller.completeChapterView);
router.get('/:slug/:chapterSlug', controller.getChapter);
module.exports = router;
