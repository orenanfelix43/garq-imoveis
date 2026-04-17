const express = require('express');
const router = express.Router();
const { criarImovel, getImoveis, atualizarImovel, deletarImovel } = require('../controllers/imovelController');
const { protect } = require('../middleware/auth'); // Importe novamente

router.get('/', getImoveis);
router.put('/:id', protect, atualizarImovel);
router.delete('/:id', protect, deletarImovel);


// Reative o 'protect' aqui
router.post('/', protect, (req, res, next) => {
    if (req.user) {
        req.body.user = req.user.id;
        next();
    } else {
        res.status(401).json({ success: false, error: "Usuário não autenticado no banco correto" });
    }
}, criarImovel);


module.exports = router;