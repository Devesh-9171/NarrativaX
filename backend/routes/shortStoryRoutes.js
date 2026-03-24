const express = require('express');
const controller = require('../controllers/shortStoryController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const auth = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/', authMiddleware, requireRole('author'), uploadSingleImage('coverImage'), controller.createShortStory);
router.post('/short-story', authMiddleware, requireRole('author'), uploadSingleImage('coverImage'), controller.createShortStory);
router.get('/:id', controller.getPublishedShortStory);
router.post('/complete-view', auth.optionalAuth, controller.completeShortStoryView);

module.exports = router;
