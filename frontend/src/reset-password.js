import { API_URL } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const form        = document.getElementById('resetForm');
    const errorMsg    = document.getElementById('errorMessage');
    const submitBtn   = document.getElementById('submitBtn');
    const successDiv  = document.getElementById('successMessage');

    if (!form || !submitBtn) return;

    const urlParams = new URLSearchParams(window.location.search);
    const token     = urlParams.get('token');

    if (!token) {
        if (errorMsg) {
            errorMsg.innerText = 'Link inválido. Solicite uma nova recuperação de senha.';
            errorMsg.classList.remove('hidden');
        }
        submitBtn.disabled = true;
        return;
    }

    form.onsubmit = async function (e) {
        e.preventDefault();

        const newPassword     = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Limpa estado anterior
        errorMsg.classList.add('hidden');

        if (newPassword !== confirmPassword) {
            errorMsg.innerText = 'As senhas não coincidem.';
            errorMsg.classList.remove('hidden');
            return;
        }

        if (newPassword.length < 6) {
            errorMsg.innerText = 'A senha deve ter no mínimo 6 caracteres.';
            errorMsg.classList.remove('hidden');
            return;
        }

        const originalText    = submitBtn.innerText;
        submitBtn.disabled    = true;
        submitBtn.innerText   = 'ATUALIZANDO...';

        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 30_000);

        try {
            const response = await fetch(`${API_URL}/auth/reset-password`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ token, password: newPassword }),
                signal:  controller.signal,
            });
            clearTimeout(timeoutId);

            const result = await response.json();

            if (response.ok) {
                form.classList.add('hidden');
                successDiv.classList.remove('hidden');

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
            } else {
                errorMsg.innerText = result.message || 'Erro ao atualizar senha.';
                errorMsg.classList.remove('hidden');
                submitBtn.disabled  = false;
                submitBtn.innerText = originalText;
            }
        } catch (error) {
            clearTimeout(timeoutId);
            const message = error.name === 'AbortError'
                ? 'A requisição demorou muito. Tente novamente.'
                : 'Erro de conexão com o servidor.';
            errorMsg.innerText = message;
            errorMsg.classList.remove('hidden');
            submitBtn.disabled  = false;
            submitBtn.innerText = originalText;
        }
    };
});