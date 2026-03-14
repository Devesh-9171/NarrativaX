const express = require('express');
const auth = require('../middleware/auth');
const controller = require('../controllers/userController');

const router = express.Router();
router.get('/me', auth(), controller.getMe);
router.post('/bookmark/:chapterId', auth(), controller.toggleBookmark);
router.post('/favorite/:bookId', auth(), controller.toggleFavoriteBook);
router.post('/progress', auth(), controller.saveReadingProgress);

module.exports = router;
