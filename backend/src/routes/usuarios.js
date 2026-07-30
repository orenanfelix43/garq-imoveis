const express = require('express');
const router  = express.Router();

const { listarUsuarios, removerUsuario, alterarRole, atualizarUsuario } = require('../controllers/usuarioController');
const { protect, authorize, csrfProtection }          = require('../middleware/auth');

// Todas as rotas exigem admin autenticado
router.use(protect, authorize('admin'));

router.get('/',              listarUsuarios);
router.patch('/:id/role',    csrfProtection, alterarRole);
router.patch('/:id',         csrfProtection, atualizarUsuario);
router.delete('/:id',        csrfProtection, removerUsuario);

module.exports = router;
