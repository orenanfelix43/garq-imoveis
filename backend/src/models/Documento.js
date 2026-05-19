const mongoose = require('mongoose');

const DocumentoSchema = new mongoose.Schema(
    {
        imovelId: {
            type: mongoose.Schema.ObjectId,
            ref: 'Imovel',
            required: true,
            index: true,
        },
        nome: {
            type: String,
            required: [true, 'O nome do documento é obrigatório.'],
            trim: true,
            maxlength: [255, 'Nome não pode exceder 255 caracteres.'],
        },
        tipo: {
            type: String,
            required: true,
            trim: true,
            maxlength: [100, 'Tipo não pode exceder 100 caracteres.'],
        },
        tamanho: {
            type: Number,
            required: true,
        },
        url: {
            type: String,
            required: true,
        },
        public_id: {
            type: String,
            required: true,
        },
        uploadadoPor: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Documento', DocumentoSchema);