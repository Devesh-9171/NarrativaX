const express = require('express');
const controller = require('../controllers/shortStoryController');
const { authMiddleware, requireRoles } = require('../middleware/authMiddleware');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware, requireRoles(['author', 'admin']), controller.createShortStory);
router.get('/:id', controller.getPublishedShortStory);
router.post('/complete-view', auth.optionalAuth, controller.completeShortStoryView);

module.exports = router;
