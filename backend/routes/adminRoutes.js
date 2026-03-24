const express = require('express');
const auth = require('../middleware/auth');
const controller = require('../controllers/adminController');
const { uploadSingleImage } = require('../middleware/uploadMiddleware');

const router = express.Router();
router.get('/stats', auth('admin'), controller.dashboardStats);
router.get('/blogs', auth('admin'), controller.getBlogs);
router.get('/author-requests', auth('admin'), controller.getAuthorRequests);
router.post('/author-requests/:userId/review', auth('admin'), controller.reviewAuthorRequest);
router.get('/content/review-queue', auth('admin'), controller.getReviewQueue);
router.get('/translations', auth('admin'), controller.getTranslationStats);
router.post('/content/:bookId/review', auth('admin'), controller.reviewContent);
router.post('/books/:bookId/mark-finished', auth('admin'), controller.markBookFinished);
router.post('/books', auth('admin'), uploadSingleImage('coverImage'), controller.createBook);
router.put('/books/:bookId', auth('admin'), uploadSingleImage('coverImage'), controller.updateBook);
router.post('/books/:bookId/chapters', auth('admin'), uploadSingleImage('image'), controller.addChapter);
router.post('/blogs', auth('admin'), uploadSingleImage('coverImage'), controller.createBlog);
router.put('/blogs/:blogId', auth('admin'), uploadSingleImage('coverImage'), controller.updateBlog);
router.delete('/blogs/:blogId', auth('admin'), controller.deleteBlog);

module.exports = router;
