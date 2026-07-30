const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    tokenHash: { type: String, required: true, unique: true, index: true, select: false },
    csrfHash: { type: String, required: true, select: false },
    userId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Session', SessionSchema);
