const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

// --- REGISTRO ---
exports.register = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        // 1. Verificação de existência (usando .exists para performance)
        const userExists = await User.exists({ email });
        if (userExists) {
            return res.status(409).json({
                success: false,
                error: 'Email já cadastrado'
            });
        }

        // 2. Criação direta
        // REMOVIDO: bcrypt.hash manual daqui. 
        // O User.js (Model) cuidará de criptografar ao dar o .create()
        const user = await User.create({
            name,
            email,
            phone,
            password
        });

        // 3. Geração de Token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(201).json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email }
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

        // 1. Busca incluindo explicitamente o password (necessário se 'select: false' no model)
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // 2. Comparação do texto limpo (visto no req.body) com o hash (do banco)
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        return res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ error: 'Erro no servidor' });
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
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
        
        // Salvando o token no banco. 
        // Se o pre-save hook estiver correto (item 1), ele não re-criptografará a senha aqui.
        await user.save();

        // Configuração do Transporter (Mova para fora ou defina antes do uso)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            }
        });

        const resetUrl = `http://localhost:5500/redefinir-senha.html?token=${token}`;

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

        // Como o Model tem pre-save hook, basta atribuir o texto limpo
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        return res.status(200).json({ success: true, message: 'Senha atualizada!' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Erro interno ao resetar senha.' });
    }
};