const express = require('express');
const auth = require('../middleware/auth');
const controller = require('../controllers/userController');

const router = express.Router();
router.get('/me', auth(), controller.getMe);
router.post('/bookmark/:chapterId', auth(), controller.toggleBookmark);
router.post('/favorite/:bookId', auth(), controller.toggleFavoriteBook);
router.post('/progress', auth(), controller.saveReadingProgress);
router.get('/reading-progress', auth(), controller.getContinueReading);
router.get('/reading-progress/:bookId', auth(), controller.getBookReadingProgress);
router.post('/reading-progress', auth(), controller.upsertReadingProgress);
router.post('/author/request', auth(), controller.requestAuthorRole);
router.post('/author/translation-permission', auth(), controller.enableTranslationPermission);
router.put('/author/payment-details', auth(), controller.updateAuthorPaymentDetails);
router.get('/my-content', auth(), controller.getMyContent);

module.exports = router;
