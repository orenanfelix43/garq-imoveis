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

const { protect, authorize, csrfProtection } = require('../middleware/auth');

// ─── Pública — usada nos formulários de cadastro ──────────────────────────────
router.get('/chave/:chave', getConfiguracaoPorChave);

// ─── Protegidas — gerenciamento das listas ────────────────────────────────────
router.use(protect);

router.get('/',    listarConfiguracoes);
router.post('/',   csrfProtection, authorize('admin'), criarConfiguracao);
router.delete('/:id', csrfProtection, authorize('admin'), deletarConfiguracao);

router.post('/:id/itens',              csrfProtection, authorize('admin'), adicionarItem);
router.patch('/:id/itens/:itemId',     csrfProtection, authorize('admin'), atualizarItem);
router.delete('/:id/itens/:itemId',    csrfProtection, authorize('admin'), removerItem);

module.exports = router;
