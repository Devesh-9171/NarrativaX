const express = require('express');
const { signup, login, getProfile, verifyEmailOtp, resendEmailOtp } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/verify-email', verifyEmailOtp);
router.post('/resend-otp', resendEmailOtp);
router.get('/profile', authMiddleware, getProfile);

module.exports = router;
