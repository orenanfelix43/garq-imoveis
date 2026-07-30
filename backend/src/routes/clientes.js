const express = require('express');
const router  = express.Router();

const {
    listarClientes,
    getCliente,
    criarCliente,
    atualizarCliente,
    deletarCliente,
    adicionarVinculo,
    removerVinculo,
    getMinhaArea,
    adicionarComentario,
    removerComentario,
    vincularUsuario,
} = require('../controllers/clienteController');

const { protect, authorize, csrfProtection } = require('../middleware/auth');

// Todas protegidas
router.use(protect);

// Área do cliente — acesso pelo próprio cliente
router.get('/minha-area', authorize('cliente'), getMinhaArea);

// Admin — gestão de clientes
router.get('/',    authorize('admin'), listarClientes);
router.get('/:id', authorize('admin'), getCliente);
router.post('/',   csrfProtection, authorize('admin'), criarCliente);
router.put('/:id', csrfProtection, authorize('admin'), atualizarCliente);
router.delete('/:id', csrfProtection, authorize('admin'), deletarCliente);
router.patch('/:id/usuario', csrfProtection, authorize('admin'), vincularUsuario);

// Vínculos com imóveis — só admin
router.post('/:id/vinculos',              csrfProtection, authorize('admin'), adicionarVinculo);
router.delete('/:id/vinculos/:vinculoId', csrfProtection, authorize('admin'), removerVinculo);

// Comentários — cliente e admin
router.post('/:id/vinculos/:vinculoId/comentarios', csrfProtection, adicionarComentario);
router.delete('/:id/vinculos/:vinculoId/comentarios/:comentarioId', csrfProtection, removerComentario);

module.exports = router;
