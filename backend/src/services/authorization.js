const Cliente = require('../models/Cliente');
const Imovel = require('../models/Imovel');
const Documento = require('../models/Documento');
const mongoose = require('mongoose');

const validId = id => mongoose.Types.ObjectId.isValid(id);

async function canAccessProperty(user, imovelId) {
    if (!user || !validId(imovelId)) return false;
    if (user.role === 'admin') return Boolean(await Imovel.exists({ _id: imovelId }));
    if (user.role !== 'cliente') return false;
    return Boolean(await Cliente.exists({ userId: user.id, 'imoveis.imovelId': imovelId }));
}

async function getAccessibleDocument(user, imovelId, documentId) {
    if (!validId(imovelId) || !validId(documentId)) return null;
    if (!await canAccessProperty(user, imovelId)) return null;
    return Documento.findOne({ _id: documentId, imovelId });
}

const requirePropertyAccess = async (req, res, next) => {
    try {
        if (!await canAccessProperty(req.user, req.params.imovelId)) {
            return res.status(404).json({ success: false, error: 'Recurso não encontrado.' });
        }
        next();
    } catch (error) { next(error); }
};

module.exports = { canAccessProperty, getAccessibleDocument, requirePropertyAccess };
