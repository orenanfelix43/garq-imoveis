import { API_URL } from './config.js';

let configs       = [];
let configAtualId = null; // id da lista aberta no modal de novo item

// =============================================================================
// HELPERS
// =============================================================================

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
}

function slugify(str) {
    return str.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
}

function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const colors = {
        success: 'border-l-green-500 bg-green-500/10',
        error:   'border-l-red-500 bg-red-500/10',
        info:    'border-l-[#c5a059] bg-[#c5a059]/10',
    };
    const icons = { success: 'check-circle', error: 'x-circle', info: 'info' };
    const iconColors = { success: 'text-green-400', error: 'text-red-400', info: 'text-[#c5a059]' };
    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-start gap-3 px-5 py-4 rounded-sm border border-white/10 border-l-2 backdrop-blur-md ${colors[type]} text-white shadow-2xl max-w-sm w-full opacity-0 transition-all duration-300`;
    toast.innerHTML = `
        <i data-lucide="${icons[type]}" class="w-4 h-4 mt-0.5 flex-shrink-0 ${iconColors[type]}"></i>
        <p class="text-xs leading-relaxed flex-1 uppercase tracking-widest">${esc(message)}</p>
        <button class="text-gray-500 hover:text-white" onclick="this.parentElement.remove()">
            <i data-lucide="x" class="w-3 h-3"></i>
        </button>`;
    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.replace('opacity-0', 'opacity-100')));
    setTimeout(() => { toast.classList.add('opacity-0'); setTimeout(() => toast.remove(), 300); }, duration);
}

function showConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998] flex items-center justify-center p-4';
        overlay.innerHTML = `
            <div class="bg-[#111] border border-white/10 rounded-sm p-8 max-w-sm w-full shadow-2xl">
                <div class="flex items-center gap-3 mb-6">
                    <i data-lucide="alert-triangle" class="w-5 h-5 text-yellow-500 flex-shrink-0"></i>
                    <p class="text-sm uppercase tracking-widest text-white/80">${esc(message)}</p>
                </div>
                <div class="flex gap-3">
                    <button id="confirm-cancel" class="flex-1 border border-white/10 py-3 text-xs uppercase tracking-widest text-gray-400 hover:text-white transition-all rounded-sm">Cancelar</button>
                    <button id="confirm-ok" class="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 text-xs uppercase tracking-widest font-bold transition-all rounded-sm">Confirmar</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        if (window.lucide) lucide.createIcons();
        overlay.querySelector('#confirm-ok').onclick     = () => { overlay.remove(); resolve(true); };
        overlay.querySelector('#confirm-cancel').onclick = () => { overlay.remove(); resolve(false); };
    });
}

// =============================================================================
// INICIALIZAÇÃO
// =============================================================================

async function init() {
    loadUserDisplay();
    setupLogout();
    await fetchConfigs();
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
        try { await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch (_) {}
        localStorage.clear();
        window.location.href = 'login.html';
    };
}

// =============================================================================
// FETCH & RENDER
// =============================================================================

async function fetchConfigs() {
    const container = document.getElementById('listas-container');
    try {
        const response = await fetch(`${API_URL}/configuracoes`, { credentials: 'include' });
        if (response.status === 401) { window.location.href = 'login.html'; return; }
        const result = await response.json();
        if (result.success) {
            configs = result.data;
            renderConfigs(container, configs);
        } else {
            container.innerHTML = `<p class="text-xs text-gray-500 text-center p-12 uppercase tracking-widest">Erro ao carregar configurações.</p>`;
        }
    } catch {
        container.innerHTML = `<p class="text-xs text-gray-500 text-center p-12 uppercase tracking-widest">Falha de conexão.</p>`;
    }
}

