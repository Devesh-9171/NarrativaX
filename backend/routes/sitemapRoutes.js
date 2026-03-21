const express = require('express');
const controller = require('../controllers/sitemapController');

const router = express.Router();

router.get('/', controller.getSitemapPayload);

module.exports = router;
