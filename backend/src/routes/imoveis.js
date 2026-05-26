const express = require('express');
const router  = express.Router();

const {
    criarImovel,
    getImoveis,
    getImoveisAdmin,
    getImovel,
    atualizarImovel,
    deletarImovel,
    setDestaque,
    toggleVisibilidade,
} = require('../controllers/imovelController');

const { protect, authorize } = require('../middleware/auth');

// ─── Rotas públicas ───────────────────────────────────────────────────────────
router.get('/',            getImoveis);      // filtra isVisible: true sempre

// ─── Rotas protegidas ─────────────────────────────────────────────────────────
router.get('/admin/todos', protect, getImoveisAdmin); // DEVE vir antes de /:id
router.get('/:id',         getImovel);

router.post('/',    protect,                    criarImovel);
router.put('/:id',  protect,                    atualizarImovel);
router.delete('/:id', protect, authorize('admin'), deletarImovel);
router.patch('/:id/destaque',     protect, authorize('admin'), setDestaque);
router.patch('/:id/visibilidade', protect,                     toggleVisibilidade);

module.exports = router;