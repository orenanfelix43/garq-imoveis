const express = require('express');
const router  = express.Router();

const { listarUsuarios, removerUsuario } = require('../controllers/usuarioController');
const { protect, authorize }             = require('../middleware/auth');

// Todas as rotas exigem admin autenticado
router.use(protect, authorize('admin'));

router.get('/',          listarUsuarios);
router.delete('/:id',    removerUsuario);

module.exports = router;