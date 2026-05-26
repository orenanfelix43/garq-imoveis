import { API_URL } from './config.js';
import { esc, showToast, showConfirm } from './ui-helpers.js';
import { apiFetch } from './api-fetch.js';

// =============================================================================
// ESTADO
// =============================================================================
let clientes      = [];
let imoveis       = [];
let clienteAtual  = null; // cliente aberto no modal de detalhe

// =============================================================================
// INICIALIZAÇÃO
// =============================================================================
async function init() {
    loadUserDisplay();
    setupLogout();
    setupSearch();
    await Promise.all([fetchClientes(), fetchImoveis()]);
    if (window.lucide) lucide.createIcons();
}

function loadUserDisplay() {
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');
    const nameEl   = document.getElementById('user-name-display');
    const roleEl   = document.getElementById('user-role-display');
    if (userName && nameEl) nameEl.textContent = userName;
    if (userRole && roleEl) roleEl.textContent = userRole;
}

function setupLogout() {
    const btn = document.getElementById('logout-btn');
    if (!btn) return;
    btn.onclick = async () => {
        const ok = await showConfirm('Deseja realmente sair do painel?');
        if (!ok) return;
        try { await apiFetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch (_) {}
        localStorage.clear();
        window.location.href = 'login.html';
    };
}

function setupSearch() {
    const input = document.getElementById('search-clientes');
    if (!input) return;
    input.oninput = (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = clientes.filter(c =>
            c.nome.toLowerCase().includes(term) ||
            (c.email || '').toLowerCase().includes(term) ||
            (c.telefone || '').includes(term)
        );
        renderClientes(filtered);
    };
}

// =============================================================================
// FETCH
// =============================================================================
async function fetchClientes() {
    const container = document.getElementById('clientes-list');
    if (container) {
        container.innerHTML = `
            <div class="p-20 text-center flex flex-col items-center gap-3">
                <i data-lucide="loader" class="w-6 h-6 text-gray-600 animate-spin"></i>
                <p class="text-[9px] text-gray-600 uppercase tracking-widest">Conectando ao servidor...</p>
            </div>`;
        if (window.lucide) lucide.createIcons();
    }

    try {
        const res = await apiFetch(`${API_URL}/clientes`, { credentials: 'include' });
        if (res.status === 401) { window.location.href = 'login.html'; return; }
        const result = await res.json();
        if (result.success) {
            clientes = result.data;
            renderClientes(clientes);
            updateStats();
        }
    } catch (err) {
        // Erro de rede (timeout, servidor acordando) — não redireciona para login
        if (container) {
            container.innerHTML = `
                <div class="p-16 text-center flex flex-col items-center gap-4">
                    <i data-lucide="wifi-off" class="w-8 h-8 text-gray-700"></i>
                    <p class="text-[10px] text-gray-500 uppercase tracking-widest">Falha de conexão</p>
                    <button onclick="fetchClientes()" class="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] uppercase tracking-widest text-gray-300 hover:text-white transition-all">
                        Tentar novamente
                    </button>
                </div>`;
            if (window.lucide) lucide.createIcons();
        }
    }
}

async function fetchImoveis() {
    try {
        // Busca com token — retorna todos incluindo ocultos
        const res = await apiFetch(`${API_URL}/imoveis/admin/todos?limit=200`, { credentials: 'include' });
        const result = await res.json();
        if (result.success) imoveis = result.data;
    } catch (_) {}
}

// =============================================================================
// STATS
// =============================================================================
function updateStats() {
    const el = (id) => document.getElementById(id);
    if (el('stat-clientes'))     el('stat-clientes').textContent     = clientes.length;
    if (el('stat-vinculados'))   el('stat-vinculados').textContent   = clientes.filter(c => c.imoveis?.length > 0).length;
    if (el('stat-proprietarios')) el('stat-proprietarios').textContent = clientes.filter(c =>
        c.imoveis?.some(v => v.tipo === 'proprietario')
    ).length;
}

// =============================================================================
// RENDER LISTA
// =============================================================================
function renderClientes(data) {
    const container = document.getElementById('clientes-list');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="p-16 text-center flex flex-col items-center gap-3">
                <i data-lucide="users" class="w-8 h-8 text-gray-700"></i>
                <p class="text-[10px] text-gray-600 uppercase tracking-widest">Nenhum cliente cadastrado</p>
            </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    container.innerHTML = data.map(c => {
        const qtdImoveis  = c.imoveis?.length || 0;
        const temPropr    = c.imoveis?.some(v => v.tipo === 'proprietario');

        return `
        <div class="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-all group cursor-pointer"
             onclick="abrirDetalhe('${esc(c._id)}')">
            <div class="flex items-center gap-4 min-w-0">
                <div class="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                    <span class="text-xs font-bold text-gold uppercase">${esc(c.nome.charAt(0))}</span>
                </div>
                <div class="min-w-0">
                    <p class="text-sm font-medium text-white truncate">${esc(c.nome)}</p>
                    <div class="flex items-center gap-3 mt-0.5">
                        <p class="text-[9px] text-gray-500 uppercase tracking-widest">${esc(c.telefone)}</p>
                        ${c.email ? `<p class="text-[9px] text-gray-600 truncate max-w-[160px]">${esc(c.email)}</p>` : ''}
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
                ${qtdImoveis > 0 ? `
                    <span class="text-[8px] uppercase tracking-widest font-bold px-2 py-1 rounded border ${temPropr ? 'border-gold/30 bg-gold/10 text-gold' : 'border-white/10 bg-white/5 text-gray-400'}">
                        ${qtdImoveis} imóvel${qtdImoveis > 1 ? 'is' : ''}
                    </span>` : ''}
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="event.stopPropagation(); abrirModalCliente('${esc(c._id)}')"
                        class="p-1.5 rounded text-gold/40 hover:text-gold hover:bg-white/5 transition-all" title="Editar">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="event.stopPropagation(); excluirCliente('${esc(c._id)}', '${esc(c.nome)}')"
                        class="p-1.5 rounded text-red-500/30 hover:text-red-500 hover:bg-red-500/10 transition-all" title="Excluir">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

// =============================================================================
// MODAL CLIENTE (criar / editar)
// =============================================================================
function abrirModalCliente(id = null) {
    document.getElementById('cliente-id').value      = '';
    document.getElementById('cliente-nome').value    = '';
    document.getElementById('cliente-telefone').value = '';
    document.getElementById('cliente-email').value   = '';
    document.getElementById('cliente-notas').value   = '';
    document.getElementById('cliente-erro').classList.add('hidden');
    document.getElementById('modal-cliente-title').textContent = 'Novo Cliente';

    if (id) {
        const c = clientes.find(x => x._id === id);
        if (c) {
            document.getElementById('cliente-id').value       = c._id;
            document.getElementById('cliente-nome').value     = c.nome;
            document.getElementById('cliente-telefone').value = c.telefone;
            document.getElementById('cliente-email').value    = c.email || '';
            document.getElementById('cliente-notas').value    = c.notas || '';
            document.getElementById('modal-cliente-title').textContent = 'Editar Cliente';
        }
    }

    document.getElementById('modal-cliente').classList.replace('hidden', 'flex');
    setTimeout(() => document.getElementById('cliente-nome').focus(), 100);
}

function fecharModalCliente() {
    document.getElementById('modal-cliente').classList.replace('flex', 'hidden');
}

async function salvarCliente() {
    const id       = document.getElementById('cliente-id').value;
    const nome     = document.getElementById('cliente-nome').value.trim();
    const telefone = document.getElementById('cliente-telefone').value.trim();
    const email    = document.getElementById('cliente-email').value.trim();
    const notas    = document.getElementById('cliente-notas').value.trim();
    const erroEl   = document.getElementById('cliente-erro');

    erroEl.classList.add('hidden');

    if (!nome || !telefone) {
        erroEl.textContent = 'Nome e telefone são obrigatórios.';
        erroEl.classList.remove('hidden');
        return;
    }

    try {
        const url    = id ? `${API_URL}/clientes/${id}` : `${API_URL}/clientes`;
        const method = id ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'include',
            body:        JSON.stringify({ nome, telefone, email, notas }),
        });
        if (res.status === 401) { window.location.href = 'login.html'; return; }

        const result = await res.json();
        if (result.success) {
            fecharModalCliente();
            showToast(id ? 'Cliente atualizado.' : 'Cliente criado com sucesso.', 'success');
            await fetchClientes();
        } else {
            erroEl.textContent = result.error || 'Erro ao salvar cliente.';
            erroEl.classList.remove('hidden');
        }
    } catch {
        erroEl.textContent = 'Falha de conexão.';
        erroEl.classList.remove('hidden');
    }
}

async function excluirCliente(id, nome) {
    const ok = await showConfirm(`Excluir o cliente "${nome}" permanentemente?`);
    if (!ok) return;

    try {
        const res = await apiFetch(`${API_URL}/clientes/${id}`, { method: 'DELETE', credentials: 'include' });
        if (res.status === 401) { window.location.href = 'login.html'; return; }
        const result = await res.json();
        if (result.success) {
            showToast('Cliente excluído.', 'success');
            await fetchClientes();
        } else {
            showToast(result.error || 'Erro ao excluir.', 'error');
        }
    } catch {
        showToast('Falha de conexão.', 'error');
    }
}

// =============================================================================
// MODAL DETALHE
// =============================================================================
async function abrirDetalhe(id) {
    try {
        const res = await apiFetch(`${API_URL}/clientes/${id}`, { credentials: 'include' });
        if (res.status === 401) { window.location.href = 'login.html'; return; }

        const result = await res.json();
        if (!result.success) { showToast('Erro ao carregar cliente.', 'error'); return; }

        clienteAtual = result.data;
        renderDetalhe(clienteAtual);
        document.getElementById('modal-detalhe').classList.replace('hidden', 'flex');
        if (window.lucide) lucide.createIcons();
    } catch {
        showToast('Falha de conexão.', 'error');
    }
}

function fecharModalDetalhe() {
    document.getElementById('modal-detalhe').classList.replace('flex', 'hidden');
    clienteAtual = null;
}

function renderDetalhe(c) {
    document.getElementById('detalhe-nome').textContent = c.nome;

    const contato = [c.telefone, c.email].filter(Boolean).join(' · ');
    document.getElementById('detalhe-contato').textContent = contato;

    const notasSection = document.getElementById('detalhe-notas-section');
    const notasEl      = document.getElementById('detalhe-notas');
    if (c.notas) {
        notasEl.textContent = c.notas;
        notasSection.classList.remove('hidden');
    } else {
        notasSection.classList.add('hidden');
    }

    renderVinculos(c.imoveis || []);
}

function editarClienteAtual() {
    if (!clienteAtual) return;
    fecharModalDetalhe();
    abrirModalCliente(clienteAtual._id);
}

// =============================================================================
// VÍNCULOS
// =============================================================================
function renderVinculos(vinculos) {
    const container = document.getElementById('detalhe-vinculos');
    if (!container) return;

    if (!vinculos || vinculos.length === 0) {
        container.innerHTML = `<p class="text-[10px] text-gray-600 uppercase tracking-widest text-center py-6">Nenhum imóvel vinculado</p>`;
        return;
    }

    const tipoStyle = (tipo) => tipo === 'proprietario'
        ? 'text-gold border-gold/30 bg-gold/10'
        : 'text-blue-400 border-blue-400/30 bg-blue-400/10';

    const tipoLabel = (tipo) => tipo === 'proprietario' ? 'Proprietário' : 'Interessado';

    container.innerHTML = vinculos.map(v => {
        const imovel = v.imovelId;
        if (!imovel) return '';

        const imgUrl = imovel.galeria?.[0]?.url || 'assets/placeholder.webp';

        return `
        <div class="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 border border-white/10">
                    <img src="${esc(imgUrl)}" class="w-full h-full object-cover" onerror="this.src='assets/placeholder.webp'">
                </div>
                <div class="min-w-0">
                    <p class="text-xs font-medium text-white truncate">${esc(imovel.titulo)}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                        <p class="text-[9px] text-gray-500 uppercase tracking-widest truncate">${esc(imovel.subtitulo)}</p>
                        <span class="text-[7px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${tipoStyle(v.tipo)}">${tipoLabel(v.tipo)}</span>
                    </div>
                    ${v.observacao ? `<p class="text-[9px] text-gray-600 italic mt-0.5 truncate">${esc(v.observacao)}</p>` : ''}
                </div>
            </div>
            <button onclick="removerVinculo('${esc(v._id)}')"
                class="p-1.5 rounded text-red-500/30 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0" title="Remover vínculo">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
        </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

// =============================================================================
// MODAL VINCULAR IMÓVEL
// =============================================================================
function abrirModalVinculo() {
    const select = document.getElementById('vinculo-imovel');
    const radio  = document.querySelector('input[name="vinculo-tipo"][value="interessado"]');
    const obs    = document.getElementById('vinculo-obs');
    const erro   = document.getElementById('vinculo-erro');

    if (radio)  radio.checked    = true;
    if (obs)    obs.value        = '';
    if (erro)   erro.classList.add('hidden');

    // Popular select com imóveis disponíveis
    const vinculadosIds = new Set(clienteAtual?.imoveis?.map(v => v.imovelId?._id || v.imovelId) || []);
    select.innerHTML = '<option value="">— Selecione um imóvel —</option>' +
        imoveis
            .filter(im => !vinculadosIds.has(im._id))
            .map(im => `<option value="${esc(im._id)}">${esc(im.titulo)} — ${esc(im.subtitulo)}</option>`)
            .join('');

    document.getElementById('modal-vinculo').classList.replace('hidden', 'flex');
}

function fecharModalVinculo() {
    document.getElementById('modal-vinculo').classList.replace('flex', 'hidden');
}

async function confirmarVinculo() {
    const imovelId  = document.getElementById('vinculo-imovel').value;
    const tipo      = document.querySelector('input[name="vinculo-tipo"]:checked')?.value || 'interessado';
    const observacao = document.getElementById('vinculo-obs').value.trim();
    const erroEl    = document.getElementById('vinculo-erro');

    erroEl.classList.add('hidden');

    if (!imovelId) {
        erroEl.textContent = 'Selecione um imóvel.';
        erroEl.classList.remove('hidden');
        return;
    }

    try {
        const res = await apiFetch(`${API_URL}/clientes/${clienteAtual._id}/vinculos`, {
            method:      'POST',
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'include',
            body:        JSON.stringify({ imovelId, tipo, observacao }),
        });
        if (res.status === 401) { window.location.href = 'login.html'; return; }

        const result = await res.json();
        if (result.success) {
            fecharModalVinculo();
            clienteAtual = result.data;
            renderDetalhe(clienteAtual);
            // Atualizar na lista local
            const idx = clientes.findIndex(c => c._id === clienteAtual._id);
            if (idx !== -1) clientes[idx] = clienteAtual;
            updateStats();
            renderClientes(clientes);
            showToast('Imóvel vinculado com sucesso.', 'success');
        } else {
            erroEl.textContent = result.error || 'Erro ao vincular.';
            erroEl.classList.remove('hidden');
        }
    } catch {
        erroEl.textContent = 'Falha de conexão.';
        erroEl.classList.remove('hidden');
    }
}

async function removerVinculo(vinculoId) {
    const ok = await showConfirm('Remover este vínculo?');
    if (!ok) return;

    try {
        const res = await apiFetch(`${API_URL}/clientes/${clienteAtual._id}/vinculos/${vinculoId}`, {
            method: 'DELETE', credentials: 'include',
        });
        if (res.status === 401) { window.location.href = 'login.html'; return; }

        const result = await res.json();
        if (result.success) {
            clienteAtual = result.data;
            renderDetalhe(clienteAtual);
            const idx = clientes.findIndex(c => c._id === clienteAtual._id);
            if (idx !== -1) clientes[idx] = clienteAtual;
            updateStats();
            renderClientes(clientes);
            showToast('Vínculo removido.', 'success');
        } else {
            showToast(result.error || 'Erro ao remover vínculo.', 'error');
        }
    } catch {
        showToast('Falha de conexão.', 'error');
    }
}

// =============================================================================
// ESCOPO GLOBAL
// =============================================================================
window.abrirModalCliente   = abrirModalCliente;
window.fecharModalCliente  = fecharModalCliente;
window.salvarCliente       = salvarCliente;
window.excluirCliente      = excluirCliente;
window.abrirDetalhe        = abrirDetalhe;
window.fecharModalDetalhe  = fecharModalDetalhe;
window.editarClienteAtual  = editarClienteAtual;
window.abrirModalVinculo   = abrirModalVinculo;
window.fecharModalVinculo  = fecharModalVinculo;
window.confirmarVinculo    = confirmarVinculo;
window.removerVinculo      = removerVinculo;
window.fetchClientes       = fetchClientes;

document.addEventListener('DOMContentLoaded', init);