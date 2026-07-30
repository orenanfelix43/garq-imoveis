const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
if (process.env.NODE_ENV !== 'test') require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const imovelRoutes = require('./routes/imoveis');
const documentoRoutes = require('./routes/documentos');
const configuracaoRoutes = require('./routes/configuracoes');
const usuarioRoutes = require('./routes/usuarios');
const clienteRoutes = require('./routes/clientes');
const { seedConfiguracoes } = require('./controllers/configuracaoController');
const logger = require('./utils/logger');

const allowedOrigins = new Set((process.env.CORS_ORIGINS || [
    'https://garq-imoveis.vercel.app', 'https://www.garqimoveis.com.br',
    'https://garqimoveis.com.br', 'https://garq-imoveis-frontend.vercel.app',
    'http://localhost:5500', 'http://127.0.0.1:5500',
].join(',')).split(',').map(origin => origin.trim()).filter(Boolean));

const app = express();
if (process.env.NODE_ENV !== 'test') connectDB().then(() => seedConfiguracoes());
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'same-site' },
}));
app.use(compression());
app.use(logger.requestId);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: true, legacyHeaders: false }));
app.use(cors({
    origin: (origin, callback) => !origin || allowedOrigins.has(origin)
        ? callback(null, true)
        : callback(Object.assign(new Error('Origem não permitida pelo CORS.'), { status: 403 })),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], credentials: true,
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Request-ID'],
}));
app.use(cookieParser());

app.get('/', (_req, res) => res.json({ status: 'ok', service: 'GARQ Invest API', timestamp: new Date().toISOString() }));
const json10kb = express.json({ limit: '10kb' });
const json50kb = express.json({ limit: '50kb' });
const form10kb = express.urlencoded({ limit: '10kb', extended: true });
const form50kb = express.urlencoded({ limit: '50kb', extended: true });
app.use('/api/auth', json10kb, form10kb, authRoutes);
app.use('/api/usuarios', json10kb, form10kb, usuarioRoutes);
app.use('/api/configuracoes', json50kb, form50kb, configuracaoRoutes);
app.use('/api/clientes', json50kb, form50kb, clienteRoutes);
app.use('/api/imoveis/:imovelId/documentos', express.json({ limit: '14mb' }), documentoRoutes);
app.use('/api/imoveis', express.json({ limit: '15mb' }), imovelRoutes);

app.use((_req, res) => res.status(404).json({ success: false, error: 'Rota não encontrada.' }));
app.use((err, req, res, _next) => {
    const status = err.type === 'entity.too.large' ? 413 : (err.status || 500);
    logger.error('request.failed', { requestId: req.id, method: req.method, path: req.path, status, errorName: err.name });
    res.status(status).json({ success: false, error: status >= 500 ? 'Erro interno no servidor.' : (err.message || 'Requisição inválida.'), requestId: req.id });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) app.listen(PORT, () => logger.info('server.started', { port: Number(PORT) }));
module.exports = app;
