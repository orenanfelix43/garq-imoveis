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
        
        // DEBUG: Veja no terminal do VS Code o que está acontecendo
        console.log("---------------- DEBUG AUTH ----------------");
        console.log("ID que veio no Token:", decoded.id);

        // Tenta buscar o usuário
        req.user = await User.findById(decoded.id);
        
        if (!req.user) {
            console.log("RESULTADO: ID decodificado, mas não achou no banco AdminGarq");
            return res.status(401).json({ success: false, error: "Usuário não encontrado" });
        }

        console.log("RESULTADO: Usuário encontrado!", req.user.name);
        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: "Token inválido" });
    }
};

module.exports = { protect };