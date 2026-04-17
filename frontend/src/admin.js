/**
 * Lógica do Painel Administrativo - GARQ Imóveis
 * Foco: Agilidade, UX fluida e Sincronização em Tempo Real.
 */

let tempPhotos = [];
let tempAttrs = [];
let properties = []; 

const API_URL = 'http://localhost:5000/api/imoveis';

// --- 1. Inicialização ---
async function init() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    loadUserDisplay();
    setupFileInput();
    setupSearch(); // Adicionado para melhor experiência de gestão
    await fetchProperties(); 
    if (window.lucide) lucide.createIcons();
}

/**
 * Filtro de busca local para agilizar a localização de ativos sem novas requisições
 */
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    searchInput.oninput = (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = properties.filter(p => 
            p.titulo.toLowerCase().includes(term) || 
            p.subtitulo.toLowerCase().includes(term)
        );
        renderList(document.getElementById('property-list'), filtered);
    };
}

function loadUserDisplay() {
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');
    const nameDisplay = document.getElementById('user-name-display');
    const roleDisplay = document.getElementById('user-role-display');
    if (userName && nameDisplay) nameDisplay.textContent = userName;
    if (userRole && roleDisplay) roleDisplay.textContent = userRole;
}

// --- 2. Integração com API (Read) ---
async function fetchProperties() {
    const propertyList = document.getElementById('property-list');
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(API_URL, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (result.success) {
            properties = result.data;
            renderList(propertyList, properties);
            updateStats();
        }
    } catch (error) {
        console.error('Erro ao carregar inventário:', error);
    }
}

function renderList(container, dataToRender) {
    if (!container) return;
    container.innerHTML = dataToRender.map(p => {
        const defaultImg = p.galeria?.[0]?.url || 'assets/placeholder.webp';
        return `
            <div class="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-all group">
                <div class="flex items-center gap-6">
                    <div class="w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-white/5">
                        <img src="${defaultImg}" class="w-full h-full object-cover">
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h5 class="font-serif uppercase tracking-widest text-sm">${p.titulo}</h5>
                            ${p.isDestaque ? '<span class="text-[9px] bg-gold/20 text-gold px-2 py-0.5 rounded border border-gold/30 uppercase font-bold tracking-tighter">Destaque</span>' : ''}
                        </div>
                        <p class="text-[10px] text-gray-500 uppercase tracking-tighter">${p.subtitulo} | ${p.tipo}</p>
                    </div>
                </div>
                <div class="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="editItem('${p._id}')" class="text-gold/50 hover:text-gold transition-colors">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteItem('${p._id}')" class="text-red-500/50 hover:text-red-500 transition-colors">
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
    const highlight = properties.find(p => p.isDestaque);
    const statHighlight = document.getElementById('stat-highlight');
    if (statHighlight) statHighlight.textContent = highlight ? highlight.titulo : 'Nenhum';
}

// --- 3. CRUD Operations (Create, Update, Delete) ---

/**
 * Prepara o modal para edição buscando os dados locais
 */
function editItem(id) {
    const item = properties.find(p => p._id === id);
    if (!item) return;

    document.getElementById('form-id').value = item._id;
    document.getElementById('title').value = item.titulo;
    document.getElementById('subtitle').value = item.subtitulo;
    document.getElementById('type').value = item.tipo.toLowerCase();
    document.getElementById('isHighlight').checked = item.isDestaque;
    document.getElementById('description').value = item.descricaoLonga || '';

    tempPhotos = item.galeria ? item.galeria.map(g => ({ src: g.url })) : [];
    tempAttrs = item.atributos ? [...item.atributos] : [];

    document.getElementById('modal-title').innerText = "Editar Propriedade";
    renderPhotoPreview();
    renderAttributes();
    document.getElementById('modal').classList.replace('hidden', 'flex');
}

/**
 * Remove o item via API e atualiza a lista sem refresh de página
 */
async function deleteItem(id) {
    if (!confirm('Excluir este item permanentemente?')) return;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            await fetchProperties(); // Sincronização ágil
        }
    } catch (error) {
        alert('Erro ao excluir. Verifique o servidor.');
    }
}

/**
 * Handle unificado para Criação e Edição
 */
document.getElementById('property-form').onsubmit = async function (e) {
    e.preventDefault();
    const id = document.getElementById('form-id').value;
    const token = localStorage.getItem('token');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Processando...';

    const data = {
        titulo: document.getElementById('title').value,
        subtitulo: document.getElementById('subtitle').value,
        tipo: document.getElementById('type').value,
        descricaoLonga: document.getElementById('description').value,
        galeria: tempPhotos.map(p => ({ url: p.src })),
        atributos: tempAttrs.filter(a => a.label && a.value),
        isDestaque: document.getElementById('isHighlight').checked
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/${id}` : API_URL;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal();
            await fetchProperties(); // Recarrega apenas os dados, não a página
        } else {
            const errResult = await response.json();
            alert('Erro: ' + (errResult.error || 'Falha na comunicação com o servidor.'));
        }
    } catch (error) {
        alert('Erro de conexão. Verifique se o servidor está rodando.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
};

// --- 4. Funções Auxiliares de Interface (Mantidas conforme original) ---
function openModal(mode) {
    document.getElementById('property-form').reset();
    document.getElementById('form-id').value = '';
    tempPhotos = [];
    tempAttrs = [];
    if (mode === 'add') document.getElementById('modal-title').innerText = "Adicionar Imóvel";
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
    fileInput.onchange = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                tempPhotos.push({ src: event.target.result });
                renderPhotoPreview();
            };
            reader.readAsDataURL(file);
        });
        fileInput.value = '';
    };
}

function renderPhotoPreview() {
    const grid = document.getElementById('photo-preview-grid');
    if (!grid) return;
    grid.innerHTML = tempPhotos.map((photo, index) => `
        <div class="relative w-24 h-24 border border-white/10 rounded overflow-hidden">
            <img src="${photo.src}" class="w-full h-full object-cover">
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
    tempAttrs.push({ label: '', value: '' });
    renderAttributes();
}

function renderAttributes() {
    const container = document.getElementById('attributes-container');
    if (!container) return;
    container.innerHTML = tempAttrs.map((attr, index) => `
        <div class="flex gap-2 mb-2">
            <input type="text" value="${attr.label}" oninput="tempAttrs[${index}].label = this.value" class="bg-black/40 border border-white/10 p-2 text-xs flex-1 rounded" placeholder="Rótulo">
            <input type="text" value="${attr.value}" oninput="tempAttrs[${index}].value = this.value" class="bg-black/40 border border-white/10 p-2 text-xs flex-1 rounded" placeholder="Valor">
            <button type="button" onclick="tempAttrs.splice(${index}, 1); renderAttributes();" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
}

// --- 5. Logout e Escopo Global ---
const logoutBtn = document.querySelector('button.text-red-400');
if (logoutBtn) {
    logoutBtn.onclick = () => {
        localStorage.clear();
        window.location.href = 'login.html';
    };
}

window.editItem = editItem;
window.deleteItem = deleteItem;
window.openModal = openModal;
window.closeModal = closeModal;
window.addAttrRow = addAttrRow;
window.removePhoto = removePhoto;

document.addEventListener('DOMContentLoaded', init);