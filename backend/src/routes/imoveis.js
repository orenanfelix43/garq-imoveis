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

const { protect, authorize, csrfProtection } = require('../middleware/auth');

// ─── Rotas públicas ───────────────────────────────────────────────────────────
router.get('/',            getImoveis);      // filtra isVisible: true sempre

// ─── Rotas protegidas ─────────────────────────────────────────────────────────
router.get('/admin/todos', protect, authorize('admin'), getImoveisAdmin); // DEVE vir antes de /:id
router.get('/:id',         getImovel);

router.post('/',    protect, csrfProtection, authorize('admin'), criarImovel);
router.put('/:id',  protect, csrfProtection, authorize('admin'), atualizarImovel);
router.delete('/:id', protect, csrfProtection, authorize('admin'), deletarImovel);
router.patch('/:id/destaque',     protect, csrfProtection, authorize('admin'), setDestaque);
router.patch('/:id/visibilidade', protect, csrfProtection, authorize('admin'), toggleVisibilidade);

module.exports = router;
