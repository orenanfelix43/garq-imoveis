import { API_URL } from './config.js';
import { esc, showToast, showConfirm, bindActions, isObjectId } from './ui-helpers.js';
import { apiFetch, getCurrentUser } from './api-fetch.js';

// =============================================================================
// ESTADO
// =============================================================================
let clienteData   = null;
let vinculoAtual  = null; // vínculo com documentos aberto

// =============================================================================
// INICIALIZAÇÃO
// =============================================================================
async function init() {
    const user = await getCurrentUser('cliente');
    if (!user) { window.location.href = 'login.html'; return; }
    loadUserDisplay(user);
    setupLogout();
    bindActions(document, {
        'fetch-area': () => fetchMinhaArea(),
        'open-documents': data => isObjectId(data.id) && abrirDocumentos(data.id, data.title || ''),
        'send-comment': data => isObjectId(data.clientId) && isObjectId(data.linkId) && enviarComentario(data.clientId, data.linkId),
        'delete-comment': data => isObjectId(data.clientId) && isObjectId(data.linkId) && isObjectId(data.commentId) && excluirComentario(data.clientId, data.linkId, data.commentId),
        'close-documents': () => fecharModalDocs(),
    });
    await fetchMinhaArea();
    if (window.lucide) lucide.createIcons();
}

function loadUserDisplay(user) {
    const nameEl = document.getElementById('user-name-display');
    if (nameEl) nameEl.textContent = user.name;
}

function setupLogout() {
    const btn = document.getElementById('logout-btn');
    if (!btn) return;
    btn.onclick = async () => {
        try { await apiFetch(`${API_URL}/auth/logout`, { method: 'POST' }); } catch (_) {}
        window.location.href = 'login.html';
    };
}

// =============================================================================
// FETCH
// =============================================================================
async function fetchMinhaArea() {
    const container = document.getElementById('imoveis-container');

    try {
        const res = await apiFetch(`${API_URL}/clientes/minha-area`, { credentials: 'include' });
        if (res.status === 401) { window.location.href = 'login.html'; return; }

        const result = await res.json();

        if (!result.success) {
            container.innerHTML = `
                <div class="glass-panel rounded-2xl p-16 text-center flex flex-col items-center gap-4">
                    <i data-lucide="inbox" class="w-12 h-12 text-gray-700"></i>
                    <p class="text-sm text-gray-500 uppercase tracking-widest">Nenhum imóvel vinculado ao seu portfólio</p>
                    <p class="text-[10px] text-gray-600 uppercase tracking-widest">Entre em contato com a GARQ para mais informações</p>
                </div>`;
            if (window.lucide) lucide.createIcons();
            return;
        }

        clienteData = result.data;
        renderPortfolio(clienteData);

    } catch {
        container.innerHTML = `
            <div class="glass-panel rounded-2xl p-16 text-center flex flex-col items-center gap-4">
                <i data-lucide="wifi-off" class="w-10 h-10 text-gray-700"></i>
                <p class="text-[10px] text-gray-500 uppercase tracking-widest">Falha de conexão</p>
                <button data-action="fetch-area" class="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] uppercase tracking-widest text-gray-300 transition-all">
                    Tentar novamente
                </button>
            </div>`;
        if (window.lucide) lucide.createIcons();
    }
}

