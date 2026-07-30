const ALLOWED = new Map([
    ['application/pdf', { extensions: ['pdf'], signatures: [Buffer.from('%PDF-')] }],
    ['application/msword', { extensions: ['doc'], signatures: [Buffer.from([0xD0,0xCF,0x11,0xE0])] }],
    ['application/vnd.ms-excel', { extensions: ['xls'], signatures: [Buffer.from([0xD0,0xCF,0x11,0xE0])] }],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', { extensions: ['docx'], signatures: [Buffer.from('PK\x03\x04','binary')] }],
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', { extensions: ['xlsx'], signatures: [Buffer.from('PK\x03\x04','binary')] }],
    ['text/plain', { extensions: ['txt'], signatures: [] }],
]);
const MAX_BYTES = 10 * 1024 * 1024;
const DATA_URL = /^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/;

function decodeAndValidate({ nome, tipo, dados }) {
    if (typeof nome !== 'string' || typeof tipo !== 'string' || typeof dados !== 'string') throw Object.assign(new Error('Arquivo inválido.'), { status: 400 });
    const rule = ALLOWED.get(tipo);
    const match = DATA_URL.exec(dados);
    const extension = nome.includes('.') ? nome.split('.').pop().toLowerCase() : '';
    if (!rule || !match || match[1] !== tipo || !rule.extensions.includes(extension)) throw Object.assign(new Error('Tipo ou extensão de arquivo não permitido.'), { status: 400 });
    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length || buffer.length > MAX_BYTES) throw Object.assign(new Error('Arquivo vazio ou acima do limite de 10 MB.'), { status: 413 });
    if (rule.signatures.length && !rule.signatures.some(sig => buffer.subarray(0, sig.length).equals(sig))) throw Object.assign(new Error('Assinatura do arquivo não corresponde ao tipo informado.'), { status: 400 });
    if (tipo === 'text/plain' && buffer.includes(0)) throw Object.assign(new Error('Arquivo de texto malformado.'), { status: 400 });
    if (tipo === 'application/pdf') {
        const sample = buffer.toString('latin1').slice(0, 2 * 1024 * 1024);
        if (/\/(JavaScript|JS|OpenAction|AA|Launch|EmbeddedFile)\b/i.test(sample)) throw Object.assign(new Error('PDF com conteúdo ativo não é permitido.'), { status: 400 });
    }
    return { buffer, tamanho: buffer.length, dataUrl: `data:${tipo};base64,${buffer.toString('base64')}` };
}

module.exports = { ALLOWED, MAX_BYTES, decodeAndValidate };
