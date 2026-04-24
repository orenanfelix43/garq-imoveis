const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, error: "Token não fornecido" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = await User.findById(decoded.id);

        if (!req.user) {
            return res.status(401).json({ success: false, error: "Usuário não encontrado" });
        }

        const isDev = process.env.NODE_ENV !== 'production';
        if (isDev) console.log(`[AUTH] User: ${req.user.name} (${req.user._id})`);

        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: "Token inválido" });
    }
};

module.exports = { protect };