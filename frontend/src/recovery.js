import { API_URL } from './config.js';

// ─── Helpers de UI ────────────────────────────────────────────────────────────
function setLoading(btn, isLoading, originalText) {
    btn.disabled = isLoading;
    btn.innerHTML = isLoading
        ? `<span class="flex items-center justify-center gap-2">
               <svg class="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg"
                    fill="none" viewBox="0 0 24 24">
                   <circle class="opacity-25" cx="12" cy="12" r="10"
                           stroke="currentColor" stroke-width="4"></circle>
                   <path class="opacity-75" fill="currentColor"
                         d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962
                            7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                   </path>
               </svg>
               PROCESSANDO...
           </span>`
        : originalText;
}

function showError(el, message) {
    el.innerText = message;
    el.classList.remove('hidden');
}

function showSuccess(formEl, successEl) {
    formEl.classList.add('hidden');
    successEl.classList.remove('hidden');
}

// ─── Inicialização ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const recoveryForm = document.getElementById('recoveryForm');
    const emailInput   = document.getElementById('emailInput');
    const errorMsg     = document.getElementById('errorMessage');
    const successDiv   = document.getElementById('successMessage');

    if (!recoveryForm) return;

    recoveryForm.onsubmit = async function (e) {
        e.preventDefault();

        const email     = emailInput.value.trim();
        const submitBtn = recoveryForm.querySelector('button[type="submit"]') || recoveryForm.querySelector('button');
        const originalText = submitBtn.innerText;

        // Limpa estados anteriores
        errorMsg.classList.add('hidden');
        successDiv.classList.add('hidden');

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            showError(errorMsg, 'Por favor, insira um e-mail válido.');
            return;
        }

        setLoading(submitBtn, true, originalText);

        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 10_000);

        try {
            const response = await fetch(`${API_URL}/auth/forgot-password`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ email }),
                signal:  controller.signal,
            });
            clearTimeout(timeoutId);

            if (response.ok || response.status === 404) {
                showSuccess(recoveryForm, successDiv);
            } else {
                const result = await response.json().catch(() => ({}));
                showError(errorMsg, result.message || 'Erro ao processar. Tente novamente.');
                setLoading(submitBtn, false, originalText);
            }
        } catch (error) {
            clearTimeout(timeoutId);
            const message = error.name === 'AbortError'
                ? 'A requisição demorou muito. Tente novamente.'
                : 'Erro de conexão. Verifique sua internet e tente novamente.';
            showError(errorMsg, message);
            setLoading(submitBtn, false, originalText);
        }
    };
});