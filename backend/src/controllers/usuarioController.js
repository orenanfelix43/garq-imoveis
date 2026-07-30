const User = require('../models/User');
const Session = require('../models/Session');

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

// ─── Atualizar dados do usuário ───────────────────────────────────────────────
exports.atualizarUsuario = async (req, res, next) => {
    try {
        const { name, email, phone, role } = req.body;

        if (!name || !email || !phone) {
            return res.status(400).json({ success: false, error: 'Nome, e-mail e telefone são obrigatórios.' });
        }

        const updates = { name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() };
        if (role && ['user', 'admin', 'cliente'].includes(role)) {
            updates.role = role;
        }

        const usuario = await User.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).select('name email phone role');

        if (!usuario) {
            return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
        }

        await Session.updateMany({ userId: usuario._id, revokedAt: null }, { revokedAt: new Date() });

        return res.json({ success: true, data: usuario });
    } catch (err) {
        next(err);
    }
};

// ─── Alterar role de um usuário ───────────────────────────────────────────────
exports.alterarRole = async (req, res, next) => {
    try {
        const { role } = req.body;

        if (!['user', 'admin', 'cliente'].includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Role inválido. Use "user", "admin" ou "cliente".',
            });
        }

        // Admin não pode alterar a própria role
        if (req.params.id === req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'Você não pode alterar a sua própria role.',
            });
        }

        const usuario = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true, runValidators: true }
        ).select('name email role');

        if (!usuario) {
            return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
        }


        await Session.updateMany({ userId: usuario._id, revokedAt: null }, { revokedAt: new Date() });

        return res.json({ success: true, data: usuario });
    } catch (err) {
        next(err);
    }
};
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

        await Session.updateMany({ userId: usuario._id, revokedAt: null }, { revokedAt: new Date() });

        return res.json({ success: true, message: 'Usuário removido com sucesso.' });
    } catch (err) {
        next(err);
    }
};
