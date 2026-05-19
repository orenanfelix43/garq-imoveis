const Documento  = require('../models/Documento');
const Imovel     = require('../models/Imovel');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key:    process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
});

// Tipos MIME permitidos → mapeamento para resource_type do Cloudinary
const TIPOS_PERMITIDOS = new Map([
    ['application/pdf',                                                              'raw'],
    ['application/msword',                                                           'raw'],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document',      'raw'],
    ['application/vnd.ms-excel',                                                     'raw'],
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',            'raw'],
    ['text/plain',                                                                   'raw'],
]);

const TAMANHO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// ─── Listar documentos de um imóvel ──────────────────────────────────────────
exports.listarDocumentos = async (req, res, next) => {
    try {
        const { imovelId } = req.params;

        const imovel = await Imovel.findById(imovelId).lean();
        if (!imovel) {
            return res.status(404).json({ success: false, error: 'Imóvel não encontrado.' });
        }

        const documentos = await Documento.find({ imovelId })
            .select('-public_id')
            .sort({ createdAt: -1 })
            .lean();

        return res.json({ success: true, data: documentos });
    } catch (err) {
        next(err);
    }
};

// ─── Upload de documento ──────────────────────────────────────────────────────
exports.uploadDocumento = async (req, res, next) => {
    try {
        const { imovelId } = req.params;
        const { nome, tipo, tamanho, dados } = req.body;

        if (!nome || !tipo || !tamanho || !dados) {
            return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes: nome, tipo, tamanho, dados.' });
        }

        if (!TIPOS_PERMITIDOS.has(tipo)) {
            return res.status(400).json({ success: false, error: 'Tipo não permitido. Use PDF, Word, Excel ou TXT.' });
        }

        if (Number(tamanho) > TAMANHO_MAX_BYTES) {
            return res.status(400).json({ success: false, error: 'Arquivo excede o limite de 10 MB.' });
        }

        if (!dados.startsWith('data:')) {
            return res.status(400).json({ success: false, error: 'Formato de dados inválido.' });
        }

        const imovel = await Imovel.findById(imovelId).lean();
        if (!imovel) {
            return res.status(404).json({ success: false, error: 'Imóvel não encontrado.' });
        }

        // PDF → resource_type 'image' (Cloudinary suporta PDF nativamente,
        // gera URL /image/upload/ com Content-Type correto — abre no browser e no Google Docs Viewer)
        // Demais → resource_type 'raw' com flag de attachment para download correto
        const isPdf         = tipo === 'application/pdf';
        const resourceType  = isPdf ? 'image' : 'raw';
        const publicId      = `${imovelId}_${Date.now()}_${nome.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        const uploadOptions = {
            folder:        'imoveis_documentos',
            resource_type: resourceType,
            public_id:     publicId,
            timeout:       30000,
        };

        if (isPdf) {
            uploadOptions.format = 'pdf'; // garante que o Cloudinary preserve como PDF
        }

        // Upload para Cloudinary
        const result = await cloudinary.uploader.upload(dados, uploadOptions);

        const doc = await Documento.create({
            imovelId,
            nome:         nome.trim(),
            tipo,
            tamanho:      Number(tamanho),
            url:          result.secure_url,
            public_id:    result.public_id,
            uploadadoPor: req.user.id,
        });

        const resposta = {
            _id:          doc._id,
            imovelId:     doc.imovelId,
            nome:         doc.nome,
            tipo:         doc.tipo,
            tamanho:      doc.tamanho,
            url:          doc.url,
            uploadadoPor: doc.uploadadoPor,
            createdAt:    doc.createdAt,
            updatedAt:    doc.updatedAt,
        };

        return res.status(201).json({ success: true, data: resposta });
    } catch (err) {
        next(err);
    }
};

// ─── Deletar documento ────────────────────────────────────────────────────────
exports.deletarDocumento = async (req, res, next) => {
    try {
        const { imovelId, docId } = req.params;

        const doc = await Documento.findOne({ _id: docId, imovelId });
        if (!doc) {
            return res.status(404).json({ success: false, error: 'Documento não encontrado.' });
        }

        // Remover do Cloudinary com o resource_type correto
        if (doc.public_id) {
            const resourceType = doc.tipo === 'application/pdf' ? 'image' : 'raw';
            await cloudinary.uploader.destroy(doc.public_id, { resource_type: resourceType });
        }

        await doc.deleteOne();

        return res.json({ success: true, message: 'Documento removido com sucesso.' });
    } catch (err) {
        next(err);
    }
};