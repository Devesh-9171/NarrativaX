const express = require('express');
const controller = require('../controllers/chapterController');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');
const { uploadSingleImage } = require('../middleware/uploadMiddleware');

const router = express.Router();
router.post('/', authMiddleware, requireAdmin, uploadSingleImage('image'), controller.createChapter);
router.get('/:slug/:chapterSlug', controller.getChapter);
module.exports = router;
