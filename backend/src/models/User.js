const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Por favor, adicione um nome']
    },
    email: {
        type: String,
        required: [true, 'Por favor, adicione um email'],
        unique: true,
        match: [/^\S+@\S+\.\S+$/, 'Por favor, adicione um email válido']
    },
    phone: { // 👈 NOVO CAMPO para bater com sua tela
        type: String,
        required: [true, 'Por favor, adicione um celular']
    },
    password: {
        type: String,
        required: [true, 'Por favor, adicione uma senha'],
        minlength: 6,
        select: false 
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
});

// Criptografia automática de senha
UserSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }
    try{const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
} catch (error) {
    throw error;
    console.error("Erro ao criptografar a senha:", error);
}
});

UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema, 'users');