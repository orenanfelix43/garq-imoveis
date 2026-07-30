const express = require('express');
const router  = express.Router({ mergeParams: true });

const {
    listarDocumentos,
    uploadDocumento,
    deletarDocumento,
    baixarDocumento,
} = require('../controllers/documentoController');

const { protect, authorize, csrfProtection } = require('../middleware/auth');
const { requirePropertyAccess } = require('../services/authorization');

router.use(protect, requirePropertyAccess);

router.get('/',          listarDocumentos);
router.get('/:docId/download', baixarDocumento);
router.post('/',         csrfProtection, authorize('admin'), uploadDocumento);
router.delete('/:docId', csrfProtection, authorize('admin'), deletarDocumento);

module.exports = router;
