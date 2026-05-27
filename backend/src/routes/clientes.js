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
} = require('../controllers/clienteController');

const { protect, authorize } = require('../middleware/auth');

// Todas protegidas
router.use(protect);

// Área do cliente — acesso pelo próprio cliente
router.get('/minha-area', getMinhaArea);

// Admin — gestão de clientes
router.get('/',    authorize('admin'), listarClientes);
router.get('/:id', authorize('admin'), getCliente);
router.post('/',   authorize('admin'), criarCliente);
router.put('/:id', authorize('admin'), atualizarCliente);
router.delete('/:id', authorize('admin'), deletarCliente);

// Vínculos com imóveis — só admin
router.post('/:id/vinculos',              authorize('admin'), adicionarVinculo);
router.delete('/:id/vinculos/:vinculoId', authorize('admin'), removerVinculo);

// Comentários — cliente e admin
router.post('/:id/vinculos/:vinculoId/comentarios',                          adicionarComentario);
router.delete('/:id/vinculos/:vinculoId/comentarios/:comentarioId',          removerComentario);

module.exports = router;