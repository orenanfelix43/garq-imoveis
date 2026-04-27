const Imovel   = require('../models/Imovel');
const mongoose = require('mongoose');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// =============================================================================
// 1. CREATE
// =============================================================================
exports.criarImovel = async (req, res) => {
    try {
        const novoImovel = await Imovel.create({
            ...req.body,
            user: req.user.id,
        });

        res.status(201).json({ success: true, data: novoImovel });
    } catch (error) {
        console.error('criarImovel Error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
};

// =============================================================================
// 2. READ — Listar Todos (com paginação)
// =============================================================================
exports.getImoveis = async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 20);
        const skip  = (page - 1) * limit;

        const filter = {};
        if (req.query.tipo && ['casa', 'terreno', 'apartamento'].includes(req.query.tipo)) {
            filter.tipo = req.query.tipo;
        }

        const [imoveis, total] = await Promise.all([
            Imovel.find(filter, '-descricaoLonga').skip(skip).limit(limit).lean(),
            Imovel.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count:   imoveis.length,
            total,
            page,
            pages:   Math.ceil(total / limit),
            data:    imoveis,
        });
    } catch (error) {
        console.error('getImoveis Error:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar imóveis.' });
    }
};

// =============================================================================
// 3. READ 
// =============================================================================
exports.getImovel = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, error: 'ID inválido.' });
        }

        const imovel = await Imovel.findById(req.params.id).lean();

        if (!imovel) {
            return res.status(404).json({ success: false, error: 'Imóvel não encontrado.' });
        }

        res.status(200).json({ success: true, data: imovel });
    } catch (error) {
        console.error('getImovel Error:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar imóvel.' });
    }
};

// =============================================================================
// 4. UPDATE
// =============================================================================
exports.atualizarImovel = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, error: 'ID inválido.' });
        }

        const { user, createdAt, updatedAt, _id, __v, ...updateData } = req.body;

        const imovel = await Imovel.findById(req.params.id);

        if (!imovel) {
            return res.status(404).json({ success: false, error: 'Imóvel não encontrado.' });
        }

        if (imovel.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Você não tem permissão para editar este imóvel.',
            });
        }

        const atualizado = await Imovel.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new:          true,  
                runValidators: true, 
            }
        );

        res.status(200).json({ success: true, data: atualizado });
    } catch (error) {
        console.error('atualizarImovel Error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
};

// =============================================================================
// 5. DELETE
// =============================================================================
exports.deletarImovel = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, error: 'ID inválido.' });
        }

        const imovel = await Imovel.findById(req.params.id);

        if (!imovel) {
            return res.status(404).json({ success: false, error: 'Imóvel não encontrado.' });
        }

        if (imovel.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Você não tem permissão para excluir este imóvel.',
            });
        }

        await imovel.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        console.error('deletarImovel Error:', error);
        res.status(500).json({ success: false, error: 'Erro ao deletar imóvel.' });
    }
};