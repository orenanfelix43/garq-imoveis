const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ─── Helper interno: extrai token do cookie ou header Authorization ───────────
function extractToken(req) {
    if (req.cookies?.token) return req.cookies.token;

    const authHeader = req.headers.authorization;
    if (authHeader && /^Bearer\s+\S+/.test(authHeader)) {
        return authHeader.split(/\s+/)[1];
    }

    return null;
}

// =============================================================================
// protect — leve, sem query ao banco
// Confia nos dados do payload JWT (id + role já estão assinados).
// Usar em todas as rotas comuns: CRUD de imóveis, documentos, configurações.
// =============================================================================
const protect = (req, res, next) => {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({ success: false, error: 'Token não fornecido.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            id:   decoded.id,
            role: decoded.role,
            name: decoded.name || '',
        };

        if (process.env.NODE_ENV !== 'production') {
            console.log(`[AUTH] id=${decoded.id} role=${decoded.role} → ${req.method} ${req.originalUrl}`);
        }

        next();
    } catch (err) {
        const message = err.name === 'TokenExpiredError'
            ? 'Token expirado. Faça login novamente.'
            : 'Token inválido.';
        return res.status(401).json({ success: false, error: message });
    }
};

// =============================================================================
// protectStrict — com query ao banco
// Verifica se o usuário ainda existe e não foi desativado/deletado.
// Usar apenas em operações críticas e irreversíveis:
//   - troca de senha, exclusão de conta, elevação de role.
// Custo: +1 query MongoDB por request — usar com critério.
// =============================================================================
const protectStrict = async (req, res, next) => {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({ success: false, error: 'Token não fornecido.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select('role').lean();
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não encontrado. Faça login novamente.',
            });
        }

        req.user = {
            id:   decoded.id,
            role: user.role,
        };

        next();
    } catch (err) {
        const message = err.name === 'TokenExpiredError'
            ? 'Token expirado. Faça login novamente.'
            : 'Token inválido.';
        return res.status(401).json({ success: false, error: message });
    }
};

// =============================================================================
// authorize — RBAC baseado em role
// Deve vir sempre após protect ou protectStrict na cadeia de middlewares.
// =============================================================================
const authorize = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error: `Acesso negado. Requer role: ${roles.join(', ')}.`,
        });
    }
    next();
};

module.exports = { protect, protectStrict, authorize };