const express = require('express');
const router  = express.Router();

const {
    criarImovel,
    getImoveis,
    getImovel,
    atualizarImovel,
    deletarImovel,
} = require('../controllers/imovelController');

const { protect, authorize } = require('../middleware/auth');

// ─── Rotas públicas ───────────────────────────────────────────────────────────
router.get('/',    getImoveis);   
router.get('/:id', getImovel);    

router.post('/',    protect,criarImovel);
router.put('/:id',  protect,atualizarImovel);

router.delete('/:id', protect, authorize('admin'), deletarImovel);

module.exports = router;