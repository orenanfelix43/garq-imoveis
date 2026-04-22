const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const imovelRoutes = require('./routes/imoveis');

const allowedOrigins = [
  'https://garq-imoveis.vercel.app',
  'https://www.garqimoveis.com.br',
  'https://garqimoveis.com.br',
  'https://garq-imoveis-frontend.vercel.app',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000'
];

const app = express();
connectDB();

app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Permite pedidos sem origem (como apps móveis ou curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'A política CORS para este site não permite acesso a partir da origem especificada.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/', (req, res) => {
    res.send('Servidor do AdminGarq rodando com sucesso!');
});

// Rotas — apenas UMA vez cada
app.use('/api/auth', authRoutes);
app.use('/api/imoveis', imovelRoutes);

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Local: http://localhost:${PORT}`));
}

module.exports = app;