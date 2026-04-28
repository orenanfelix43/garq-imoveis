import { API_URL } from './config.js';

let tempPhotos = [];
let tempAttrs  = [];
let properties = [];

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML; 
}

function compressImage(file, maxPx = 1280, quality = 0.8) {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ratio  = Math.min(maxPx / img.width, maxPx / img.height, 1);
            canvas.width  = Math.round(img.width  * ratio);
            canvas.height = Math.round(img.height * ratio);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/webp', quality));
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
    });
}

// =============================================================================
// UI HELPERS
// =============================================================================

function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        success: 'check-circle',
        error:   'x-circle',
        warning: 'alert-triangle',
        info:    'info',
    };
    const colors = {
        success: 'border-l-green-500 bg-green-500/10',
        error:   'border-l-red-500 bg-red-500/10',
        warning: 'border-l-yellow-500 bg-yellow-500/10',
        info:    'border-l-[#c5a059] bg-[#c5a059]/10',
    };
    const iconColors = {
        success: 'text-green-400',
        error:   'text-red-400',
        warning: 'text-yellow-400',
        info:    'text-[#c5a059]',
    };

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-start gap-3 px-5 py-4 rounded-sm border border-white/10 border-l-2 backdrop-blur-md ${colors[type]} text-white shadow-2xl max-w-sm w-full translate-x-0 opacity-0 transition-all duration-300`;

    toast.innerHTML = `
        <i data-lucide="${esc(icons[type])}" class="w-4 h-4 mt-0.5 flex-shrink-0 ${esc(iconColors[type])}"></i>
        <p class="text-xs leading-relaxed flex-1 uppercase tracking-widest">${esc(message)}</p>
        <button class="text-gray-500 hover:text-white transition-colors flex-shrink-0" onclick="this.parentElement.remove()">
            <i data-lucide="x" class="w-3 h-3"></i>
        </button>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.remove('opacity-0');
            toast.classList.add('opacity-100');
        });
    });

    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, duration);
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
                    <button id="confirm-cancel" class="flex-1 border border-white/10 py-3 text-xs uppercase tracking-widest text-gray-400 hover:text-white hover:border-white/30 transition-all rounded-sm">
                        Cancelar
                    </button>
                    <button id="confirm-ok" class="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 text-xs uppercase tracking-widest font-bold transition-all rounded-sm">
                        Confirmar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        if (window.lucide) lucide.createIcons();

        overlay.querySelector('#confirm-ok').onclick     = () => { overlay.remove(); resolve(true);  };
        overlay.querySelector('#confirm-cancel').onclick = () => { overlay.remove(); resolve(false); };
    });
}

// =============================================================================
// 1. INICIALIZAÇÃO
// =============================================================================

async function init() {
    loadUserDisplay();
    setupFileInput();
    setupSearch();
    setupForm();   
    setupLogout(); 
    await fetchProperties();
    if (window.lucide) lucide.createIcons();
}

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.oninput = (e) => {
        const term     = e.target.value.toLowerCase();
        const filtered = properties.filter(p =>
            p.titulo.toLowerCase().includes(term) ||
            p.subtitulo.toLowerCase().includes(term)
        );
        renderList(document.getElementById('property-list'), filtered);
    };
}

function loadUserDisplay() {
    const userName    = localStorage.getItem('userName');
    const userRole    = localStorage.getItem('userRole');
    const nameDisplay = document.getElementById('user-name-display');
    const roleDisplay = document.getElementById('user-role-display');
    if (userName && nameDisplay) nameDisplay.textContent = userName;
    if (userRole && roleDisplay) roleDisplay.textContent = userRole;
}

// =============================================================================
// 2. API (READ)
// =============================================================================