function renderConfigs(container, data) {
    if (!data || data.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-500 text-center p-12 uppercase tracking-widest">Nenhuma lista cadastrada.</p>`;
        return;
    }

    container.innerHTML = data.map(config => `
        <div class="glass-panel rounded-2xl overflow-hidden shadow-xl">

            <!-- Header da lista -->
            <div class="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div>
                    <h4 class="font-serif text-sm uppercase tracking-widest">${esc(config.titulo)}</h4>
                    <p class="text-[9px] text-gray-500 uppercase tracking-widest mt-1">
                        <span class="text-gold/60">${esc(config.chave)}</span>
                        ${config.descricao ? ` · ${esc(config.descricao)}` : ''}
                    </p>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="abrirModalNovoItem('${esc(config._id)}')"
                        class="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] uppercase tracking-widest text-gray-300 hover:text-white transition-all">
                        <i data-lucide="plus" class="w-3.5 h-3.5"></i> Adicionar Item
                    </button>
                    <button onclick="deletarLista('${esc(config._id)}', '${esc(config.titulo)}')"
                        class="p-2 rounded-lg text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all" title="Excluir lista">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>

            <!-- Itens da lista -->
            <div class="divide-y divide-white/5" id="itens-${esc(config._id)}">
                ${renderItens(config)}
            </div>

        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
}

function renderItens(config) {
    if (!config.itens || config.itens.length === 0) {
        return `<div class="p-8 text-center">
            <p class="text-[10px] text-gray-600 uppercase tracking-widest">Nenhum item cadastrado — clique em "Adicionar Item"</p>
        </div>`;
    }

    return config.itens.map(item => `
        <div class="flex items-center justify-between px-6 py-3 hover:bg-white/[0.02] transition-all group" id="item-row-${esc(item._id)}">
            <div class="flex items-center gap-4 min-w-0">
                <!-- Toggle ativo/inativo -->
                <button onclick="toggleItem('${esc(config._id)}', '${esc(item._id)}', ${!item.ativo})"
                    class="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0
                    ${item.ativo ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-white/5 text-gray-600 hover:bg-white/10'}"
                    title="${item.ativo ? 'Ativo — clique para desativar' : 'Inativo — clique para ativar'}">
                    <i data-lucide="${item.ativo ? 'check' : 'minus'}" class="w-3.5 h-3.5"></i>
                </button>
                <div class="min-w-0">
                    <!-- Label editável inline -->
                    <p class="text-xs font-medium text-white ${!item.ativo ? 'line-through text-gray-500' : ''}"
                       contenteditable="true"
                       spellcheck="false"
                       onblur="salvarLabelInline(event, '${esc(config._id)}', '${esc(item._id)}')"
                       onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}"
                       title="Clique para editar o label">
                        ${esc(item.label)}
                    </p>
                    <p class="text-[9px] text-gray-600 uppercase tracking-widest mt-0.5">valor: ${esc(item.valor)}</p>
                </div>
            </div>
            <button onclick="removerItem('${esc(config._id)}', '${esc(item._id)}')"
                class="p-1.5 rounded text-red-500/30 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0" title="Remover item">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
        </div>
    `).join('');
}

// =============================================================================
// MODAL NOVA LISTA
// =============================================================================

function abrirModalNovaLista() {
    document.getElementById('nova-lista-titulo').value    = '';
    document.getElementById('nova-lista-descricao').value = '';
    document.getElementById('modal-nova-lista').classList.replace('hidden', 'flex');
    setTimeout(() => document.getElementById('nova-lista-titulo').focus(), 100);
}

function fecharModalNovaLista() {
    document.getElementById('modal-nova-lista').classList.replace('flex', 'hidden');
}

async function criarLista() {
    const titulo    = document.getElementById('nova-lista-titulo').value.trim();
    const descricao = document.getElementById('nova-lista-descricao').value.trim();

    if (!titulo) { showToast('Informe o título da lista.', 'error'); return; }

    try {
        const response = await fetch(`${API_URL}/configuracoes`, {
            method:      'POST',
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'include',
            body:        JSON.stringify({ chave: slugify(titulo), titulo, descricao }),
        });
        if (response.status === 401) { window.location.href = 'login.html'; return; }
        const result = await response.json();
        if (result.success) {
            fecharModalNovaLista();
            showToast('Lista criada com sucesso.', 'success');
            await fetchConfigs();
        } else {
            showToast(result.error || 'Erro ao criar lista.', 'error');
        }
    } catch {
        showToast('Falha de conexão.', 'error');
    }
}

async function deletarLista(id, titulo) {
    const ok = await showConfirm(`Excluir a lista "${titulo}" permanentemente?`);
    if (!ok) return;
    try {
        const response = await fetch(`${API_URL}/configuracoes/${id}`, {
            method: 'DELETE', credentials: 'include',
        });
        if (response.status === 401) { window.location.href = 'login.html'; return; }
        const result = await response.json();
        if (result.success) {
            showToast('Lista removida.', 'success');
            await fetchConfigs();
        } else {
            showToast(result.error || 'Erro ao remover lista.', 'error');
        }
    } catch {
        showToast('Falha de conexão.', 'error');
    }
}

// =============================================================================
// MODAL NOVO ITEM
// =============================================================================

function abrirModalNovoItem(configId) {
    configAtualId = configId;
    document.getElementById('novo-item-label').value = '';
    document.getElementById('novo-item-valor').value = '';
    document.getElementById('modal-novo-item').classList.replace('hidden', 'flex');
    setTimeout(() => document.getElementById('novo-item-label').focus(), 100);

    // Gerar valor automaticamente a partir do label
    document.getElementById('novo-item-label').oninput = (e) => {
        const valorInput = document.getElementById('novo-item-valor');
        if (!valorInput._editado) valorInput.value = slugify(e.target.value);
    };
    document.getElementById('novo-item-valor').oninput = (e) => {
        e.target._editado = e.target.value.length > 0;
    };
}

function fecharModalNovoItem() {
    document.getElementById('modal-novo-item').classList.replace('flex', 'hidden');
    configAtualId = null;
}

async function adicionarItem() {
    const label = document.getElementById('novo-item-label').value.trim();
    const valor = document.getElementById('novo-item-valor').value.trim() || slugify(label);

    if (!label) { showToast('Informe o label do item.', 'error'); return; }
    if (!configAtualId) return;

    try {
        const response = await fetch(`${API_URL}/configuracoes/${configAtualId}/itens`, {
            method:      'POST',
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'include',
            body:        JSON.stringify({ label, valor }),
        });
        if (response.status === 401) { window.location.href = 'login.html'; return; }
        const result = await response.json();
        if (result.success) {
            fecharModalNovoItem();
            showToast('Item adicionado.', 'success');
            await fetchConfigs();
        } else {
            showToast(result.error || 'Erro ao adicionar item.', 'error');
        }
    } catch {
        showToast('Falha de conexão.', 'error');
    }
}

// =============================================================================
// AÇÕES NOS ITENS
// =============================================================================

async function salvarLabelInline(event, configId, itemId) {
    const novoLabel = event.target.textContent.trim();
    if (!novoLabel) return;
    try {
        const response = await fetch(`${API_URL}/configuracoes/${configId}/itens/${itemId}`, {
            method:      'PATCH',
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'include',
            body:        JSON.stringify({ label: novoLabel }),
        });
        if (response.status === 401) { window.location.href = 'login.html'; return; }
        const result = await response.json();
        if (!result.success) showToast('Erro ao salvar.', 'error');
        else showToast('Label atualizado.', 'success');
    } catch {
        showToast('Falha de conexão.', 'error');
    }
}

async function toggleItem(configId, itemId, novoAtivo) {
    try {
        const response = await fetch(`${API_URL}/configuracoes/${configId}/itens/${itemId}`, {
            method:      'PATCH',
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'include',
            body:        JSON.stringify({ ativo: novoAtivo }),
        });
        if (response.status === 401) { window.location.href = 'login.html'; return; }
        const result = await response.json();
        if (result.success) {
            showToast(novoAtivo ? 'Item ativado.' : 'Item desativado.', 'success');
            await fetchConfigs();
        } else {
            showToast(result.error || 'Erro ao atualizar item.', 'error');
        }
    } catch {
        showToast('Falha de conexão.', 'error');
    }
}

async function removerItem(configId, itemId) {
    const ok = await showConfirm('Remover este item da lista?');
    if (!ok) return;
    try {
        const response = await fetch(`${API_URL}/configuracoes/${configId}/itens/${itemId}`, {
            method: 'DELETE', credentials: 'include',
        });
        if (response.status === 401) { window.location.href = 'login.html'; return; }
        const result = await response.json();
        if (result.success) {
            showToast('Item removido.', 'success');
            await fetchConfigs();
        } else {
            showToast(result.error || 'Erro ao remover item.', 'error');
        }
    } catch {
        showToast('Falha de conexão.', 'error');
    }
}

// =============================================================================
// ESCOPO GLOBAL
// =============================================================================

window.abrirModalNovaLista  = abrirModalNovaLista;
window.fecharModalNovaLista = fecharModalNovaLista;
window.criarLista           = criarLista;
window.deletarLista         = deletarLista;
window.abrirModalNovoItem   = abrirModalNovoItem;
window.fecharModalNovoItem  = fecharModalNovoItem;
window.adicionarItem        = adicionarItem;
window.salvarLabelInline    = salvarLabelInline;
window.toggleItem           = toggleItem;
window.removerItem          = removerItem;

document.addEventListener('DOMContentLoaded', init);