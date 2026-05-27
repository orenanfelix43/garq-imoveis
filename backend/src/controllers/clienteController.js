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
// =============================================================================
// ÁREA DO CLIENTE — busca pelo userId logado
// =============================================================================
exports.getMinhaArea = async (req, res, next) => {
    try {
        const User = require('../models/User');

        console.log(`[MINHA-AREA] userId: ${req.user.id} role: ${req.user.role}`);

        // Buscar o usuário logado para pegar o email
        const user = await User.findById(req.user.id).select('email name').lean();
        console.log(`[MINHA-AREA] user: ${user?.email}`);

        // Busca primeiro por userId
        let cliente = await Cliente.findOne({ userId: req.user.id })
            .populate('imoveis.imovelId', 'titulo subtitulo tipo galeria status finalidade atributos descricaoLonga isVisible')
            .lean();
        console.log(`[MINHA-AREA] por userId: ${cliente ? `encontrado id=${cliente._id} imoveis=${cliente.imoveis?.length}` : 'não encontrado'}`);

        // Fallback por email
        if (!cliente && user?.email) {
            const clientePorEmail = await Cliente.findOne({ email: user.email });
            console.log(`[MINHA-AREA] por email "${user.email}": ${clientePorEmail ? `encontrado id=${clientePorEmail._id} userId=${clientePorEmail.userId}` : 'não encontrado'}`);

            // Debug — listar todos os clientes para comparar
            const todos = await Cliente.find({}).select('nome email userId').lean();
            console.log(`[MINHA-AREA] todos os clientes:`, JSON.stringify(todos.map(c => ({ nome: c.nome, email: c.email, userId: c.userId }))));

            if (clientePorEmail) {
                if (!clientePorEmail.userId) {
                    clientePorEmail.userId = req.user.id;
                    await clientePorEmail.save();
                }
                cliente = await Cliente.findById(clientePorEmail._id)
                    .populate('imoveis.imovelId', 'titulo subtitulo tipo galeria status finalidade atributos descricaoLonga isVisible')
                    .lean();
            }
        }

        if (!cliente) {
            return res.status(404).json({
                success: false,
                error: 'Nenhum portfólio vinculado à sua conta. Entre em contato com o administrador.',
            });
        }

        console.log(`[MINHA-AREA] retornando ${cliente.imoveis?.length} vínculos`);
        return res.json({ success: true, data: cliente });
    } catch (err) { next(err); }
};

// =============================================================================
// COMENTÁRIOS
// =============================================================================
exports.adicionarComentario = async (req, res, next) => {
    try {
        const { texto } = req.body;

        if (!texto || !texto.trim()) {
            return res.status(400).json({ success: false, error: 'O texto do comentário é obrigatório.' });
        }
        if (texto.trim().length > 1000) {
            return res.status(400).json({ success: false, error: 'Comentário não pode exceder 1000 caracteres.' });
        }

        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) return res.status(404).json({ success: false, error: 'Cliente não encontrado.' });

        // Cliente só pode comentar no próprio portfólio
        if (req.user.role === 'cliente' && cliente.userId?.toString() !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Acesso negado.' });
        }

        const vinculo = cliente.imoveis.id(req.params.vinculoId);
        if (!vinculo) return res.status(404).json({ success: false, error: 'Vínculo não encontrado.' });

        vinculo.comentarios.push({
            texto:     texto.trim(),
            autor:     req.user.id,
            autorNome: req.user.name || '',
        });

        await cliente.save();
        await cliente.populate('imoveis.imovelId', 'titulo subtitulo tipo galeria status');

        return res.json({ success: true, data: cliente });
    } catch (err) { next(err); }
};

exports.removerComentario = async (req, res, next) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) return res.status(404).json({ success: false, error: 'Cliente não encontrado.' });

        const vinculo = cliente.imoveis.id(req.params.vinculoId);
        if (!vinculo) return res.status(404).json({ success: false, error: 'Vínculo não encontrado.' });

        const comentario = vinculo.comentarios.id(req.params.comentarioId);
        if (!comentario) return res.status(404).json({ success: false, error: 'Comentário não encontrado.' });

        // Só o autor ou admin pode remover
        const isAutor = comentario.autor.toString() === req.user.id;
        const isAdmin = req.user.role === 'admin';
        if (!isAutor && !isAdmin) {
            return res.status(403).json({ success: false, error: 'Sem permissão para remover este comentário.' });
        }

        comentario.deleteOne();
        await cliente.save();
        await cliente.populate('imoveis.imovelId', 'titulo subtitulo tipo galeria status');

        return res.json({ success: true, data: cliente });
    } catch (err) { next(err); }
};