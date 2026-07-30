import { API_URL } from './config.js';
import { esc, showToast, showConfirm, bindActions, isObjectId } from './ui-helpers.js';
import { apiFetch, getCurrentUser } from './api-fetch.js';

let configs       = [];
let configAtualId = null;
let todosUsuarios = [];

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
    const user = await getCurrentUser('admin');
    if (!user) { window.location.href = 'login.html'; return; }
    loadUserDisplay(user);
    setupLogout();
    bindActions(document, {
        'new-item': data => isObjectId(data.id) && abrirModalNovoItem(data.id),
        'delete-list': data => isObjectId(data.id) && deletarLista(data.id, data.title || ''),
        'toggle-item': data => isObjectId(data.id) && isObjectId(data.itemId) && toggleItem(data.id, data.itemId, data.active === 'true'),
        'remove-item': data => isObjectId(data.id) && isObjectId(data.itemId) && removerItem(data.id, data.itemId),
        'edit-user': data => isObjectId(data.id) && abrirModalEditarUsuario(data.id, data.name || '', data.email || '', data.phone || '', data.role || ''),
        'remove-user': data => isObjectId(data.id) && removerUsuario(data.id, data.name || ''),
        'open-new-user': () => abrirModalNovoUsuario(),
        'close-new-user': () => fecharModalNovoUsuario(),
        'create-user': () => criarUsuario(),
        'open-new-list': () => abrirModalNovaLista(),
        'close-new-list': () => fecharModalNovaLista(),
        'create-list': () => criarLista(),
        'close-new-item': () => fecharModalNovoItem(),
        'add-item': () => adicionarItem(),
        'close-edit-user': () => fecharModalEditarUsuario(),
        'save-user': () => salvarEdicaoUsuario(),
    });
    document.addEventListener('focusout', event => {
        const field = event.target.closest('[data-edit-label]');
        if (field && isObjectId(field.dataset.id) && isObjectId(field.dataset.itemId)) {
            salvarLabelInline(event, field.dataset.id, field.dataset.itemId);
        }
    });
    document.addEventListener('keydown', event => {
        if (event.target.matches('[data-edit-label]') && event.key === 'Enter') {
            event.preventDefault(); event.target.blur();
        }
    });
    await Promise.all([fetchConfigs(), fetchUsuarios()]);
    if (window.lucide) lucide.createIcons();
}

function loadUserDisplay(user) {
    const nameEl   = document.getElementById('user-name-display');
    const roleEl   = document.getElementById('user-role-display');
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role;
}

