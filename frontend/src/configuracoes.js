import { API_URL } from './config.js';
import { esc, showToast, showConfirm } from './ui-helpers.js';

let configs       = [];
let configAtualId = null; // id da lista aberta no modal de novo item

// =============================================================================
// HELPERS
// =============================================================================

function slugify(str) {
    return str.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
}

// =============================================================================
// INICIALIZAÇÃO
// =============================================================================

async function init() {
    loadUserDisplay();
    setupLogout();
    await Promise.all([fetchConfigs(), fetchUsuarios()]);
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
// USUÁRIOS
// =============================================================================

async function fetchUsuarios() {
    const container = document.getElementById('usuarios-container');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/usuarios`, { credentials: 'include' });
        if (response.status === 401) { window.location.href = 'login.html'; return; }
        if (response.status === 403) {
            container.innerHTML = `<p class="text-[10px] text-gray-600 uppercase tracking-widest text-center p-8">Acesso restrito a administradores.</p>`;
            return;
        }

        const result = await response.json();
        if (result.success) renderUsuarios(container, result.data);
    } catch {
        container.innerHTML = `<p class="text-[10px] text-gray-600 uppercase tracking-widest text-center p-8">Falha ao carregar usuários.</p>`;
    }
}

function renderUsuarios(container, usuarios) {
    if (!usuarios || usuarios.length === 0) {
        container.innerHTML = `<p class="text-[10px] text-gray-600 uppercase tracking-widest text-center p-8">Nenhum usuário cadastrado.</p>`;
        return;
    }

    const roleStyle = (role) => role === 'admin'
        ? 'text-gold border-gold/30 bg-gold/10 hover:bg-gold/20'
        : 'text-gray-400 border-white/10 bg-white/5 hover:bg-white/10';

    container.innerHTML = usuarios.map(u => `
        <div class="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-all group">
            <div class="flex items-center gap-4 min-w-0">
                <div class="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <i data-lucide="${u.role === 'admin' ? 'shield' : 'user'}" class="w-4 h-4 ${u.role === 'admin' ? 'text-gold' : 'text-gray-500'}"></i>
                </div>
                <div class="min-w-0">
                    <p class="text-xs font-medium text-white truncate">${esc(u.name)}</p>
                    <p class="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">${esc(u.email)}</p>
                </div>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
                <button onclick="alterarRole('${esc(u._id)}', '${esc(u.role)}')"
                    class="text-[8px] uppercase tracking-widest font-bold border px-3 py-1.5 rounded transition-all cursor-pointer ${roleStyle(u.role)}"
                    title="Clique para ${u.role === 'admin' ? 'rebaixar para usuário' : 'promover a admin'}">
                    ${esc(u.role)}
                </button>
                <button onclick="removerUsuario('${esc(u._id)}', '${esc(u.name)}')"
                    class="p-1.5 rounded text-red-500/30 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100" title="Remover usuário">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            </div>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
}

function abrirModalNovoUsuario() {
    ['novo-user-nome', 'novo-user-email', 'novo-user-phone', 'novo-user-senha'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    // Resetar role para 'user'
    const radioUser = document.querySelector('input[name="novo-user-role"][value="user"]');
    if (radioUser) radioUser.checked = true;

    const erroEl = document.getElementById('novo-user-erro');
    if (erroEl) erroEl.classList.add('hidden');
    document.getElementById('modal-novo-usuario').classList.replace('hidden', 'flex');
    setTimeout(() => document.getElementById('novo-user-nome')?.focus(), 100);
}

function fecharModalNovoUsuario() {
    document.getElementById('modal-novo-usuario').classList.replace('flex', 'hidden');
}

async function criarUsuario() {
    const nome  = document.getElementById('novo-user-nome').value.trim();
    const email = document.getElementById('novo-user-email').value.trim();
    const phone = document.getElementById('novo-user-phone').value.trim();
    const senha = document.getElementById('novo-user-senha').value;
    const role  = document.querySelector('input[name="novo-user-role"]:checked')?.value || 'user';
    const erroEl = document.getElementById('novo-user-erro');

    erroEl.classList.add('hidden');

    if (!nome || !email || !phone || !senha) {
        erroEl.textContent = 'Todos os campos são obrigatórios.';
        erroEl.classList.remove('hidden');
        return;
    }
    if (senha.length < 6) {
        erroEl.textContent = 'A senha deve ter no mínimo 6 caracteres.';
        erroEl.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method:      'POST',
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'include',
            body:        JSON.stringify({ name: nome, email, phone, password: senha, role }),
        });
        if (response.status === 401) { window.location.href = 'login.html'; return; }

        const result = await response.json();
        if (result.success) {
            fecharModalNovoUsuario();
            showToast('Usuário criado com sucesso.', 'success');
            await fetchUsuarios();
        } else {
            erroEl.textContent = result.error || 'Erro ao criar usuário.';
            erroEl.classList.remove('hidden');
        }
    } catch {
        erroEl.textContent = 'Falha de conexão.';
        erroEl.classList.remove('hidden');
    }
}

async function removerUsuario(id, nome) {
    const ok = await showConfirm(`Remover o usuário "${nome}" permanentemente?`);
    if (!ok) return;

    try {
        const response = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'DELETE', credentials: 'include',
        });
        if (response.status === 401) { window.location.href = 'login.html'; return; }

        const result = await response.json();
        if (result.success) {
            showToast('Usuário removido.', 'success');
            await fetchUsuarios();
        } else {
            showToast(result.error || 'Erro ao remover usuário.', 'error');
        }
    } catch {
        showToast('Falha de conexão.', 'error');
    }
}

async function alterarRole(id, roleAtual) {
    const novoRole = roleAtual === 'admin' ? 'user' : 'admin';
    const msg = novoRole === 'admin'
        ? 'Promover este usuário a administrador?'
        : 'Rebaixar este usuário para acesso padrão?';

    const ok = await showConfirm(msg);
    if (!ok) return;

    try {
        const response = await fetch(`${API_URL}/usuarios/${id}/role`, {
            method:      'PATCH',
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'include',
            body:        JSON.stringify({ role: novoRole }),
        });
        if (response.status === 401) { window.location.href = 'login.html'; return; }

        const result = await response.json();
        if (result.success) {
            showToast(`Usuário ${novoRole === 'admin' ? 'promovido a admin' : 'rebaixado para usuário'}.`, 'success');
            await fetchUsuarios();
        } else {
            showToast(result.error || 'Erro ao alterar role.', 'error');
        }
    } catch {
        showToast('Falha de conexão.', 'error');
    }
}

// =============================================================================
// ESCOPO GLOBAL
// =============================================================================

window.abrirModalNovaLista   = abrirModalNovaLista;
window.fecharModalNovaLista  = fecharModalNovaLista;
window.criarLista            = criarLista;
window.deletarLista          = deletarLista;
window.abrirModalNovoItem    = abrirModalNovoItem;
window.fecharModalNovoItem   = fecharModalNovoItem;
window.adicionarItem         = adicionarItem;
window.salvarLabelInline     = salvarLabelInline;
window.toggleItem            = toggleItem;
window.removerItem           = removerItem;
window.abrirModalNovoUsuario  = abrirModalNovoUsuario;
window.fecharModalNovoUsuario = fecharModalNovoUsuario;
window.criarUsuario           = criarUsuario;
window.removerUsuario         = removerUsuario;
window.alterarRole            = alterarRole;

document.addEventListener('DOMContentLoaded', init);