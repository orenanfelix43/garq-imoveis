const express   = require('express');
const router    = express.Router();
const rateLimit = require('express-rate-limit');

const {
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
} = require('../controllers/authController');

// protectStrict reservado para rotas que precisam confirmar existência do user no banco
// (ex: troca de senha autenticada, exclusão de conta)
const { protect, protectStrict, authorize } = require('../middleware/auth');


const loginLimiter = rateLimit({
    windowMs:        15 * 60 * 1000, // 15 minutos
    max:             10,
    message:         { success: false, error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders:   false,
});

const registerLimiter = rateLimit({
    windowMs:        60 * 60 * 1000, // 1 hora
    max:             5,
    message:         { success: false, error: 'Muitos cadastros deste IP. Tente novamente em 1 hora.' },
    standardHeaders: true,
    legacyHeaders:   false,
});

const forgotLimiter = rateLimit({
    windowMs:        60 * 60 * 1000, // 1 hora
    max:             3,
    message:         { success: false, error: 'Muitas solicitações de recuperação. Tente novamente em 1 hora.' },
    standardHeaders: true,
    legacyHeaders:   false,
});

const resetLimiter = rateLimit({
    windowMs:        60 * 60 * 1000, // 1 hora
    max:             5,
    message:         { success: false, error: 'Muitas tentativas de redefinição. Tente novamente em 1 hora.' },
    standardHeaders: true,
    legacyHeaders:   false,
});

// ─── Rotas ────────────────────────────────────────────────────────────────────
router.post('/register',        registerLimiter, register);
router.post('/login',           loginLimiter,    login);
router.post('/logout',                           logout);         
router.post('/forgot-password', forgotLimiter,   forgotPassword);
router.post('/reset-password',  resetLimiter,    resetPassword);  

module.exports = router;