const Session = require('../models/Session');
const { hash } = require('../services/sessionService');
const crypto = require('crypto');

async function protect(req, res, next) {
    const token = req.cookies?.garq_session;
    if (!token) return res.status(401).json({ success: false, error: 'Sessão não fornecida.' });

    try {
        const session = await Session.findOne({
            tokenHash: hash(token),
            revokedAt: null,
            expiresAt: { $gt: new Date() },
        }).select('+tokenHash +csrfHash').populate('userId', 'name role').exec();

        if (!session?.userId) {
            return res.status(401).json({ success: false, error: 'Sessão inválida ou expirada.' });
        }
        req.sessionRecord = session;
        req.user = { id: session.userId._id.toString(), role: session.userId.role, name: session.userId.name || '' };
        Session.updateOne({ _id: session._id }, { lastUsedAt: new Date() }).catch(() => {});
        next();
    } catch (error) { next(error); }
}

const protectStrict = protect;

const authorize = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, error: 'Acesso negado.' });
    }
    next();
};

function csrfProtection(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (!req.sessionRecord) return res.status(401).json({ success: false, error: 'Sessão inválida.' });
    const submitted = req.get('x-csrf-token');
    const submittedHash = submitted ? Buffer.from(hash(submitted), 'hex') : Buffer.alloc(0);
    const expectedHash = Buffer.from(req.sessionRecord.csrfHash || '', 'hex');
    if (submittedHash.length !== expectedHash.length || !crypto.timingSafeEqual(submittedHash, expectedHash)) {
        return res.status(403).json({ success: false, error: 'Validação CSRF falhou.' });
    }
    next();
}

module.exports = { protect, protectStrict, authorize, csrfProtection };
