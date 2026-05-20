const express = require('express');
const router  = express.Router();

const {
    listarConfiguracoes,
    getConfiguracaoPorChave,
    criarConfiguracao,
    deletarConfiguracao,
    adicionarItem,
    atualizarItem,
    removerItem,
} = require('../controllers/configuracaoController');

const { protect, authorize } = require('../middleware/auth');

// ─── Pública — usada nos formulários de cadastro ──────────────────────────────
router.get('/chave/:chave', getConfiguracaoPorChave);

// ─── Protegidas — gerenciamento das listas ────────────────────────────────────
router.use(protect);

router.get('/',    listarConfiguracoes);
router.post('/',   authorize('admin'), criarConfiguracao);
router.delete('/:id', authorize('admin'), deletarConfiguracao);

router.post('/:id/itens',              authorize('admin'), adicionarItem);
router.patch('/:id/itens/:itemId',     authorize('admin'), atualizarItem);
router.delete('/:id/itens/:itemId',    authorize('admin'), removerItem);

module.exports = router;