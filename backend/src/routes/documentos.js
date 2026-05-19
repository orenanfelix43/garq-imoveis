const express = require('express');
const router  = express.Router({ mergeParams: true });

const {
    listarDocumentos,
    uploadDocumento,
    deletarDocumento,
} = require('../controllers/documentoController');

const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/',          listarDocumentos);
router.post('/',         uploadDocumento);
router.delete('/:docId', deletarDocumento);

module.exports = router;