const express = require('express');
const controller = require('../controllers/authController');

const router = express.Router();
router.post('/signup', controller.validate('signup'), controller.signup);
router.post('/login', controller.validate('login'), controller.login);
module.exports = router;
