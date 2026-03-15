const express = require('express');
const controller = require('../controllers/bookController');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware, requireAdmin, controller.createBook);
router.get('/homepage', controller.getHomepage);
router.get('/:id', controller.getBookById);

module.exports = router;
