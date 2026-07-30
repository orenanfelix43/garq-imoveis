const crypto = require('crypto');

const BLOCKED_KEYS = /password|senha|token|authorization|cookie|email|phone|telefone|cpf|cnpj|rg|payload|body|dados/i;

function sanitize(meta = {}) {
    return Object.fromEntries(Object.entries(meta).flatMap(([key, value]) => {
        if (BLOCKED_KEYS.test(key)) return [];
        if (value === undefined || value === null) return [[key, value]];
        if (typeof value === 'string') return [[key, value.slice(0, 200)]];
        if (typeof value === 'number' || typeof value === 'boolean') return [[key, value]];
        return [];
    }));
}

function write(level, action, meta) {
    const entry = { timestamp: new Date().toISOString(), level, action, ...sanitize(meta) };
    const output = JSON.stringify(entry);
    if (level === 'error') console.error(output);
    else if (level === 'warn') console.warn(output);
    else console.log(output);
}

module.exports = {
    requestId: (req, _res, next) => {
        req.id = req.get('x-request-id')?.slice(0, 100) || crypto.randomUUID();
        next();
    },
    info: (action, meta) => write('info', action, meta),
    warn: (action, meta) => write('warn', action, meta),
    error: (action, meta) => write('error', action, meta),
};
