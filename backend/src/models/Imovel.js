const mongoose = require('mongoose');

// Sub-schema: item da galeria com suporte a remoção
const GaleriaItemSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
        match: [/^(http|https|data):/, 'URL da imagem inválida.'],
    },
    public_id: { 
        type: String 
    }, // Armazena a referência para exclusão no Cloudinary
    isPadrao: { type: Boolean, default: false },
}, { _id: false });

const AtributoSchema = new mongoose.Schema({
    label: { type: String, required: true, trim: true, maxlength: 80 },
    value: { type: String, required: true, trim: true, maxlength: 200 },
}, { _id: false });

const ImovelSchema = new mongoose.Schema(
    {
        titulo: {
            type: String,
            required: [true, 'O título é obrigatório'],
            trim: true,
            maxlength: [200, 'Título não pode exceder 200 caracteres'],
        },
        subtitulo: {
            type: String,
            required: [true, 'O subtítulo/localização é obrigatório'],
            trim: true,
        },
        tipo: {
            type:     String,
            required: true,
            trim:     true,
            index:    true,
        },
        status: {
            type:    String,
            trim:    true,
            default: '',
        },
        finalidade: {
            type:    String,
            trim:    true,
            default: '',
        },
        isDestaque: {
            type: Boolean,
            default: false,
            index: true,
        },
        galeria: [GaleriaItemSchema],
        atributos: [AtributoSchema],
        descricaoLonga: {
            type: String,
            required: [true, 'A descrição longa é necessária'],
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

ImovelSchema.index({ titulo: 'text', subtitulo: 'text' });

module.exports = mongoose.model('Imovel', ImovelSchema);