const Imovel   = require('../models/Imovel');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const Joi      = require('joi');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key:    process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
});

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

// ─── Limites de segurança por imagem ─────────────────────────────────────────
const MAX_B64_BYTES = 4 * 1024 * 1024; // ~3 MB por imagem em base64

const uploadGaleria = async (galeria) => {
    if (!galeria || galeria.length === 0) return [];

    return pLimit(galeria, async (item) => {
        if (!item.url?.startsWith('data:')) return item; // URL já hospedada, não reenviar

        if (item.url.length > MAX_B64_BYTES) {
            throw new Error('Uma das imagens excede o tamanho máximo permitido (3 MB). Comprima antes de enviar.');
        }

        const result = await cloudinary.uploader.upload(item.url, {
            folder:        'imoveis_projeto',
            resource_type: 'image',
            timeout:       20000,        // 20 s por upload — evita uploads pendurados
            quality:       'auto:good',  // compressão automática pelo Cloudinary
            fetch_format:  'auto',       // entrega WebP em browsers modernos
        });

        return {
            ...item,
            url:       result.secure_url,
            public_id: result.public_id,
        };
    }, 3); // máximo 3 uploads simultâneos
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
        console.error('[criarImovel]', error.message);
        res.status(400).json({ success: false, error: error.message });
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
        if (req.query.tipo && ['casa', 'terreno', 'apartamento'].includes(req.query.tipo)) {
            filter.tipo = req.query.tipo;
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
// 3. READ — Listar Um
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

        const { error, value } = imovelSchema.validate(req.body, { stripUnknown: true, abortEarly: false, presence: 'optional' });
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
        console.error('[atualizarImovel]', error.message);
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
        console.error('[deletarImovel]', error.message);
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
        console.error('[setDestaque]', error.message);
        res.status(500).json({ success: false, error: 'Erro ao definir destaque.' });
    } finally {
        session.endSession();
    }
};