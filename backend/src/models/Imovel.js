const mongoose = require('mongoose');

const ImovelSchema = new mongoose.Schema({
    titulo: {
        type: String,
        required: [true, 'O título é obrigatório'],
        trim: true
    },
    subtitulo: {
        type: String, // Localização/Residência de Elite
        required: [true, 'O subtítulo/localização é obrigatório']
    },
    tipo: {
        type: String,
        required: true,
        enum: ['casa', 'terreno', 'apartamento'] // Conforme sua tela
    },
    isDestaque: {
        type: Boolean,
        default: false // Checkbox "Definir como principal"
    },
    // Galeria de fotos com indicação de qual é a capa
    galeria: [{
        url: { type: String, required: true },
        isPadrao: { type: Boolean, default: false } 
    }],
    // Atributos dinâmicos (Área, Suítes, Vagas, etc.)
    atributos: [{
        label: { type: String, required: true }, // Ex: "Área Terreno"
        value: { type: String, required: true }  // Ex: "2.500 m²"
    }],
    descricaoLonga: {
        type: String,
        required: [true, 'A descrição longa é necessária']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Imovel', ImovelSchema);