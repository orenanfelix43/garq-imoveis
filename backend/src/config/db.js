const mongoose = require('mongoose');

// ─── Opções de conexão ────────────────────────────────────────────────────────
const mongooseOptions = {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 5,
};

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
        console.log(`📡 MongoDB Conectado: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Erro ao conectar ao MongoDB: ${error.message}`);
        process.exit(1);
    }
};

// ─── Listeners de evento ──────────────────────────────────────────────────────
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB desconectado.');
});

mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB reconectado.');
});

module.exports = connectDB;