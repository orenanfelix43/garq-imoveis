const Imovel     = require('../models/Imovel');
const mongoose   = require('mongoose');
const cloudinary = require('../config/cloudinary');
const Joi        = require('joi');
const logger     = require('../utils/logger');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

async function pLimit(items, fn, concurrency = 3) {
    const results = [];
    for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency);
        results.push(...await Promise.all(batch.map(fn)));
    }
    return results;
}

const imovelSchema = Joi.object({
    titulo:         Joi.string().max(200).required().messages({
        'string.max':   'Título não pode exceder 200 caracteres.',
        'any.required': 'O título é obrigatório.',
    }),
    subtitulo:      Joi.string().required().messages({
        'any.required': 'O subtítulo/localização é obrigatório.',
    }),
    tipo:           Joi.string().max(100).required().messages({
        'any.required': 'O tipo é obrigatório.',
    }),
    status:         Joi.string().max(100).allow('').default(''),
    finalidade:     Joi.string().max(100).allow('').default(''),
    isVisible:      Joi.boolean().default(true),
    descricaoLonga: Joi.string().required().messages({
        'any.required': 'A descrição longa é necessária.',
    }),
    isDestaque:     Joi.boolean().default(false),
    atributos:      Joi.array().items(
        Joi.object({ label: Joi.string().max(80), value: Joi.string().max(200) })
    ).default([]),
    galeria:        Joi.array().max(15).default([]).messages({
        'array.max': 'Máximo de 15 imagens por imóvel.',
    }),
});
const imovelUpdateSchema = imovelSchema
    .fork(['titulo', 'subtitulo', 'tipo', 'descricaoLonga'], schema => schema.optional())
    .min(1);

// ─── Limites de segurança por imagem ─────────────────────────────────────────
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const IMAGE_DATA = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
const IMAGE_SIGNATURES = {
    'image/jpeg': Buffer.from([0xff, 0xd8, 0xff]),
    'image/png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    'image/webp': Buffer.from('RIFF'),
};

function validateImage(dataUrl) {
    const match = IMAGE_DATA.exec(dataUrl);
    if (!match) throw new Error('Imagem inválida. Use JPEG, PNG ou WebP; SVG não é permitido.');
    const bytes = Buffer.from(match[2], 'base64');
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error('Uma imagem excede o limite real de 3 MB.');
    const signature = IMAGE_SIGNATURES[match[1]];
    const validWebp = match[1] !== 'image/webp' || bytes.subarray(8, 12).toString('ascii') === 'WEBP';
    if (!bytes.subarray(0, signature.length).equals(signature) || !validWebp) throw new Error('Assinatura de imagem inválida.');
}

const uploadGaleria = async (galeria) => {
    if (!galeria || galeria.length === 0) return [];
    return pLimit(galeria, async (item) => {
        if (!item.url?.startsWith('data:')) {
            if (!/^https:\/\/res\.cloudinary\.com\//i.test(item.url || '')) throw new Error('URL externa de imagem não permitida.');
            return item;
        }
        validateImage(item.url);
        const result = await cloudinary.uploader.upload(item.url, {
            folder: 'imoveis_projeto', resource_type: 'image', timeout: 20000,
            quality: 'auto:good', fetch_format: 'auto',
        });
        return { ...item, url: result.secure_url, public_id: result.public_id };
    }, 3);
};

// =============================================================================
// 1. CREATE
// =============================================================================
exports.criarImovel = async (req, res) => {
    try {
        const { error, value } = imovelSchema.validate(req.body, { stripUnknown: true, abortEarly: false });
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details.map(d => d.message).join('; '),
            });
        }

        const galeriaOtimizada = await uploadGaleria(value.galeria);

        const novoImovel = await Imovel.create({
            ...value,
            galeria: galeriaOtimizada,
            user:    req.user.id,
        });

        res.status(201).json({ success: true, data: novoImovel });
    } catch (error) {
        logger.error('property.create_failed', { requestId: req.id, errorName: error.name });
        const safe = /^(Imagem inválida|Uma imagem excede|Assinatura de imagem|URL externa)/.test(error.message || '');
        res.status(400).json({ success: false, error: safe ? error.message : 'Não foi possível validar ou enviar as imagens.' });
    }
};

// =============================================================================
// 2. READ — Listar Todos
// =============================================================================
exports.getImoveis = async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 20);
        const skip  = (page - 1) * limit;

        const filter = {};

        // Rota pública: sempre filtra imóveis visíveis — sem exceção
        // O painel admin usa GET /api/imoveis/admin que não filtra visibilidade
        filter.isVisible = true;

        if (req.query.tipo && typeof req.query.tipo === 'string' && req.query.tipo.length <= 100) {
            filter.tipo = req.query.tipo.trim();
        }

        const [imoveis, total] = await Promise.all([
            Imovel.find(filter).skip(skip).limit(limit).lean(),
            Imovel.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            total,
            page,
            pages: Math.ceil(total / limit),
            data:  imoveis,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erro ao buscar imóveis.' });
    }
};

