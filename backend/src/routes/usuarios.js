const express = require('express');
const router  = express.Router();

const { listarUsuarios, removerUsuario, alterarRole, atualizarUsuario } = require('../controllers/usuarioController');
const { protect, authorize }                          = require('../middleware/auth');

// Todas as rotas exigem admin autenticado
router.use(protect, authorize('admin'));

router.get('/',              listarUsuarios);
router.patch('/:id/role',    alterarRole);
router.patch('/:id',         atualizarUsuario);
router.delete('/:id',        removerUsuario);

module.exports = router;