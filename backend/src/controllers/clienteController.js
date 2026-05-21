const Cliente  = require('../models/Cliente');
const Imovel   = require('../models/Imovel');
const mongoose = require('mongoose');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// =============================================================================
// LISTAR todos os clientes
// =============================================================================
exports.listarClientes = async (req, res, next) => {
    try {
        const clientes = await Cliente.find()
            .populate('imoveis.imovelId', 'titulo subtitulo tipo galeria')
            .sort({ createdAt: -1 })
            .lean();

        return res.json({ success: true, data: clientes });
    } catch (err) { next(err); }
};

// =============================================================================
// BUSCAR um cliente
// =============================================================================
exports.getCliente = async (req, res, next) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, error: 'ID inválido.' });
        }

        const cliente = await Cliente.findById(req.params.id)
            .populate('imoveis.imovelId', 'titulo subtitulo tipo galeria status')
            .lean();

        if (!cliente) {
            return res.status(404).json({ success: false, error: 'Cliente não encontrado.' });
        }

        return res.json({ success: true, data: cliente });
    } catch (err) { next(err); }
};

// =============================================================================
// CRIAR cliente
// =============================================================================
exports.criarCliente = async (req, res, next) => {
    try {
        const { nome, telefone, email, notas } = req.body;

        if (!nome || !telefone) {
            return res.status(400).json({ success: false, error: 'Nome e telefone são obrigatórios.' });
        }

        const cliente = await Cliente.create({
            nome:      nome.trim(),
            telefone:  telefone.trim(),
            email:     email?.trim() || '',
            notas:     notas?.trim() || '',
            imoveis:   [],
            criadoPor: req.user.id,
        });

        return res.status(201).json({ success: true, data: cliente });
    } catch (err) { next(err); }
};

// =============================================================================
// ATUALIZAR cliente (dados básicos)
// =============================================================================
exports.atualizarCliente = async (req, res, next) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, error: 'ID inválido.' });
        }

        const { nome, telefone, email, notas } = req.body;

        const cliente = await Cliente.findByIdAndUpdate(
            req.params.id,
            {
                ...(nome     && { nome:     nome.trim()     }),
                ...(telefone && { telefone: telefone.trim() }),
                ...(email    !== undefined && { email: email.trim() }),
                ...(notas    !== undefined && { notas: notas.trim() }),
            },
            { new: true, runValidators: true }
        ).populate('imoveis.imovelId', 'titulo subtitulo tipo galeria status');

        if (!cliente) {
            return res.status(404).json({ success: false, error: 'Cliente não encontrado.' });
        }

        return res.json({ success: true, data: cliente });
    } catch (err) { next(err); }
};

// =============================================================================
// DELETAR cliente
// =============================================================================
exports.deletarCliente = async (req, res, next) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, error: 'ID inválido.' });
        }

        const cliente = await Cliente.findByIdAndDelete(req.params.id);
        if (!cliente) {
            return res.status(404).json({ success: false, error: 'Cliente não encontrado.' });
        }

        return res.json({ success: true, message: 'Cliente removido.' });
    } catch (err) { next(err); }
};

// =============================================================================
// ADICIONAR vínculo com imóvel
// =============================================================================
exports.adicionarVinculo = async (req, res, next) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, error: 'ID inválido.' });
        }

        const { imovelId, tipo, observacao } = req.body;

        if (!imovelId || !isValidId(imovelId)) {
            return res.status(400).json({ success: false, error: 'imovelId inválido.' });
        }

        const tiposPermitidos = ['interessado', 'proprietario'];
        if (tipo && !tiposPermitidos.includes(tipo)) {
            return res.status(400).json({ success: false, error: 'Tipo deve ser "interessado" ou "proprietario".' });
        }

        const imovel = await Imovel.findById(imovelId).lean();
        if (!imovel) {
            return res.status(404).json({ success: false, error: 'Imóvel não encontrado.' });
        }

        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            return res.status(404).json({ success: false, error: 'Cliente não encontrado.' });
        }

        // Evitar duplicata do mesmo imóvel com o mesmo tipo
        const jaExiste = cliente.imoveis.some(
            v => v.imovelId.toString() === imovelId && v.tipo === (tipo || 'interessado')
        );
        if (jaExiste) {
            return res.status(400).json({ success: false, error: 'Vínculo já existe para este imóvel e tipo.' });
        }

        cliente.imoveis.push({
            imovelId,
            tipo:       tipo || 'interessado',
            observacao: observacao?.trim() || '',
        });

        await cliente.save();
        await cliente.populate('imoveis.imovelId', 'titulo subtitulo tipo galeria status');

        return res.json({ success: true, data: cliente });
    } catch (err) { next(err); }
};

// =============================================================================
// REMOVER vínculo com imóvel
// =============================================================================
exports.removerVinculo = async (req, res, next) => {
    try {
        if (!isValidId(req.params.id) || !isValidId(req.params.vinculoId)) {
            return res.status(400).json({ success: false, error: 'ID inválido.' });
        }

        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            return res.status(404).json({ success: false, error: 'Cliente não encontrado.' });
        }

        const vinculo = cliente.imoveis.id(req.params.vinculoId);
        if (!vinculo) {
            return res.status(404).json({ success: false, error: 'Vínculo não encontrado.' });
        }

        vinculo.deleteOne();
        await cliente.save();
        await cliente.populate('imoveis.imovelId', 'titulo subtitulo tipo galeria status');

        return res.json({ success: true, data: cliente });
    } catch (err) { next(err); }
};