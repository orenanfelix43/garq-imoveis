const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

// --- REGISTRO ---
exports.register = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        const userExists = await User.exists({ email });
        if (userExists) {
            return res.status(409).json({
                success: false,
                error: 'Email já cadastrado'
            });
        }

        const user = await User.create({ name, email, phone, password });

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(201).json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error('Register Error:', error);
        return res.status(500).json({ success: false, error: 'Erro ao registrar usuário' });
    }
};

// --- LOGIN ---
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ success: false, error: 'Credenciais inválidas' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Credenciais inválidas' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        return res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ success: false, error: 'Erro no servidor' });
    }
};

// --- ESQUECI A SENHA ---
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'E-mail não cadastrado.' });
        }

        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 604800000;
        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            }
        });

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
        const resetUrl = `${baseUrl}/redefinir-senha.html?token=${token}`;

        await transporter.sendMail({
            to: user.email,
            subject: 'Recuperação de Senha | GARQ Invest',
            html: `<h1>Recuperação de Senha</h1>
                   <p>Clique no botão abaixo para redefinir sua senha:</p>
                   <a href="${resetUrl}" style="background: #c5a059; color: black; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Redefinir Senha</a>`
        });

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        return res.status(500).json({ success: false, message: 'Erro ao processar solicitação.' });
    }
};

// --- RESETAR SENHA ---
exports.resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Link inválido ou expirado.' });
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        return res.status(200).json({ success: true, message: 'Senha atualizada!' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        return res.status(500).json({ success: false, message: 'Erro interno ao resetar senha.' });
    }
};