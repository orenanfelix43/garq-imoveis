const Imovel = require('../models/Imovel');

// ==========================================
// 1. CREATE (Criar)
// ==========================================
exports.criarImovel = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : "69d3bdefb7e82777bf8ddf34"; 
        
        const novoImovel = await Imovel.create({
            ...req.body,
            user: userId
        });

        res.status(201).json({ success: true, data: novoImovel });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// ==========================================
// 2. READ (Buscar Todos)
// ==========================================
exports.getImoveis = async (req, res) => {
    try {
        const imoveis = await Imovel.find();
        
        res.status(200).json({ 
            success: true, 
            count: imoveis.length, 
            data: imoveis 
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// ==========================================
// 3. READ (Buscar por ID)
// ==========================================
exports.getImovel = async (req, res) => {
    try {
        const imovel = await Imovel.findById(req.params.id);
        
        // Verifica se o imóvel de fato existe
        if (!imovel) {
            return res.status(404).json({ success: false, error: "Imóvel não encontrado." });
        }
        
        res.status(200).json({ success: true, data: imovel });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// ==========================================
// 4. UPDATE (Atualizar)
// ==========================================
exports.atualizarImovel = async (req, res) => {
    try {
        let imovel = await Imovel.findById(req.params.id);

        if (!imovel) {
            return res.status(404).json({ success: false, error: "Imóvel não encontrado." });
        }

        // Atualiza e retorna o documento novo já modificado
        imovel = await Imovel.findByIdAndUpdate(req.params.id, req.body, {
            new: true, // Retorna o objeto atualizado e não o antigo
            runValidators: true // Força o Mongoose a validar as regras do Schema no Update
        });

        res.status(200).json({ success: true, data: imovel });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// ==========================================
// 5. DELETE (Excluir)
// ==========================================
exports.deletarImovel = async (req, res) => {
    try {
        const imovel = await Imovel.findByIdAndDelete(req.params.id);

        if (!imovel) {
            return res.status(404).json({ success: false, error: "Imóvel não encontrado." });
        }

        // Usar deleteOne() dispara os "middlewares" do Mongoose caso você os tenha configurado no Model
        await imovel.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};