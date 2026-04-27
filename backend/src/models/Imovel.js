const mongoose = require('mongoose');

// ─── Sub-schema: item da galeria ──────────────────────────────────────────────
const GaleriaItemSchema = new mongoose.Schema({
    url: {
        type:     String,
        required: true,
        match: [/^https?:\/\/.+/, 'URL da imagem inválida. Deve começar com http(s)://'],
    },
    isPadrao: { type: Boolean, default: false },
}, { _id: false });

// ─── Sub-schema: atributo dinâmico ────────────────────────────────────────────
const AtributoSchema = new mongoose.Schema({
    label: { type: String, required: true, trim: true, maxlength: 80 },
    value: { type: String, required: true, trim: true, maxlength: 200 },
}, { _id: false });

// ─── Schema principal ─────────────────────────────────────────────────────────
const ImovelSchema = new mongoose.Schema(
    {
        titulo: {
            type:      String,
            required:  [true, 'O título é obrigatório'],
            trim:      true,
            maxlength: [200, 'Título não pode exceder 200 caracteres'],
        },
        subtitulo: {
            type:     String,
            required: [true, 'O subtítulo/localização é obrigatório'],
            trim:     true,
        },
        tipo: {
            type:     String,
            required: true,
            enum:     ['casa', 'terreno', 'apartamento'],
            index:    true,
        },
        isDestaque: {
            type:    Boolean,
            default: false,
            index:   true,
        },
        galeria:       [GaleriaItemSchema],
        atributos:     [AtributoSchema],
        descricaoLonga: {
            type:     String,
            required: [true, 'A descrição longa é necessária'],
        },
        user: {
            type:     mongoose.Schema.ObjectId,
            ref:      'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// ─── Índice de texto para busca futura ────────────────────────────────────────
ImovelSchema.index({ titulo: 'text', subtitulo: 'text' });

module.exports = mongoose.model('Imovel', ImovelSchema);