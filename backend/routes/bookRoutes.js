const express = require('express');
const controller = require('../controllers/bookController');
const { authMiddleware, requireAdmin, requireRole } = require('../middleware/authMiddleware');
const auth = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/', authMiddleware, requireRole('author'), uploadSingleImage('coverImage'), controller.createBook);
router.put('/:id', authMiddleware, requireRole('author'), uploadSingleImage('coverImage'), controller.updateBook);
router.delete('/:id', authMiddleware, requireAdmin, controller.deleteBook);
router.get('/homepage', controller.getHomepage);
router.get('/short-stories/reel', auth.optionalAuth, controller.getShortStoriesReel);
router.get('/', controller.getBooks);
router.get('/category/:slug', controller.getCategoryBooks);
router.post('/recalculate-trending', auth('admin'), controller.recalculateTrending);
router.get('/slug/:slug', controller.getBookBySlug);
router.get('/:id', controller.getBookById);

module.exports = router;