// =============================================================================
// RENDER PORTFÓLIO
// =============================================================================
function renderPortfolio(cliente) {
    const container = document.getElementById('imoveis-container');

    if (!cliente.imoveis || cliente.imoveis.length === 0) {
        container.innerHTML = `
            <div class="glass-panel rounded-2xl p-16 text-center flex flex-col items-center gap-4">
                <i data-lucide="inbox" class="w-12 h-12 text-gray-700"></i>
                <p class="text-sm text-gray-500 uppercase tracking-widest">Nenhum imóvel vinculado</p>
                <p class="text-[10px] text-gray-600 uppercase tracking-widest">Entre em contato com a GARQ</p>
            </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    container.innerHTML = cliente.imoveis.map(vinculo => {
        const imovel = vinculo.imovelId;
        if (!imovel) return '';

        const imgUrl = imovel.galeria?.[0]?.url || 'assets/placeholder.webp';

        const tipoStyle = vinculo.tipo === 'proprietario'
            ? 'border-gold/40 bg-gold/10 text-gold'
            : 'border-blue-400/30 bg-blue-400/10 text-blue-400';
        const tipoLabel = vinculo.tipo === 'proprietario' ? 'Proprietário' : 'Interessado';

        const atributos = imovel.atributos || [];
        const comentarios = vinculo.comentarios || [];

        return `
        <div class="glass-panel rounded-2xl overflow-hidden shadow-xl">

            <!-- Imagem + info principal -->
            <div class="flex flex-col md:flex-row">
                <div class="md:w-72 h-56 md:h-auto overflow-hidden flex-shrink-0">
                    <img src="${esc(imgUrl)}" alt="${esc(imovel.titulo)}"
                         class="w-full h-full object-cover"
                         data-fallback="true">
                </div>
                <div class="flex-1 p-8">
                    <div class="flex items-start justify-between gap-4 mb-4">
                        <div>
                            <span class="text-[8px] uppercase tracking-widest font-bold border px-2 py-1 rounded ${tipoStyle}">${tipoLabel}</span>
                            <h2 class="font-serif text-2xl mt-3 mb-1">${esc(imovel.titulo)}</h2>
                            <p class="text-[10px] text-gold uppercase tracking-widest">${esc(imovel.subtitulo)}</p>
                        </div>
                        <div class="flex gap-2 flex-shrink-0">
                            ${imovel.status ? `<span class="text-[8px] uppercase tracking-widest font-bold px-2 py-1 rounded border border-white/10 bg-white/5 text-gray-400">${esc(imovel.status.replace(/_/g, ' '))}</span>` : ''}
                        </div>
                    </div>

                    ${imovel.descricaoLonga ? `
                    <p class="text-xs text-gray-400 leading-relaxed mb-6 line-clamp-3">${esc(imovel.descricaoLonga)}</p>` : ''}

                    <!-- Atributos -->
                    ${atributos.length > 0 ? `
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pt-4 border-t border-white/5">
                        ${atributos.map(a => `
                        <div>
                            <p class="text-[8px] uppercase tracking-widest text-gray-500 mb-0.5">${esc(a.label)}</p>
                            <p class="text-sm font-medium text-white">${esc(a.value)}</p>
                        </div>`).join('')}
                    </div>` : ''}

                    <!-- Ações -->
                    <div class="flex gap-3 flex-wrap">
                        <button data-action="open-documents" data-id="${esc(imovel._id)}" data-title="${esc(imovel.titulo)}"
                            class="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] uppercase tracking-widest text-gray-300 hover:text-white transition-all">
                            <i data-lucide="file-text" class="w-3.5 h-3.5"></i> Documentos
                        </button>
                    </div>
                </div>
            </div>

            <!-- Observação do vínculo -->
            ${vinculo.observacao ? `
            <div class="px-8 py-4 border-t border-white/5 bg-white/[0.01]">
                <p class="text-[9px] uppercase tracking-widest text-gray-500 mb-1">Observação</p>
                <p class="text-xs text-gray-400 italic">${esc(vinculo.observacao)}</p>
            </div>` : ''}

            <!-- Comentários -->
            <div class="border-t border-white/5">
                <div class="px-8 py-5">
                    <p class="text-[9px] uppercase tracking-[0.3em] text-gray-500 mb-4">
                        Anotações <span class="text-gray-600">(${comentarios.length})</span>
                    </p>

                    <!-- Lista de comentários -->
                    <div id="comentarios-${esc(vinculo._id)}" class="space-y-3 mb-5">
                        ${renderComentarios(comentarios, vinculo._id)}
                    </div>

                    <!-- Input novo comentário -->
                    <div class="flex gap-3">
                        <textarea id="input-comentario-${esc(vinculo._id)}"
                            class="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-white placeholder-gray-600 resize-none focus:border-gold/40 outline-none transition-all"
                            rows="2" placeholder="Adicionar uma anotação sobre este imóvel..."></textarea>
                        <button data-action="send-comment" data-client-id="${esc(cliente._id)}" data-link-id="${esc(vinculo._id)}"
                            class="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-gold/10 hover:bg-gold/20 border border-gold/30 rounded-lg text-[10px] uppercase tracking-widest text-gold transition-all self-end">
                            <i data-lucide="send" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>
            </div>

        </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

function renderComentarios(comentarios, vinculoId) {
    if (!comentarios || comentarios.length === 0) {
        return `<p class="text-[9px] text-gray-700 uppercase tracking-widest">Nenhuma anotação ainda</p>`;
    }

    return comentarios.map(c => {
        const data = new Date(c.createdAt).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        return `
        <div class="flex items-start gap-3 group" id="comentario-${esc(c._id)}">
            <div class="w-7 h-7 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span class="text-[9px] font-bold text-gold uppercase">${esc((c.autorNome || 'U').charAt(0))}</span>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-[9px] font-bold text-white uppercase tracking-widest">${esc(c.autorNome || 'Usuário')}</span>
                    <span class="text-[8px] text-gray-600">${data}</span>
                </div>
                <p class="text-xs text-gray-300 leading-relaxed">${esc(c.texto)}</p>
            </div>
            <button data-action="delete-comment" data-client-id="${esc(clienteData._id)}" data-link-id="${esc(vinculoId)}" data-comment-id="${esc(c._id)}"
                class="opacity-0 group-hover:opacity-100 p-1 rounded text-red-500/40 hover:text-red-500 transition-all flex-shrink-0">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
        </div>`;
    }).join('');
}

// =============================================================================
// COMENTÁRIOS
// =============================================================================
async function enviarComentario(clienteId, vinculoId) {
    const input = document.getElementById(`input-comentario-${vinculoId}`);
    const texto = input?.value.trim();

    if (!texto) { showToast('Digite uma anotação antes de enviar.', 'error'); return; }

    try {
        const res = await apiFetch(`${API_URL}/clientes/${clienteId}/vinculos/${vinculoId}/comentarios`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body:    JSON.stringify({ texto }),
        });
        if (res.status === 401) { window.location.href = 'login.html'; return; }

        const result = await res.json();
        if (result.success) {
            clienteData = result.data;
            input.value = '';
            // Atualizar só a seção de comentários desse vínculo
            const vinculo = result.data.imoveis.find(v => v._id === vinculoId);
            if (vinculo) {
                const container = document.getElementById(`comentarios-${vinculoId}`);
                if (container) {
                    container.innerHTML = renderComentarios(vinculo.comentarios, vinculoId);
                    if (window.lucide) lucide.createIcons();
                }
            }
        } else {
            showToast(result.error || 'Erro ao enviar anotação.', 'error');
        }
    } catch {
        showToast('Falha de conexão.', 'error');
    }
}

async function excluirComentario(clienteId, vinculoId, comentarioId) {
    const ok = await showConfirm('Excluir esta anotação?');
    if (!ok) return;

    try {
        const res = await apiFetch(`${API_URL}/clientes/${clienteId}/vinculos/${vinculoId}/comentarios/${comentarioId}`, {
            method: 'DELETE', credentials: 'include',
        });
        if (res.status === 401) { window.location.href = 'login.html'; return; }

        const result = await res.json();
        if (result.success) {
            clienteData = result.data;
            const vinculo = result.data.imoveis.find(v => v._id === vinculoId);
            if (vinculo) {
                const container = document.getElementById(`comentarios-${vinculoId}`);
                if (container) {
                    container.innerHTML = renderComentarios(vinculo.comentarios, vinculoId);
                    if (window.lucide) lucide.createIcons();
                }
            }
            showToast('Anotação removida.', 'success');
        } else {
            showToast(result.error || 'Erro ao remover.', 'error');
        }
    } catch {
        showToast('Falha de conexão.', 'error');
    }
}

// =============================================================================
// DOCUMENTOS
// =============================================================================
async function abrirDocumentos(imovelId, titulo) {
    document.getElementById('modal-docs-titulo').textContent    = titulo;
    document.getElementById('modal-docs-subtitulo').textContent = 'Documentos disponíveis';
    document.getElementById('modal-docs-lista').innerHTML = `
        <div class="flex items-center justify-center py-8">
            <i data-lucide="loader" class="w-5 h-5 text-gray-600 animate-spin"></i>
        </div>`;
    document.getElementById('modal-docs-cliente').classList.replace('hidden', 'flex');
    if (window.lucide) lucide.createIcons();

    try {
        const res = await apiFetch(`${API_URL}/imoveis/${imovelId}/documentos`, { credentials: 'include' });
        if (res.status === 401) { window.location.href = 'login.html'; return; }

        const result = await res.json();
        renderDocs(result.success ? result.data : []);
    } catch {
        renderDocs([]);
    }
}

function fecharModalDocs() {
    document.getElementById('modal-docs-cliente').classList.replace('flex', 'hidden');
}

function renderDocs(docs) {
    const container = document.getElementById('modal-docs-lista');

    if (!docs || docs.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center gap-3 py-10">
                <i data-lucide="folder-open" class="w-8 h-8 text-gray-700"></i>
                <p class="text-[10px] text-gray-600 uppercase tracking-widest">Nenhum documento disponível</p>
            </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    const iconeDoc = (tipo) => {
        if (tipo === 'application/pdf') return 'file-text';
        if (tipo?.includes('word'))     return 'file-type';
        if (tipo?.includes('excel') || tipo?.includes('spreadsheet')) return 'file-spreadsheet';
        return 'file';
    };

    const corDoc = (tipo) => {
        if (tipo === 'application/pdf') return 'bg-red-500/10 text-red-400';
        if (tipo?.includes('word'))     return 'bg-blue-500/10 text-blue-400';
        if (tipo?.includes('excel') || tipo?.includes('spreadsheet')) return 'bg-green-500/10 text-green-400';
        return 'bg-white/5 text-gray-400';
    };

    const formatBytes = (b) => b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(1)}KB` : `${(b/1048576).toFixed(1)}MB`;

    container.innerHTML = docs.map(doc => `
        <div class="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${corDoc(doc.tipo)}">
                    <i data-lucide="${iconeDoc(doc.tipo)}" class="w-4 h-4"></i>
                </div>
                <div class="min-w-0">
                    <p class="text-xs font-medium text-white truncate max-w-[260px]">${esc(doc.nome)}</p>
                    <p class="text-[9px] text-gray-600 uppercase tracking-widest mt-0.5">${formatBytes(doc.tamanho)} · ${new Date(doc.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
            </div>
            <a href="${esc(doc.downloadPath)}" target="_blank" rel="noopener noreferrer"
                class="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0" title="Baixar">
                <i data-lucide="download" class="w-3.5 h-3.5"></i>
            </a>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
}

// =============================================================================
// ESCOPO GLOBAL
// =============================================================================
window.enviarComentario   = enviarComentario;
window.excluirComentario  = excluirComentario;
window.abrirDocumentos    = abrirDocumentos;
window.fecharModalDocs    = fecharModalDocs;
window.fetchMinhaArea     = fetchMinhaArea;

document.addEventListener('DOMContentLoaded', init);
