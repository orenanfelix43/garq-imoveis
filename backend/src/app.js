const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const compression = require('compression');
require('dotenv').config();

const connectDB      = require('./config/db');
const authRoutes     = require('./routes/auth');
const imovelRoutes   = require('./routes/imoveis');

// ─── Origens autorizadas ──────────────────────────────────────────────────────
const allowedOrigins = [
    'https://garq-imoveis.vercel.app',
    'https://www.garqimoveis.com.br',
    'https://garqimoveis.com.br',
    'https://garq-imoveis-frontend.vercel.app',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://localhost:5000',
];

const app = express();
connectDB();

// ─── Segurança ────────────────────────────────────────────────────────────────
app.use(helmet());

// ─── Compressão gzip ─────────────────────────────────────────────────────────
app.use(compression());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); // curl, Postman, mobile
        if (!allowedOrigins.includes(origin)) {
            return callback(new Error('Origem não permitida pelo CORS.'), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// ─── Healthcheck ─────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'GARQ Invest API',
        timestamp: new Date().toISOString(),
    });
});

// ─── Rotas ────────────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/imoveis', imovelRoutes);

// ─── Handler 404 ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Rota não encontrada.' });
});

// ─── Handler de Erros Global ──────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('[GLOBAL ERROR]', err.message);
    const statusCode = err.status || 500;
    res.status(statusCode).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Erro interno no servidor.'
            : err.message,
    });
});

// ─── Servidor Local ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Servidor rodando na porta ${PORT}`));

module.exports = app;