async function fetchProperties() {
    const propertyList = document.getElementById('property-list');
    try {
        const response = await fetch(`${API_URL}/imoveis`, {
            credentials: 'include',
        });

        if (response.status === 401) {
            window.location.href = 'login.html';
            return;
        }

        const result = await response.json();
        if (result.success) {
            properties = result.data;
            renderList(propertyList, properties);
            updateStats();
        } else {
            showToast('Erro ao carregar inventário.', 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar inventário:', error);
        showToast('Falha de conexão com o servidor.', 'error');
    }
}

function renderList(container, dataToRender) {
    if (!container) return;

    if (dataToRender.length === 0) {
        container.innerHTML = `
            <div class="p-12 text-center">
                <p class="text-gray-600 text-xs uppercase tracking-widest">Nenhum imóvel cadastrado</p>
            </div>
        `;
        return;
    }

    container.innerHTML = dataToRender.map(p => {
        const rawUrl  = p.galeria?.[0]?.url || 'assets/placeholder.webp';
        const safeUrl = rawUrl.startsWith('http') || rawUrl.startsWith('assets/')
            ? rawUrl
            : 'assets/placeholder.webp';

        return `
            <div class="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-all group">
                <div class="flex items-center gap-6">
                    <div class="w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-white/5">
                        <img src="${esc(safeUrl)}" class="w-full h-full object-cover" onerror="this.src='assets/placeholder.webp'">
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h5 class="font-serif uppercase tracking-widest text-sm">${esc(p.titulo)}</h5>
                            ${p.isDestaque ? '<span class="text-[9px] bg-gold/20 text-gold px-2 py-0.5 rounded border border-gold/30 uppercase font-bold tracking-tighter">Destaque</span>' : ''}
                        </div>
                        <p class="text-[10px] text-gray-500 uppercase tracking-tighter">${esc(p.subtitulo)} | ${esc(p.tipo)}</p>
                    </div>
                </div>
                <div class="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="editItem('${esc(p._id)}')" class="text-gold/50 hover:text-gold transition-colors" title="Editar">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteItem('${esc(p._id)}')" class="text-red-500/50 hover:text-red-500 transition-colors" title="Excluir">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    if (window.lucide) lucide.createIcons();
}

function updateStats() {
    const statTotal = document.getElementById('stat-total');
    if (statTotal) statTotal.textContent = properties.length;
    const highlight     = properties.find(p => p.isDestaque);
    const statHighlight = document.getElementById('stat-highlight');
    if (statHighlight) statHighlight.textContent = highlight ? highlight.titulo : 'Nenhum';
}

// =============================================================================
// 3. CRUD
// =============================================================================

async function editItem(id) {
    try {
        const response = await fetch(`${API_URL}/imoveis/${id}`, {
            credentials: 'include',
        });
        if (!response.ok) {
            showToast('Erro ao carregar dados do imóvel.', 'error');
            return;
        }
        const result = await response.json();
        const item = result.data;
        if (!item) return;

        document.getElementById('form-id').value           = item._id;
        document.getElementById('title').value             = item.titulo;
        document.getElementById('subtitle').value          = item.subtitulo;
        document.getElementById('type').value              = item.tipo.toLowerCase();
        document.getElementById('isHighlight').checked     = item.isDestaque;
        document.getElementById('descricaoLonga').value    = item.descricaoLonga || '';

        tempPhotos = item.galeria ? item.galeria.map(g => ({ src: g.url, public_id: g.public_id })) : [];
        tempAttrs  = item.atributos ? [...item.atributos] : [];

        document.getElementById('modal-title').innerText = 'Editar Propriedade';
        renderPhotoPreview();
        renderAttributes();
        document.getElementById('modal').classList.replace('hidden', 'flex');
    } catch (error) {
        showToast('Falha de conexão ao carregar imóvel.', 'error');
    }
}

async function deleteItem(id) {
    const confirmed = await showConfirm('Excluir este ativo permanentemente?');
    if (!confirmed) return;

    try {
        const response = await fetch(`${API_URL}/imoveis/${id}`, {
            method:      'DELETE',
            credentials: 'include',
        });
        if (response.ok) {
            showToast('Ativo removido com sucesso.', 'success');
            await fetchProperties();
        } else {
            const err = await response.json().catch(() => ({}));
            showToast(err.error || 'Erro ao excluir. Tente novamente.', 'error');
        }
    } catch (error) {
        showToast('Falha de conexão com o servidor.', 'error');
    }
}

function setupForm() {
    const form = document.getElementById('property-form');
    if (!form) return;

    form.onsubmit = async function (e) {
        e.preventDefault();
        const id        = document.getElementById('form-id').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');

        submitBtn.disabled    = true;
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Processando...';

        const data = {
            titulo:         document.getElementById('title').value,
            subtitulo:      document.getElementById('subtitle').value,
            tipo:           document.getElementById('type').value,
            descricaoLonga: document.getElementById('descricaoLonga').value,
            galeria:        tempPhotos.map(p => ({ url: p.src, public_id: p.public_id })),
            atributos:      tempAttrs.filter(a => a.label && a.value),
            isDestaque:     document.getElementById('isHighlight').checked,
        };

        const method = id ? 'PUT' : 'POST';
        const url    = id ? `${API_URL}/imoveis/${id}` : `${API_URL}/imoveis`;

        try {
            const response = await fetch(url, {
                method,
                headers:     { 'Content-Type': 'application/json' },
                credentials: 'include',
                body:        JSON.stringify(data),
            });

            if (response.status === 401) {
                window.location.href = 'login.html';
                return;
            }

            if (response.ok) {
                closeModal();
                showToast(id ? 'Ativo atualizado com sucesso.' : 'Novo ativo cadastrado com sucesso.', 'success');
                await fetchProperties();
            } else {
                const errResult = await response.json().catch(() => ({}));
                showToast(errResult.error || 'Falha na comunicação com o servidor.', 'error');
            }
        } catch (error) {
            showToast('Erro de conexão. Verifique se o servidor está ativo.', 'error');
        } finally {
            submitBtn.disabled    = false;
            submitBtn.textContent = originalBtnText;
        }
    };
}

// =============================================================================
// 4. AUXILIARES DE INTERFACE
// =============================================================================

function openModal(mode) {
    document.getElementById('property-form').reset();
    document.getElementById('form-id').value = '';
    tempPhotos = [];
    tempAttrs  = [];
    if (mode === 'add') document.getElementById('modal-title').innerText = 'Adicionar Imóvel';
    renderPhotoPreview();
    renderAttributes();
    document.getElementById('modal').classList.replace('hidden', 'flex');
}

function closeModal() {
    document.getElementById('modal').classList.replace('flex', 'hidden');
}

function setupFileInput() {
    const fileInput = document.getElementById('file-input');
    if (!fileInput) return;
    fileInput.onchange = async (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
            const compressed = await compressImage(file);
            if (compressed) {
                tempPhotos.push({ src: compressed, public_id: null });
                renderPhotoPreview();
            }
        }
        fileInput.value = '';
    };
}

function renderPhotoPreview() {
    const grid = document.getElementById('photo-preview-grid');
    if (!grid) return;
    grid.innerHTML = tempPhotos.map((photo, index) => `
        <div class="relative w-24 h-24 border border-white/10 rounded overflow-hidden">
            <img src="${esc(photo.src)}" class="w-full h-full object-cover" onerror="this.src='assets/placeholder.webp'">
            <button type="button" onclick="removePhoto(${index})" class="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
        </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
}

function removePhoto(index) {
    tempPhotos.splice(index, 1);
    renderPhotoPreview();
}

function addAttrRow() {
    const newAttr = { label: '', value: '' };
    tempAttrs.push(newAttr);

    const container = document.getElementById('attributes-container');
    if (container) {
        const index = tempAttrs.length - 1;
        const row   = createRowElement(newAttr, index);
        container.appendChild(row);
        if (window.lucide) lucide.createIcons();
    }
}

function createRowElement(attr, index) {
    const div     = document.createElement('div');
    div.className = 'flex gap-2 mb-2';
    div.innerHTML = `
        <input type="text" class="bg-black/40 border border-white/10 p-2 text-xs flex-1 rounded"
               placeholder="Rótulo" value="${esc(attr.label)}">
        <input type="text" class="bg-black/40 border border-white/10 p-2 text-xs flex-1 rounded"
               placeholder="Valor" value="${esc(attr.value)}">
        <button type="button" class="text-red-500 hover:text-red-400 transition-colors">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
    `;

    const [inputLabel, inputValue] = div.querySelectorAll('input');
    inputLabel.oninput = (e) => { tempAttrs[index].label = e.target.value; };
    inputValue.oninput = (e) => { tempAttrs[index].value = e.target.value; };

    div.querySelector('button').onclick = () => {
        tempAttrs.splice(index, 1);
        renderAttributes();
    };

    return div;
}

function renderAttributes() {
    const container = document.getElementById('attributes-container');
    if (!container) return;
    container.innerHTML = '';
    tempAttrs.forEach((attr, index) => {
        container.appendChild(createRowElement(attr, index));
    });
    if (window.lucide) lucide.createIcons();
}

// =============================================================================
// 5. LOGOUT
// =============================================================================

function setupLogout() {
    const logoutBtn = document.querySelector('button.text-red-400');
    if (!logoutBtn) return;

    logoutBtn.onclick = async () => {
        const confirmed = await showConfirm('Deseja realmente sair do painel?');
        if (!confirmed) return;

        try {
            await fetch(`${API_URL}/auth/logout`, {
                method:      'POST',
                credentials: 'include',
            });
        } catch (_) {
        } finally {
            localStorage.clear();
            window.location.href = 'login.html';
        }
    };
}

// =============================================================================
// 6. ESCOPO GLOBAL
// =============================================================================

window.editItem    = editItem;
window.deleteItem  = deleteItem;
window.openModal   = openModal;
window.closeModal  = closeModal;
window.addAttrRow  = addAttrRow;
window.removePhoto = removePhoto;

document.addEventListener('DOMContentLoaded', init);