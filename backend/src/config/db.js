const mongoose = require('mongoose');
const logger = require('../utils/logger');

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
        logger.info('database.connected');
    } catch (error) {
        logger.error('database.connection_failed', { errorName: error.name });
        process.exit(1);
    }
};

// ─── Listeners de evento ──────────────────────────────────────────────────────
mongoose.connection.on('disconnected', () => {
    logger.warn('database.disconnected');
});

mongoose.connection.on('reconnected', () => {
    logger.info('database.reconnected');
});

module.exports = connectDB;
