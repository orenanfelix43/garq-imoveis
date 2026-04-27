import { AuthService } from './modules/authService.js';

const auth = new AuthService();

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('regErrorMessage');

    if (!registerForm) return;

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name            = document.getElementById('regUser').value.trim();
        const email           = document.getElementById('regEmail').value.trim();
        const phone           = document.getElementById('regPhone').value.trim();
        const password        = document.getElementById('regPass').value;
        const confirmPassword = document.getElementById('regConfirmPass').value;

        const submitBtn    = registerForm.querySelector('button[type="submit"]') || registerForm.querySelector('button');
        const originalText = submitBtn?.innerText;

        errorMessage.classList.add('hidden');

        if (!name || !email || !phone || !password) {
            errorMessage.textContent = 'Todos os campos são obrigatórios.';
            errorMessage.classList.remove('hidden');
            return;
        }

        if (password.length < 6) {
            errorMessage.textContent = 'A senha deve ter no mínimo 6 caracteres.';
            errorMessage.classList.remove('hidden');
            return;
        }

        if (password !== confirmPassword) {
            errorMessage.textContent = 'As senhas não coincidem.';
            errorMessage.classList.remove('hidden');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled    = true;
            submitBtn.textContent = 'Cadastrando...';
        }

        try {
            await auth.register({ name, email, phone, password });

            errorMessage.style.color = '#4ade80'; // verde
            errorMessage.textContent = '✓ Cadastro realizado! Redirecionando...';
            errorMessage.classList.remove('hidden');

            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1500);

        } catch (error) {
            errorMessage.style.color = ''; // reseta para cor padrão de erro
            errorMessage.textContent = error.message || 'Erro ao realizar cadastro.';
            errorMessage.classList.remove('hidden');

            if (submitBtn) {
                submitBtn.disabled    = false;
                submitBtn.textContent = originalText;
            }
        }
    });
});