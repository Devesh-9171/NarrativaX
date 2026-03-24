const express = require('express');
const controller = require('../controllers/bookController');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');
const auth = require('../middleware/auth');
const { uploadSingleImage } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/', authMiddleware, requireAdmin, uploadSingleImage('coverImage'), controller.createBook);
router.put('/:id', authMiddleware, requireAdmin, uploadSingleImage('coverImage'), controller.updateBook);
router.delete('/:id', authMiddleware, requireAdmin, controller.deleteBook);
router.get('/homepage', controller.getHomepage);
router.get('/', controller.getBooks);
router.get('/category/:slug', controller.getCategoryBooks);
router.post('/recalculate-trending', auth('admin'), controller.recalculateTrending);
router.get('/slug/:slug', controller.getBookBySlug);
router.get('/:id', controller.getBookById);

module.exports = router;
