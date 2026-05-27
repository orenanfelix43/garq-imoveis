const mongoose = require('mongoose');

const ComentarioSchema = new mongoose.Schema({
    texto: {
        type:      String,
        required:  true,
        trim:      true,
        maxlength: [1000, 'Comentário não pode exceder 1000 caracteres.'],
    },
    autor: {
        type: mongoose.Schema.ObjectId,
        ref:  'User',
        required: true,
    },
    autorNome: {
        type: String,
        trim: true,
        default: '',
    },
}, { _id: true, timestamps: true });

const VinculoSchema = new mongoose.Schema({
    imovelId: {
        type:     mongoose.Schema.ObjectId,
        ref:      'Imovel',
        required: true,
    },
    tipo: {
        type:    String,
        enum:    ['interessado', 'proprietario'],
        default: 'interessado',
    },
    observacao: {
        type:    String,
        trim:    true,
        default: '',
        maxlength: 300,
    },
    comentarios: [ComentarioSchema],
}, { _id: true, timestamps: true });

const ClienteSchema = new mongoose.Schema(
    {
        nome: {
            type:      String,
            required:  [true, 'O nome do cliente é obrigatório.'],
            trim:      true,
            maxlength: [150, 'Nome não pode exceder 150 caracteres.'],
        },
        telefone: {
            type:      String,
            required:  [true, 'O telefone é obrigatório.'],
            trim:      true,
            maxlength: [30, 'Telefone não pode exceder 30 caracteres.'],
        },
        email: {
            type:    String,
            trim:    true,
            lowercase: true,
            default: '',
            maxlength: [200, 'E-mail não pode exceder 200 caracteres.'],
        },
        notas: {
            type:    String,
            trim:    true,
            default: '',
            maxlength: [2000, 'Notas não podem exceder 2000 caracteres.'],
        },
        userId: {
            type:    mongoose.Schema.ObjectId,
            ref:     'User',
            default: null, // vinculado quando o usuário se cadastrar com o mesmo e-mail
        },
        imoveis: [VinculoSchema],
        criadoPor: {
            type: mongoose.Schema.ObjectId,
            ref:  'User',
            required: true,
        },
    },
    { timestamps: true }
);

ClienteSchema.index({ nome: 'text', email: 'text' });
ClienteSchema.index({ userId: 1 });

module.exports = mongoose.model('Cliente', ClienteSchema);