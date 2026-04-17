const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // O process.env.MONGODB_URI busca o link secreto que está no seu arquivo .env
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        
        console.log(`📡 MongoDB Conectado: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Erro ao conectar ao MongoDB: ${error.message}`);
        // Se não conectar, o servidor para para evitar erros maiores
        process.exit(1); 
    }
};

module.exports = connectDB;