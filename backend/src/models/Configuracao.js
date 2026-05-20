const mongoose = require('mongoose');

// Cada "lista" tem um nome único e um array de itens ordenáveis
const ItemSchema = new mongoose.Schema({
    valor: {
        type:     String,
        required: true,
        trim:     true,
        maxlength: 100,
    },
    label: {
        type:     String,
        required: true,
        trim:     true,
        maxlength: 100,
    },
    ordem: { type: Number, default: 0 },
    ativo: { type: Boolean, default: true },
}, { _id: true });

const ConfiguracaoSchema = new mongoose.Schema(
    {
        chave: {
            type:     String,
            required: true,
            unique:   true,
            trim:     true,
            // Ex: 'tipos_imovel', 'status_imovel', 'finalidades'
        },
        titulo: {
            type:     String,
            required: true,
            trim:     true,
            // Ex: 'Tipos de Imóvel', 'Status', 'Finalidades'
        },
        descricao: { type: String, default: '' },
        itens: [ItemSchema],
    },
    { timestamps: true }
);

module.exports = mongoose.model('Configuracao', ConfiguracaoSchema);