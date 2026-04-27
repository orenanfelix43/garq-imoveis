const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !/^Bearer\s+\S+/.test(authHeader)) {
        return res.status(401).json({ success: false, error: 'Token não fornecido.' });
    }

    const token = authHeader.split(/\s+/)[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            id:   decoded.id,
            role: decoded.role || 'user',
        };

        if (process.env.NODE_ENV !== 'production') {
            console.log(`[AUTH] id=${decoded.id} role=${req.user.role} → ${req.method} ${req.originalUrl}`);
        }

        next();
    } catch (err) {
        const message = err.name === 'TokenExpiredError'
            ? 'Token expirado. Faça login novamente.'
            : 'Token inválido.';
        return res.status(401).json({ success: false, error: message });
    }
};

/**
 * Middleware de autorização com base em papéis (RBAC).
 * @param {...string} roles - Roles permitidos. Ex: authorize('admin')
 */
const authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error:   `Acesso negado. Requer role: ${roles.join(', ')}.`,
        });
    }
    next();
};

module.exports = { protect, authorize };