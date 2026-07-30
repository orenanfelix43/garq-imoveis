const express   = require('express');
const router    = express.Router();
const rateLimit = require('express-rate-limit');

const {
    register,
    login,
    logout,
    getSession,
    forgotPassword,
    resetPassword,
} = require('../controllers/authController');

const { protect, authorize, csrfProtection } = require('../middleware/auth');

// ─── Rate limiters ────────────────────────────────────────────────────────────

// Login: 10 tentativas por 15 min por IP
const loginLimiter = rateLimit({
    windowMs:        15 * 60 * 1000,
    max:             10,
    message:         { success: false, error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders:   false,
});

// Recuperação de senha: 3 por hora por IP
const forgotLimiter = rateLimit({
    windowMs:        60 * 60 * 1000,
    max:             3,
    message:         { success: false, error: 'Muitas solicitações de recuperação. Tente novamente em 1 hora.' },
    standardHeaders: true,
    legacyHeaders:   false,
});

// Reset de senha: 5 por hora por IP
const resetLimiter = rateLimit({
    windowMs:        60 * 60 * 1000,
    max:             5,
    message:         { success: false, error: 'Muitas tentativas de redefinição. Tente novamente em 1 hora.' },
    standardHeaders: true,
    legacyHeaders:   false,
});

// ─── Rotas ────────────────────────────────────────────────────────────────────

// Registro: admin autenticado pode criar qualquer role
// Auto-cadastro público: só permite role 'cliente'
router.post('/register', (req, res, next) => {
    const role = req.body?.role;
    if (role === 'cliente') return next(); // auto-cadastro público
    return protect(req, res, () => csrfProtection(req, res, () => authorize('admin')(req, res, next)));
}, register);

router.post('/login',           loginLimiter, login);
router.get('/session',          protect, getSession);
router.post('/logout',          protect, csrfProtection, logout);
router.post('/forgot-password', forgotLimiter, forgotPassword);
router.post('/reset-password',  resetLimiter,  resetPassword);

module.exports = router;
