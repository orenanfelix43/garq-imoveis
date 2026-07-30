const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type:     String,
        required: [true, 'Por favor, adicione um nome'],
        trim:     true,
        maxlength: [100, 'Nome não pode exceder 100 caracteres'],
    },
    email: {
        type:     String,
        required: [true, 'Por favor, adicione um email'],
        unique:   true,
        lowercase: true,
        trim:     true,
        match:    [/^\S+@\S+\.\S+$/, 'Por favor, adicione um email válido'],
    },
    phone: {
        type:     String,
        required: [true, 'Por favor, adicione um celular'],
        trim:     true,
    },
    password: {
        type:      String,
        required:  [true, 'Por favor, adicione uma senha'],
        minlength: 8,
        select:    false,
    },
    role: {
        type:    String,
        enum:    ['user', 'admin', 'cliente'],
        default: 'user',
    },
    createdAt: {
        type:    Date,
        default: Date.now,
    },

    // ─── Campos de recuperação de senha ───────────────────────────────────────
    resetPasswordToken: {
        type:   String,
        index:  { sparse: true },
    },
    resetPasswordExpires: {
        type: Date,
    },
});

// ─── Pre-save: hash de senha ──────────────────────────────────────────────────
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

// ─── Método de instância: comparação de senha ─────────────────────────────────
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema, 'users');
