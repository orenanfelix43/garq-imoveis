const express = require('express');
const router  = express.Router();

const {
    criarImovel,
    getImoveis,
    getImovel,
    atualizarImovel,
    deletarImovel,
    setDestaque,
    toggleVisibilidade,
} = require('../controllers/imovelController');

const { protect, authorize } = require('../middleware/auth');

// ─── Rotas públicas ───────────────────────────────────────────────────────────
router.get('/',    getImoveis);
router.get('/:id', getImovel);

// ─── Rotas protegidas ─────────────────────────────────────────────────────────
router.post('/',    protect,                    criarImovel);
router.put('/:id',  protect,                    atualizarImovel);
router.delete('/:id', protect, authorize('admin'), deletarImovel);
router.patch('/:id/destaque',     protect, authorize('admin'), setDestaque);
router.patch('/:id/visibilidade', protect,                     toggleVisibilidade);

module.exports = router;