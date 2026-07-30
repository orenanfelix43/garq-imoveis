export function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

export function isObjectId(value) { return /^[a-f\d]{24}$/i.test(value || ''); }

export function bindActions(root, handlers) {
    root.addEventListener('click', event => {
        const target = event.target.closest('[data-action]');
        if (!target || !root.contains(target)) return;
        const handler = handlers[target.dataset.action];
        if (!handler) return;
        event.preventDefault();
        handler(target.dataset, target, event);
    });
    root.addEventListener('error', event => {
        if (event.target instanceof HTMLImageElement && event.target.dataset.fallback) {
            event.target.removeAttribute('data-fallback');
            event.target.src = 'assets/placeholder.webp';
        }
    }, true);
}

function icon(name, className) {
    const node = document.createElement('i');
    node.dataset.lucide = name;
    node.className = className;
    return node;
}

export function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const styles = {
        success: ['check-circle', 'border-l-green-500 bg-green-500/10', 'text-green-400'],
        error: ['x-circle', 'border-l-red-500 bg-red-500/10', 'text-red-400'],
        warning: ['alert-triangle', 'border-l-yellow-500 bg-yellow-500/10', 'text-yellow-400'],
        info: ['info', 'border-l-[#c5a059] bg-[#c5a059]/10', 'text-[#c5a059]'],
    };
    const style = styles[type] || styles.info;
    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-start gap-3 px-5 py-4 rounded-sm border border-white/10 border-l-2 backdrop-blur-md ${style[1]} text-white shadow-2xl max-w-sm w-full opacity-0 transition-all duration-300`;
    toast.append(icon(style[0], `w-4 h-4 mt-0.5 flex-shrink-0 ${style[2]}`));
    const text = document.createElement('p');
    text.className = 'text-xs leading-relaxed flex-1 uppercase tracking-widest';
    text.textContent = String(message ?? '');
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'text-gray-500 hover:text-white'; close.setAttribute('aria-label', 'Fechar');
    close.append(icon('x', 'w-3 h-3')); close.addEventListener('click', () => toast.remove());
    toast.append(text, close); container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();
    requestAnimationFrame(() => toast.classList.replace('opacity-0', 'opacity-100'));
    setTimeout(() => { toast.classList.add('opacity-0'); setTimeout(() => toast.remove(), 300); }, duration);
}

export function showConfirm(message) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998] flex items-center justify-center p-4';
        const panel = document.createElement('div'); panel.className = 'bg-[#111] border border-white/10 rounded-sm p-8 max-w-sm w-full shadow-2xl';
        const text = document.createElement('p'); text.className = 'text-sm uppercase tracking-widest text-white/80 mb-6'; text.textContent = String(message ?? '');
        const row = document.createElement('div'); row.className = 'flex gap-3';
        const finish = value => { overlay.remove(); resolve(value); };
        const cancel = document.createElement('button'); cancel.className = 'flex-1 border border-white/10 py-3 text-xs uppercase tracking-widest text-gray-400'; cancel.textContent = 'Cancelar'; cancel.addEventListener('click', () => finish(false));
        const ok = document.createElement('button'); ok.className = 'flex-1 bg-red-600 text-white py-3 text-xs uppercase tracking-widest font-bold'; ok.textContent = 'Confirmar'; ok.addEventListener('click', () => finish(true));
        row.append(cancel, ok); panel.append(text, row); overlay.append(panel); document.body.appendChild(overlay);
    });
}
