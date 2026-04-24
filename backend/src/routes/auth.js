const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const { register, login, forgotPassword, resetPassword } = require('../controllers/authController');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                  // Até 10 tentativas por IP
    message: "Muitas tentativas de login, por favor tente novamente mais tarde."
});

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/forgot-password',loginLimiter, forgotPassword);
router.post('/reset-password', loginLimiter, resetPassword);

module.exports = router;