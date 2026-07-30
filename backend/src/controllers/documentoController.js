const Documento = require('../models/Documento');
const cloudinary = require('../config/cloudinary');
const { getAccessibleDocument } = require('../services/authorization');
const { decodeAndValidate } = require('../services/fileValidation');

const publicFields = '_id imovelId nome tipo tamanho uploadadoPor createdAt updatedAt accessMode';

exports.listarDocumentos = async (req, res, next) => {
    try {
        const documentos = await Documento.find({ imovelId: req.params.imovelId })
            .select(publicFields).sort({ createdAt: -1 }).lean();
        return res.json({ success: true, data: documentos.map(doc => ({
            ...doc,
            downloadPath: `/api/imoveis/${doc.imovelId}/documentos/${doc._id}/download`,
        })) });
    } catch (error) { next(error); }
};

exports.uploadDocumento = async (req, res, next) => {
    try {
        const { nome, tipo, dados } = req.body || {};
        const validated = decodeAndValidate({ nome, tipo, dados });
        const nomeBase = nome.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
        const result = await cloudinary.uploader.upload(validated.dataUrl, {
            folder: 'imoveis_documentos',
            resource_type: 'raw',
            type: 'authenticated',
            public_id: `${req.params.imovelId}_${Date.now()}_${nomeBase}`,
            timeout: 30000,
        });
        const doc = await Documento.create({
            imovelId: req.params.imovelId,
            nome: nome.trim(), tipo, tamanho: validated.tamanho,
            url: result.secure_url, public_id: result.public_id,
            resourceType: 'raw', deliveryType: 'authenticated', accessMode: 'authenticated',
            format: nome.split('.').pop().toLowerCase(),
            uploadadoPor: req.user.id,
        });
        return res.status(201).json({ success: true, data: {
            _id: doc._id, imovelId: doc.imovelId, nome: doc.nome, tipo: doc.tipo,
            tamanho: doc.tamanho, accessMode: doc.accessMode, createdAt: doc.createdAt,
            downloadPath: `/api/imoveis/${doc.imovelId}/documentos/${doc._id}/download`,
        } });
    } catch (error) { next(error); }
};

exports.baixarDocumento = async (req, res, next) => {
    try {
        const doc = await getAccessibleDocument(req.user, req.params.imovelId, req.params.docId);
        if (!doc) return res.status(404).json({ success: false, error: 'Recurso não encontrado.' });
        res.set('Cache-Control', 'private, no-store');
        if (doc.accessMode === 'legacy_public') return res.redirect(302, doc.url);
        const expiresAt = Math.floor(Date.now() / 1000) + 300;
        const signedUrl = cloudinary.utils.private_download_url(doc.public_id, doc.format || '', {
            resource_type: doc.resourceType || 'raw', type: doc.deliveryType || 'authenticated', expires_at: expiresAt,
        });
        return res.redirect(302, signedUrl);
    } catch (error) { next(error); }
};

exports.deletarDocumento = async (req, res, next) => {
    try {
        const doc = await getAccessibleDocument(req.user, req.params.imovelId, req.params.docId);
        if (!doc) return res.status(404).json({ success: false, error: 'Recurso não encontrado.' });
        await cloudinary.uploader.destroy(doc.public_id, {
            resource_type: doc.resourceType || (doc.tipo === 'application/pdf' ? 'image' : 'raw'),
            type: doc.deliveryType || 'upload', invalidate: true,
        });
        await doc.deleteOne();
        return res.json({ success: true, message: 'Documento removido com sucesso.' });
    } catch (error) { next(error); }
};