function setupLogout() {
    const btn = document.getElementById('logout-btn');
    if (!btn) return;
    btn.onclick = async () => {
        const ok = await showConfirm('Deseja realmente sair do painel?');
        if (!ok) return;
        try { await apiFetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch (_) {}
        window.location.href = 'login.html';
    };
}

// =============================================================================
// FETCH & RENDER
// =============================================================================

async function fetchConfigs() {
    const container = document.getElementById('listas-container');
    try {
        const response = await apiFetch(`${API_URL}/configuracoes`, { credentials: 'include' });
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
                    <button data-action="new-item" data-id="${esc(config._id)}"
                        class="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] uppercase tracking-widest text-gray-300 hover:text-white transition-all">
                        <i data-lucide="plus" class="w-3.5 h-3.5"></i> Adicionar Item
                    </button>
                    <button data-action="delete-list" data-id="${esc(config._id)}" data-title="${esc(config.titulo)}"
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
                <button data-action="toggle-item" data-id="${esc(config._id)}" data-item-id="${esc(item._id)}" data-active="${String(!item.ativo)}"
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
                       data-edit-label="true" data-id="${esc(config._id)}" data-item-id="${esc(item._id)}"
                       title="Clique para editar o label">
                        ${esc(item.label)}
                    </p>
                    <p class="text-[9px] text-gray-600 uppercase tracking-widest mt-0.5">valor: ${esc(item.valor)}</p>
                </div>
            </div>
            <button data-action="remove-item" data-id="${esc(config._id)}" data-item-id="${esc(item._id)}"
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
        const response = await apiFetch(`${API_URL}/configuracoes`, {
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
        const response = await apiFetch(`${API_URL}/configuracoes/${id}`, {
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
        const response = await apiFetch(`${API_URL}/configuracoes/${configAtualId}/itens`, {
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
        const response = await apiFetch(`${API_URL}/configuracoes/${configId}/itens/${itemId}`, {
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
        const response = await apiFetch(`${API_URL}/configuracoes/${configId}/itens/${itemId}`, {
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
        const response = await apiFetch(`${API_URL}/configuracoes/${configId}/itens/${itemId}`, {
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

function setupBuscaUsuarios() {
    const input = document.getElementById('search-usuarios');
    if (!input) return;
    input.oninput = (e) => {
        const term = e.target.value.toLowerCase();
        const filtrados = todosUsuarios.filter(u =>
            u.name.toLowerCase().includes(term) ||
            u.email.toLowerCase().includes(term) ||
            u.role.toLowerCase().includes(term)
        );
        const container = document.getElementById('usuarios-container');
        if (container) renderUsuarios(container, filtrados);
    };
}

// =============================================================================
// USUÁRIOS
// =============================================================================

async function fetchUsuarios() {
    const container = document.getElementById('usuarios-container');
    if (!container) return;

    try {
        const response = await apiFetch(`${API_URL}/usuarios`, { credentials: 'include' });
        if (response.status === 401) { window.location.href = 'login.html'; return; }
        if (response.status === 403) {
            container.innerHTML = `<p class="text-[10px] text-gray-600 uppercase tracking-widest text-center p-8">Acesso restrito a administradores.</p>`;
            return;
        }

        const result = await response.json();
        if (result.success) {
            todosUsuarios = result.data;
            renderUsuarios(container, todosUsuarios);
            setupBuscaUsuarios();
            const input = document.getElementById('search-usuarios');
            if (input) input.value = '';
        }
    } catch {
        container.innerHTML = `<p class="text-[10px] text-gray-600 uppercase tracking-widest text-center p-8">Falha ao carregar usuários.</p>`;
    }
}

function renderUsuarios(container, usuarios) {    if (!usuarios || usuarios.length === 0) {
        container.innerHTML = `<p class="text-[10px] text-gray-600 uppercase tracking-widest text-center p-8">Nenhum usuário cadastrado.</p>`;
        return;
    }

    const roleStyle = (role) => {
        if (role === 'admin')    return 'text-gold border-gold/30 bg-gold/10 hover:bg-gold/20';
        if (role === 'cliente')  return 'text-blue-400 border-blue-400/30 bg-blue-400/10 hover:bg-blue-400/20';
        return 'text-gray-400 border-white/10 bg-white/5 hover:bg-white/10';
    };

    container.innerHTML = usuarios.map(u => `
        <div class="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-all group">
            <div class="flex items-center gap-4 min-w-0">
                <div class="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <i data-lucide="${u.role === 'admin' ? 'shield' : u.role === 'cliente' ? 'user-check' : 'user'}" class="w-4 h-4 ${u.role === 'admin' ? 'text-gold' : u.role === 'cliente' ? 'text-blue-400' : 'text-gray-500'}"></i>
                </div>
                <div class="min-w-0">
                    <p class="text-xs font-medium text-white truncate">${esc(u.name)}</p>
                    <p class="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">${esc(u.email)}</p>
                </div>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
                <span class="text-[8px] uppercase tracking-widest font-bold border px-3 py-1.5 rounded ${roleStyle(u.role)}">
                    ${esc(u.role)}
                </span>
                <button data-action="edit-user" data-id="${esc(u._id)}" data-name="${esc(u.name)}" data-email="${esc(u.email)}" data-phone="${esc(u.phone || '')}" data-role="${esc(u.role)}"
                    class="p-1.5 rounded text-gold/40 hover:text-gold hover:bg-white/5 transition-all opacity-0 group-hover:opacity-100" title="Editar usuário">
                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                </button>
                <button data-action="remove-user" data-id="${esc(u._id)}" data-name="${esc(u.name)}"
                    class="p-1.5 rounded text-red-500/30 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100" title="Remover usuário">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            </div>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
}

// =============================================================================
// EDITAR USUÁRIO
// =============================================================================

function abrirModalEditarUsuario(id, nome, email, phone, role) {
    document.getElementById('editar-user-id').value    = id;
    document.getElementById('editar-user-nome').value  = nome;
    document.getElementById('editar-user-email').value = email;
    document.getElementById('editar-user-phone').value = phone;
    // Pré-selecionar o role atual
    const radio = document.querySelector(`input[name="editar-user-role"][value="${role}"]`);
    if (radio) radio.checked = true;
    document.getElementById('editar-user-erro').classList.add('hidden');
    document.getElementById('modal-editar-usuario').classList.replace('hidden', 'flex');
    setTimeout(() => document.getElementById('editar-user-nome')?.focus(), 100);
}

function fecharModalEditarUsuario() {
    document.getElementById('modal-editar-usuario').classList.replace('flex', 'hidden');
}

async function salvarEdicaoUsuario() {
    const id    = document.getElementById('editar-user-id').value;
    const nome  = document.getElementById('editar-user-nome').value.trim();
    const email = document.getElementById('editar-user-email').value.trim();
    const phone = document.getElementById('editar-user-phone').value.trim();
    const role  = document.querySelector('input[name="editar-user-role"]:checked')?.value;
    const erroEl = document.getElementById('editar-user-erro');

    erroEl.classList.add('hidden');

    if (!nome || !email || !phone) {
        erroEl.textContent = 'Todos os campos são obrigatórios.';
        erroEl.classList.remove('hidden');
        return;
    }

    try {
        const response = await apiFetch(`${API_URL}/usuarios/${id}`, {
            method:      'PATCH',
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'include',
            body:        JSON.stringify({ name: nome, email, phone, role }),
        });
        if (response.status === 401) { window.location.href = 'login.html'; return; }

        const result = await response.json();
        if (result.success) {
            fecharModalEditarUsuario();
            showToast('Usuário atualizado com sucesso.', 'success');
            await fetchUsuarios();
        } else {
            erroEl.textContent = result.error || 'Erro ao atualizar usuário.';
            erroEl.classList.remove('hidden');
        }
    } catch {
        erroEl.textContent = 'Falha de conexão.';
        erroEl.classList.remove('hidden');
    }
}

// =============================================================================
// MODAL NOVO USUÁRIO
// =============================================================================
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
        const response = await apiFetch(`${API_URL}/auth/register`, {
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
        const response = await apiFetch(`${API_URL}/usuarios/${id}`, {
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
    const roles = ['user', 'admin', 'cliente'];
    const labels = { user: 'Usuário', admin: 'Admin', cliente: 'Cliente' };

    // Cicla para o próximo role
    const proximoRole = roles[(roles.indexOf(roleAtual) + 1) % roles.length];
    const ok = await showConfirm(`Alterar role para "${labels[proximoRole]}"?`);
    if (!ok) return;

    try {
        const response = await apiFetch(`${API_URL}/usuarios/${id}/role`, {
            method:      'PATCH',
            headers:     { 'Content-Type': 'application/json' },
            credentials: 'include',
            body:        JSON.stringify({ role: proximoRole }),
        });
        if (response.status === 401) { window.location.href = 'login.html'; return; }

        const result = await response.json();
        if (result.success) {
            showToast(`Role alterado para ${proximoRole}.`, 'success');
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
window.toggleItem               = toggleItem;
window.removerItem              = removerItem;
window.abrirModalNovoUsuario    = abrirModalNovoUsuario;
window.fecharModalNovoUsuario   = fecharModalNovoUsuario;
window.criarUsuario             = criarUsuario;
window.removerUsuario           = removerUsuario;
window.alterarRole              = alterarRole;
window.abrirModalEditarUsuario  = abrirModalEditarUsuario;
window.fecharModalEditarUsuario = fecharModalEditarUsuario;
window.salvarEdicaoUsuario      = salvarEdicaoUsuario;

document.addEventListener('DOMContentLoaded', init);
