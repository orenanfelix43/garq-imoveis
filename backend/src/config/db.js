const mongoose = require('mongoose');

// ─── Opções de conexão ────────────────────────────────────────────────────────
const mongooseOptions = {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize:              parseInt(process.env.DB_POOL_SIZE) || 10,
    minPoolSize:              2,
    socketTimeoutMS:          45000,
    connectTimeoutMS:         10000,
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