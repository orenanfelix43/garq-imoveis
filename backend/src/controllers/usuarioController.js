const User = require('../models/User');

// ─── Listar usuários (sem retornar senha) ─────────────────────────────────────
exports.listarUsuarios = async (req, res, next) => {
    try {
        const usuarios = await User.find()
            .select('name email phone role createdAt')
            .sort({ createdAt: -1 })
            .lean();

        return res.json({ success: true, data: usuarios });
    } catch (err) {
        next(err);
    }
};

// ─── Remover usuário ──────────────────────────────────────────────────────────
exports.removerUsuario = async (req, res, next) => {
    try {
        // Admin não pode remover a si mesmo
        if (req.params.id === req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'Você não pode remover sua própria conta.',
            });
        }

        const usuario = await User.findByIdAndDelete(req.params.id);
        if (!usuario) {
            return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
        }

        return res.json({ success: true, message: 'Usuário removido com sucesso.' });
    } catch (err) {
        next(err);
    }
};