// =============================================================================
// 3. READ — Listar Todos (ADMIN) — inclui ocultos
// =============================================================================
exports.getImoveisAdmin = async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 20);
        const skip  = (page - 1) * limit;

        const filter = {};
        if (req.query.tipo && typeof req.query.tipo === 'string' && req.query.tipo.length <= 100) {
            filter.tipo = req.query.tipo.trim();
        }

        const [imoveis, total] = await Promise.all([
            Imovel.find(filter).skip(skip).limit(limit).lean(),
            Imovel.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            total,
            page,
            pages: Math.ceil(total / limit),
            data:  imoveis,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erro ao buscar imóveis.' });
    }
};

// =============================================================================
// 4. READ — Listar Um
// =============================================================================
exports.getImovel = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, error: 'ID inválido.' });
        }
        const imovel = await Imovel.findOne({ _id: req.params.id, isVisible: true }).lean();
        if (!imovel) {
            return res.status(404).json({ success: false, error: 'Imóvel não encontrado.' });
        }
        res.status(200).json({ success: true, data: imovel });
    } catch (error) {
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

        const imovelOriginal = await Imovel.findById(req.params.id);
        if (!imovelOriginal) {
            return res.status(404).json({ success: false, error: 'Imóvel não encontrado.' });
        }
        if (imovelOriginal.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Sem permissão.' });
        }

        const { error, value } = imovelUpdateSchema.validate(req.body, { stripUnknown: true, abortEarly: false, noDefaults: true });
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details.map(d => d.message).join('; '),
            });
        }

        if (value.galeria) {
            value.galeria = await uploadGaleria(value.galeria);
        }

        const atualizado = await Imovel.findByIdAndUpdate(
            req.params.id,
            { $set: value },
            { runValidators: true, returnDocument: 'after' }
        );

        res.status(200).json({ success: true, data: atualizado });
    } catch (error) {
        logger.error('property.update_failed', { requestId: req.id, propertyId: req.params.id, errorName: error.name });
        const safe = /^(Imagem inválida|Uma imagem excede|Assinatura de imagem|URL externa)/.test(error.message || '');
        res.status(400).json({ success: false, error: safe ? error.message : 'Não foi possível validar ou enviar as imagens.' });
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
            return res.status(403).json({ success: false, error: 'Sem permissão.' });
        }

        if (imovel.galeria && imovel.galeria.length > 0) {
            const deletePromises = imovel.galeria
                .filter(img => img.public_id)
                .map(img => cloudinary.uploader.destroy(img.public_id));
            await Promise.all(deletePromises);
        }

        await imovel.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        logger.error('property.delete_failed', { requestId: req.id, propertyId: req.params.id, errorName: error.name });
        res.status(500).json({ success: false, error: 'Erro ao deletar imóvel.' });
    }
};

// =============================================================================
// 6. SET DESTAQUE
// =============================================================================
exports.setDestaque = async (req, res) => {
    if (!isValidId(req.params.id)) {
        return res.status(400).json({ success: false, error: 'ID inválido.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await Imovel.updateMany({ isDestaque: true }, { isDestaque: false }, { session });

        const imovelDestaque = await Imovel.findByIdAndUpdate(
            req.params.id,
            { isDestaque: true },
            { returnDocument: 'after', session }
        );

        if (!imovelDestaque) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, error: 'Imóvel não encontrado.' });
        }

        await session.commitTransaction();
        res.status(200).json({ success: true, data: imovelDestaque });
    } catch (error) {
        await session.abortTransaction();
        logger.error('property.feature_failed', { requestId: req.id, propertyId: req.params.id, errorName: error.name });
        res.status(500).json({ success: false, error: 'Erro ao definir destaque.' });
    } finally {
        session.endSession();
    }
};

// =============================================================================
// 7. TOGGLE VISIBILIDADE
// =============================================================================
exports.toggleVisibilidade = async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, error: 'ID inválido.' });
        }

        const imovel = await Imovel.findById(req.params.id);
        if (!imovel) {
            return res.status(404).json({ success: false, error: 'Imóvel não encontrado.' });
        }

        imovel.isVisible = !imovel.isVisible;
        await imovel.save();

        res.status(200).json({ success: true, data: { isVisible: imovel.isVisible } });
    } catch (error) {
        logger.error('property.visibility_failed', { requestId: req.id, propertyId: req.params.id, errorName: error.name });
        res.status(500).json({ success: false, error: 'Erro ao alterar visibilidade.' });
    }
};
