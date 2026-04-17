const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const imovelRoutes = require('./routes/imoveis');

console.log(process.env.EMAIL_USER);
console.log(process.env.EMAIL_PASS);


const app = express();
connectDB();

app.use(helmet());
app.use(cors({
  origin: "https://garq-imoveis.vercel.app/",
  methods: ["GET", "POST", "PUT", "DELETE"],
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