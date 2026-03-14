const express = require('express');
const controller = require('../controllers/chapterController');

const router = express.Router();
router.get('/:slug/:chapterSlug', controller.getChapter);
module.exports = router;
