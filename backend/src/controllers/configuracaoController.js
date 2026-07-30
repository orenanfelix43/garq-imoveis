const Configuracao = require('../models/Configuracao');
const logger = require('../utils/logger');

// Dados iniciais — inseridos automaticamente na primeira execução
const DEFAULTS = [
    {
        chave:     'tipos_imovel',
        titulo:    'Tipos de Imóvel',
        descricao: 'Lista de tipos usada no formulário de cadastro',
        itens: [
            { valor: 'casa',        label: 'Casa',        ordem: 0, ativo: true },
            { valor: 'apartamento', label: 'Apartamento', ordem: 1, ativo: true },
            { valor: 'terreno',     label: 'Terreno',     ordem: 2, ativo: true },
        ],
    },
    {
        chave:     'status_imovel',
        titulo:    'Status do Imóvel',
        descricao: 'Situação comercial do ativo',
        itens: [
            { valor: 'a_venda',   label: 'À Venda',   ordem: 0, ativo: true },
            { valor: 'aluguel',   label: 'Aluguel',   ordem: 1, ativo: true },
            { valor: 'vendido',   label: 'Vendido',   ordem: 2, ativo: true },
            { valor: 'locado',    label: 'Locado',    ordem: 3, ativo: true },
        ],
    },
    {
        chave:     'rotulos_atributos',
        titulo:    'Rótulos de Atributos',
        descricao: 'Rótulos disponíveis na ficha do imóvel',
        itens: [
            { valor: 'area_terreno',   label: 'Área Terreno',   ordem: 0,  ativo: true },
            { valor: 'area_construida',label: 'Área Construída', ordem: 1,  ativo: true },
            { valor: 'suites',         label: 'Suítes',          ordem: 2,  ativo: true },
            { valor: 'dormitorios',    label: 'Dormitórios',     ordem: 3,  ativo: true },
            { valor: 'banheiros',      label: 'Banheiros',       ordem: 4,  ativo: true },
            { valor: 'vagas',          label: 'Vagas',           ordem: 5,  ativo: true },
            { valor: 'piscina',        label: 'Piscina',         ordem: 6,  ativo: true },
            { valor: 'churrasqueira',  label: 'Churrasqueira',   ordem: 7,  ativo: true },
            { valor: 'condominio',     label: 'Condomínio',      ordem: 8,  ativo: true },
            { valor: 'iptu',           label: 'IPTU',            ordem: 9,  ativo: true },
        ],
    },
    {
        chave:     'finalidades',
        titulo:    'Finalidades',
        descricao: 'Uso previsto do imóvel',
        itens: [
            { valor: 'residencial', label: 'Residencial', ordem: 0, ativo: true },
            { valor: 'comercial',   label: 'Comercial',   ordem: 1, ativo: true },
            { valor: 'industrial',  label: 'Industrial',  ordem: 2, ativo: true },
            { valor: 'rural',       label: 'Rural',       ordem: 3, ativo: true },
        ],
    },
];

// ─── Seed automático (chamado no boot do app) ─────────────────────────────────
exports.seedConfiguracoes = async () => {
    for (const def of DEFAULTS) {
        const existe = await Configuracao.findOne({ chave: def.chave });
        if (!existe) {
            await Configuracao.create(def);
            logger.info('configuration.seeded', { configKey: def.chave });
        }
    }
};

// ─── Listar todas as configurações ───────────────────────────────────────────
exports.listarConfiguracoes = async (req, res, next) => {
    try {
        const configs = await Configuracao.find().sort({ titulo: 1 }).lean();
        return res.json({ success: true, data: configs });
    } catch (err) { next(err); }
};

// ─── Buscar uma configuração por chave (pública — usada nos forms) ────────────
exports.getConfiguracaoPorChave = async (req, res, next) => {
    try {
        const config = await Configuracao.findOne({ chave: req.params.chave }).lean();
        if (!config) return res.status(404).json({ success: false, error: 'Configuração não encontrada.' });
        return res.json({ success: true, data: config });
    } catch (err) { next(err); }
};

// ─── Criar nova lista ─────────────────────────────────────────────────────────
exports.criarConfiguracao = async (req, res, next) => {
    try {
        const { chave, titulo, descricao } = req.body;
        if (!chave || !titulo) {
            return res.status(400).json({ success: false, error: 'Chave e título são obrigatórios.' });
        }
        const existe = await Configuracao.findOne({ chave: chave.trim().toLowerCase().replace(/\s+/g, '_') });
        if (existe) return res.status(400).json({ success: false, error: 'Já existe uma lista com essa chave.' });

        const config = await Configuracao.create({
            chave:     chave.trim().toLowerCase().replace(/\s+/g, '_'),
            titulo:    titulo.trim(),
            descricao: descricao?.trim() || '',
            itens:     [],
        });
        return res.status(201).json({ success: true, data: config });
    } catch (err) { next(err); }
};

// ─── Deletar lista inteira ────────────────────────────────────────────────────
exports.deletarConfiguracao = async (req, res, next) => {
    try {
        const config = await Configuracao.findByIdAndDelete(req.params.id);
        if (!config) return res.status(404).json({ success: false, error: 'Configuração não encontrada.' });
        return res.json({ success: true, message: 'Lista removida.' });
    } catch (err) { next(err); }
};

// ─── Adicionar item a uma lista ───────────────────────────────────────────────
exports.adicionarItem = async (req, res, next) => {
    try {
        const { valor, label } = req.body;
        if (!valor || !label) {
            return res.status(400).json({ success: false, error: 'Valor e label são obrigatórios.' });
        }
        const config = await Configuracao.findById(req.params.id);
        if (!config) return res.status(404).json({ success: false, error: 'Configuração não encontrada.' });

        const jaExiste = config.itens.some(i => i.valor === valor.trim().toLowerCase().replace(/\s+/g, '_'));
        if (jaExiste) return res.status(400).json({ success: false, error: 'Já existe um item com esse valor.' });

        config.itens.push({
            valor: valor.trim().toLowerCase().replace(/\s+/g, '_'),
            label: label.trim(),
            ordem: config.itens.length,
            ativo: true,
        });
        await config.save();
        return res.json({ success: true, data: config });
    } catch (err) { next(err); }
};

// ─── Atualizar item (label, ativo) ────────────────────────────────────────────
exports.atualizarItem = async (req, res, next) => {
    try {
        const { label, ativo } = req.body;
        const config = await Configuracao.findById(req.params.id);
        if (!config) return res.status(404).json({ success: false, error: 'Configuração não encontrada.' });

        const item = config.itens.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, error: 'Item não encontrado.' });

        if (label !== undefined) item.label = label.trim();
        if (ativo !== undefined) item.ativo = Boolean(ativo);
        await config.save();
        return res.json({ success: true, data: config });
    } catch (err) { next(err); }
};

// ─── Remover item de uma lista ────────────────────────────────────────────────
exports.removerItem = async (req, res, next) => {
    try {
        const config = await Configuracao.findById(req.params.id);
        if (!config) return res.status(404).json({ success: false, error: 'Configuração não encontrada.' });

        const item = config.itens.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, error: 'Item não encontrado.' });

        item.deleteOne();
        await config.save();
        return res.json({ success: true, data: config });
    } catch (err) { next(err); }
};
