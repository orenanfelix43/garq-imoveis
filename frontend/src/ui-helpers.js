// =============================================================================
// ui-helpers.js — funções de UI compartilhadas entre admin.js e configuracoes.js
// =============================================================================

/**
 * Escapa HTML para prevenir XSS em conteúdo dinâmico.
 */
export function esc(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
}

/**
 * Exibe uma notificação toast no canto superior direito.
 * @param {string} message - Texto da notificação
 * @param {'info'|'success'|'error'|'warning'} type - Tipo visual
 * @param {number} duration - Duração em ms (padrão: 4000)
 */
export function showToast(message, type = 'info', duration = 4000) {
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

/**
 * Exibe um modal de confirmação e retorna uma Promise<boolean>.
 * @param {string} message - Pergunta exibida ao usuário
 * @returns {Promise<boolean>} true se confirmado, false se cancelado
 */
export function showConfirm(message) {
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