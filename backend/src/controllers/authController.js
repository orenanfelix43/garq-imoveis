const User     = require('../models/User');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const nodemailer = require('nodemailer');

// Transporter criado uma vez — conexão SMTP reutilizada entre chamadas
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    pool:             true,  // reutiliza conexões — mais rápido
    maxConnections:   1,
    rateDelta:        1000,
    rateLimit:        5,
    connectionTimeout: 10_000, // 10s para conectar
    greetingTimeout:   10_000,
    socketTimeout:     15_000, // 15s para enviar
});

const signToken = (userId, role) =>
    jwt.sign(
        { id: userId, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

// ─── Opções do cookie de sessão ───────────────────────────────────────────────
const cookieOptions = () => ({
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000,
    path:     '/',
});

const cookieClearOptions = () => ({
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
    expires:  new Date(0),
    path:     '/',
});

// =============================================================================
// REGISTRO
// =============================================================================
exports.register = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                error: 'Todos os campos são obrigatórios.',
            });
        }
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'A senha deve ter no mínimo 6 caracteres.',
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const userExists = await User.exists({ email: normalizedEmail });
        if (userExists) {
            return res.status(409).json({ success: false, error: 'Email já cadastrado.' });
        }

        // role só aceita 'user' ou 'admin' — qualquer outro valor cai para 'user'
        const rolePermitido = ['user', 'admin'].includes(req.body.role) ? req.body.role : 'user';

        const user = await User.create({
            name:  name.trim(),
            email: normalizedEmail,
            phone,
            password,
            role:  rolePermitido,
        });

        const token = signToken(user._id, user.role);
        res.cookie('token', token, cookieOptions());

        return res.status(201).json({
            success: true,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
        });

    } catch (error) {
        console.error('Register Error:', error);
        return res.status(500).json({ success: false, error: 'Erro ao registrar usuário.' });
    }
};

// =============================================================================
// LOGIN
// =============================================================================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email e senha são obrigatórios.',
            });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

        if (!user) {
            return res.status(401).json({ success: false, error: 'Credenciais inválidas.' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Credenciais inválidas.' });
        }

        const token = signToken(user._id, user.role);
        res.cookie('token', token, cookieOptions());

        return res.status(200).json({
            success: true,
            token,   // retornado para mobile — cookie pode ser bloqueado por ITP
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
        });

    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ success: false, error: 'Erro no servidor.' });
    }
};

// =============================================================================
// LOGOUT
// =============================================================================
exports.logout = (_req, res) => {
    res.cookie('token', '', cookieClearOptions());
    return res.status(200).json({ success: true, message: 'Logout realizado com sucesso.' });
};

// =============================================================================
// ESQUECI A SENHA
// =============================================================================
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'E-mail é obrigatório.' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'Se este e-mail estiver cadastrado, você receberá um link em breve.',
            });
        }

        const rawToken    = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        user.resetPasswordToken   = hashedToken;
        user.resetPasswordExpires = Date.now() + 3_600_000;
        await user.save({ validateBeforeSave: false });

        const baseUrl  = process.env.FRONTEND_URL || 'http://localhost:5500';
        const resetUrl = `${baseUrl}/redefinir-senha.html?token=${rawToken}`;

        try {
            await transporter.sendMail({
                from:    process.env.EMAIL_USER,
                to:      user.email,
                subject: 'Recuperação de Senha | GARQ Suporte',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;
                                padding: 32px; background: #0a0a0a; color: #fff; border-radius: 8px;">
                        <h2 style="color: #c5a059; margin-bottom: 16px;">Recuperação de Senha</h2>
                        <p style="color: #ccc; margin-bottom: 24px;">
                            Você solicitou a redefinição da sua senha na GARQ.
                            Clique no botão abaixo para prosseguir.
                        </p>
                        <p style="text-align: center; margin: 32px 0;">
                            <a href="${resetUrl}"
                               style="background: #c5a059; color: #000; padding: 14px 28px;
                                      text-decoration: none; border-radius: 4px; font-weight: bold;
                                      font-family: Arial, sans-serif; display: inline-block;">
                                Redefinir Senha
                            </a>
                        </p>
                        <p style="color: #888; font-size: 13px;">
                            <strong>Este link expira em 1 hora.</strong>
                        </p>
                        <p style="color: #555; font-size: 11px; margin-top: 8px;">
                            Caso o botão não funcione, copie e cole este link no navegador:<br>
                            <a href="${resetUrl}" style="color: #c5a059; word-break: break-all;">${resetUrl}</a>
                        </p>
                        <hr style="border-color: #222; margin: 24px 0;">
                        <p style="color: #555; font-size: 12px;">
                            Se você não solicitou esta recuperação, ignore este e-mail.
                            Sua senha permanece inalterada.
                        </p>
                    </div>
                `,
            });

        } catch (mailError) {
            console.error('[MAIL] Exceção ao enviar e-mail:', mailError.message);
            user.resetPasswordToken   = undefined;
            user.resetPasswordExpires = undefined;
            await user.save({ validateBeforeSave: false });
            return res.status(500).json({
                success: false,
                message: 'Não foi possível enviar o e-mail. Tente novamente mais tarde.',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Se este e-mail estiver cadastrado, você receberá um link em breve.',
        });

    } catch (error) {
        console.error('Forgot Password Error:', error);
        return res.status(500).json({ success: false, message: 'Erro ao processar solicitação.' });
    }
};

// =============================================================================
// RESETAR SENHA
// =============================================================================
exports.resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: 'Token e nova senha são obrigatórios.',
            });
        }
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'A senha deve ter no mínimo 6 caracteres.',
            });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken:   hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Link inválido ou expirado.' });
        }

        user.password             = password;
        user.resetPasswordToken   = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        return res.status(200).json({ success: true, message: 'Senha atualizada com sucesso!' });

    } catch (error) {
        console.error('Reset Password Error:', error);
        return res.status(500).json({ success: false, message: 'Erro interno ao resetar senha.' });
    }
};