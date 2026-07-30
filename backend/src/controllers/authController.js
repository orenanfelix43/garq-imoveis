const crypto = require('crypto');
const { Resend } = require('resend');
const User = require('../models/User');
const Cliente = require('../models/Cliente');
const Session = require('../models/Session');
const { createSession, setSessionCookies, clearSessionCookies } = require('../services/sessionService');
const logger = require('../utils/logger');

const resend = new Resend(process.env.RESEND_API_KEY || 're_test_placeholder');

async function startSession(res, user) {
    const session = await createSession(user._id);
    setSessionCookies(res, session);
}

exports.register = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        if (![name, email, phone, password].every(value => typeof value === 'string' && value.trim())) {
            return res.status(400).json({ success: false, error: 'Todos os campos são obrigatórios.' });
        }
        if (password.length < 8) return res.status(400).json({ success: false, error: 'A senha deve ter no mínimo 8 caracteres.' });

        const normalizedEmail = email.toLowerCase().trim();
        if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ success: false, error: 'Email já cadastrado.' });

        const isAdminCreating = req.user?.role === 'admin';
        const requestedRole = req.body.role;
        const role = isAdminCreating && ['user', 'admin', 'cliente'].includes(requestedRole) ? requestedRole : 'cliente';
        const user = await User.create({ name: name.trim(), email: normalizedEmail, phone: phone.trim(), password, role });

        const existingClient = await Cliente.exists({ email: normalizedEmail });
        if (!existingClient && role === 'cliente') {
            await Cliente.create({ nome: user.name, telefone: user.phone, email: normalizedEmail, userId: user._id, criadoPor: user._id, imoveis: [] });
        }

        if (!req.user) await startSession(res, user);
        return res.status(201).json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        logger.error('auth.register.failed', { requestId: req.id, errorName: error.name });
        return res.status(500).json({ success: false, error: 'Erro ao registrar usuário.' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ success: false, error: 'Email e senha são obrigatórios.' });
        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
        if (!user || !await user.matchPassword(password)) return res.status(401).json({ success: false, error: 'Credenciais inválidas.' });
        await startSession(res, user);
        return res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        logger.error('auth.login.failed', { requestId: req.id, errorName: error.name });
        return res.status(500).json({ success: false, error: 'Erro no servidor.' });
    }
};

exports.getSession = (req, res) => res.json({ success: true, user: req.user });

exports.logout = async (req, res, next) => {
    try {
        await Session.updateOne({ _id: req.sessionRecord._id }, { revokedAt: new Date() });
        clearSessionCookies(res);
        return res.json({ success: true, message: 'Logout realizado com sucesso.' });
    } catch (error) { next(error); }
};

exports.forgotPassword = async (req, res) => {
    const generic = 'Se este e-mail estiver cadastrado, você receberá um link em breve.';
    try {
        if (typeof req.body.email !== 'string') return res.status(400).json({ success: false, message: 'E-mail é obrigatório.' });
        const user = await User.findOne({ email: req.body.email.toLowerCase().trim() });
        if (!user) return res.json({ success: true, message: generic });

        const rawToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        user.resetPasswordExpires = Date.now() + 3_600_000;
        await user.save({ validateBeforeSave: false });
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
        const resetUrl = `${baseUrl}/redefinir-senha.html?token=${encodeURIComponent(rawToken)}`;
        try {
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'GARQ Imóveis <noreply@example.invalid>',
                to: user.email,
                subject: 'Recuperação de Senha | GARQ Suporte',
                html: `<p>Foi solicitada uma redefinição de senha.</p><p><a href="${resetUrl}">Redefinir senha</a></p><p>O link expira em 1 hora.</p>`,
            });
        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save({ validateBeforeSave: false });
            logger.error('auth.password_reset.email_failed', { requestId: req.id, errorName: error.name });
            return res.status(503).json({ success: false, message: 'Não foi possível enviar o e-mail. Tente novamente mais tarde.' });
        }
        return res.json({ success: true, message: generic });
    } catch (error) {
        logger.error('auth.password_reset.request_failed', { requestId: req.id, errorName: error.name });
        return res.status(500).json({ success: false, message: 'Erro ao processar solicitação.' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (typeof token !== 'string' || typeof password !== 'string' || password.length < 8) return res.status(400).json({ success: false, message: 'Token válido e senha com ao menos 8 caracteres são obrigatórios.' });
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({ resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: Date.now() } });
        if (!user) return res.status(400).json({ success: false, message: 'Link inválido ou expirado.' });
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        await Session.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
        return res.json({ success: true, message: 'Senha atualizada com sucesso!' });
    } catch (error) {
        logger.error('auth.password_reset.failed', { requestId: req.id, errorName: error.name });
        return res.status(500).json({ success: false, message: 'Erro interno ao resetar senha.' });
    }
};
