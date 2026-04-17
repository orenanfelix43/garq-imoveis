const express = require('express');
const router = express.Router();
// 1. Adicione o 'login' aqui na importação do controller
const { register, login, forgotPassword, resetPassword } = require('../controllers/authController');

// Rota de Cadastro (já existente)
router.post('/register', register);

// 2. NOVA LINHA: Rota de Login
router.post('/login', login);

// 3. NOVA LINHA: Rota de Esqueci Minha Senha
router.post('/forgot-password', forgotPassword);

router.post('/reset-password', resetPassword);

module.exports = router;