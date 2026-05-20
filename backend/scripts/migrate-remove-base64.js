/**
 * migrate-remove-base64.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Remove o campo `dados` (base64) de documentos antigos no MongoDB.
 * Esses documentos foram criados antes da migração para Cloudinary e ainda
 * carregam o arquivo completo em base64 no banco — desperdiçando espaço no Atlas.
 *
 * COMO USAR:
 *   1. Instale as dependências: npm install (na pasta backend)
 *   2. Dry-run (só leitura — não altera nada):
 *        node scripts/migrate-remove-base64.js
 *   3. Execução real (remove o campo dados):
 *        node scripts/migrate-remove-base64.js --confirm
 *
 * SEGURANÇA:
 *   - Só remove o campo `dados` (base64) — nunca apaga o documento inteiro
 *   - Documentos sem o campo `dados` são ignorados
 *   - Documentos sem `url` válida são ignorados (não têm backup no Cloudinary)
 *   - Relatório completo antes e depois da operação
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const DRY_RUN     = !process.argv.includes('--confirm');

// ─── Cores para o terminal ────────────────────────────────────────────────────
const c = {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    red:    '\x1b[31m',
    green:  '\x1b[32m',
    yellow: '\x1b[33m',
    cyan:   '\x1b[36m',
    gray:   '\x1b[90m',
};

function log(msg)        { console.log(msg); }
function logOk(msg)      { console.log(`${c.green}✔${c.reset}  ${msg}`); }
function logWarn(msg)    { console.log(`${c.yellow}⚠${c.reset}  ${msg}`); }
function logError(msg)   { console.log(`${c.red}✖${c.reset}  ${msg}`); }
function logInfo(msg)    { console.log(`${c.cyan}ℹ${c.reset}  ${msg}`); }
function logSection(msg) { console.log(`\n${c.bold}${msg}${c.reset}`); }
function hr()            { console.log(c.gray + '─'.repeat(60) + c.reset); }

// ─── Formatar bytes ───────────────────────────────────────────────────────────
function formatBytes(bytes) {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function run() {
    if (!MONGODB_URI) {
        logError('MONGODB_URI não encontrado no .env');
        process.exit(1);
    }

    // ─── Cabeçalho ────────────────────────────────────────────────────────────
    log('');
    log(`${c.bold}╔══════════════════════════════════════════════════════════╗${c.reset}`);
    log(`${c.bold}║     MIGRAÇÃO — Remoção de Base64 Residual no MongoDB     ║${c.reset}`);
    log(`${c.bold}╚══════════════════════════════════════════════════════════╝${c.reset}`);
    log('');

    if (DRY_RUN) {
        logWarn(`${c.bold}MODO DRY-RUN${c.reset} — Nenhuma alteração será feita.`);
        logInfo('Para executar de verdade, rode com a flag --confirm');
    } else {
        logWarn(`${c.bold}MODO REAL${c.reset} — Alterações serão aplicadas no banco.`);
    }
    log('');

    // ─── Conexão ──────────────────────────────────────────────────────────────
    logSection('1. Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    logOk(`Conectado: ${mongoose.connection.host}`);

    const db         = mongoose.connection.db;
    const collection = db.collection('documentos');

    // ─── Análise ──────────────────────────────────────────────────────────────
    logSection('2. Analisando documentos...');
    hr();

    // Total de documentos na collection
    const totalDocs = await collection.countDocuments();
    logInfo(`Total de documentos na collection: ${c.bold}${totalDocs}${c.reset}`);

    // Documentos com campo `dados` (base64 residual)
    const comDados = await collection.countDocuments({ dados: { $exists: true } });
    logInfo(`Documentos com campo 'dados' (base64): ${c.bold}${comDados}${c.reset}`);

    if (comDados === 0) {
        logOk('Nenhum documento com base64 residual encontrado. Banco já está limpo.');
        await mongoose.disconnect();
        return;
    }

    // Documentos com `dados` E sem `url` — não têm backup no Cloudinary, não devem ser tocados
    const semUrl = await collection.countDocuments({
        dados: { $exists: true },
        $or: [{ url: { $exists: false } }, { url: '' }, { url: null }],
    });

    if (semUrl > 0) {
        logWarn(`${semUrl} documento(s) têm base64 mas NÃO têm URL do Cloudinary — serão ignorados.`);
    }

    // Documentos elegíveis para limpeza (têm dados E têm url válida)
    const elegiveis = await collection.find({
        dados: { $exists: true },
        url:   { $exists: true, $ne: '', $ne: null },
    }).toArray();

    logInfo(`Documentos elegíveis para limpeza: ${c.bold}${elegiveis.length}${c.reset}`);
    hr();

    if (elegiveis.length === 0) {
        logOk('Nenhum documento elegível para limpeza.');
        await mongoose.disconnect();
        return;
    }

    // ─── Relatório dos elegíveis ──────────────────────────────────────────────
    logSection('3. Documentos que serão afetados:');
    hr();

    let totalBase64Bytes = 0;

    for (const doc of elegiveis) {
        const base64Size = doc.dados ? Buffer.byteLength(doc.dados, 'utf8') : 0;
        totalBase64Bytes += base64Size;

        log(`  ${c.cyan}ID:${c.reset}     ${doc._id}`);
        log(`  ${c.cyan}Nome:${c.reset}   ${doc.nome}`);
        log(`  ${c.cyan}URL:${c.reset}    ${doc.url}`);
        log(`  ${c.cyan}Base64:${c.reset} ${formatBytes(base64Size)} que serão removidos`);
        log('');
    }

    hr();
    logInfo(`Espaço total a liberar: ${c.bold}${c.green}${formatBytes(totalBase64Bytes)}${c.reset}`);
    hr();

    // ─── Execução ─────────────────────────────────────────────────────────────
    if (DRY_RUN) {
        log('');
        logWarn('Dry-run concluído. Nenhuma alteração foi feita.');
        logInfo(`Para aplicar, rode: ${c.bold}node scripts/migrate-remove-base64.js --confirm${c.reset}`);
    } else {
        logSection('4. Removendo campo dados...');
        hr();

        const ids = elegiveis.map(d => d._id);

        const result = await collection.updateMany(
            { _id: { $in: ids } },
            { $unset: { dados: '' } }
        );

        logOk(`${result.modifiedCount} documento(s) atualizados.`);

        // ─── Verificação pós-operação ─────────────────────────────────────────
        logSection('5. Verificando resultado...');
        const restantes = await collection.countDocuments({ dados: { $exists: true } });

        if (restantes === 0) {
            logOk('Banco limpo — nenhum documento com base64 residual.');
        } else {
            logWarn(`Ainda existem ${restantes} documento(s) com campo 'dados'. Verifique manualmente.`);
        }
    }

    log('');
    await mongoose.disconnect();
    logOk('Desconectado do MongoDB. Migração concluída.');
    log('');
}

run().catch(err => {
    logError(`Erro inesperado: ${err.message}`);
    console.error(err);
    mongoose.disconnect();
    process.exit(1);
});