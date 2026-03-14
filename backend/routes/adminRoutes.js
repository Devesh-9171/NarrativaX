const express = require('express');
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const controller = require('../controllers/adminController');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'uploads')),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
});
const upload = multer({ storage });

const router = express.Router();
router.get('/stats', auth('admin'), controller.dashboardStats);
router.post('/books', auth('admin'), upload.single('coverImage'), controller.createBook);
router.put('/books/:bookId', auth('admin'), upload.single('coverImage'), controller.updateBook);
router.post('/books/:bookId/chapters', auth('admin'), controller.addChapter);

module.exports = router;
