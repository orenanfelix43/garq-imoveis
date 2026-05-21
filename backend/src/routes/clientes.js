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
} = require('../controllers/clienteController');

const { protect } = require('../middleware/auth');

// Todas protegidas
router.use(protect);

router.get('/',    listarClientes);
router.get('/:id', getCliente);
router.post('/',   criarCliente);
router.put('/:id', atualizarCliente);
router.delete('/:id', deletarCliente);

// Vínculos com imóveis
router.post('/:id/vinculos',                adicionarVinculo);
router.delete('/:id/vinculos/:vinculoId',   removerVinculo);

module.exports = router;