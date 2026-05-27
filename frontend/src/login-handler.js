import { API_URL } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) window.lucide.createIcons();

    const loginForm    = document.getElementById('loginForm');
    const errorMessage = document.getElementById('loginErrorMessage');

    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email    = document.getElementById('loginEmail').value.trim().toLowerCase();
        const password = document.getElementById('loginPass').value;

        const submitBtn = loginForm.querySelector('button[type="submit"]');

        if (submitBtn) {
            submitBtn.disabled    = true;
            submitBtn.textContent = 'Autenticando...';
        }

        if (errorMessage) errorMessage.classList.add('hidden');

        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 10_000);

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method:      'POST',
                headers:     { 'Content-Type': 'application/json' },
                body:        JSON.stringify({ email, password }),
                signal:      controller.signal,
                credentials: 'include', 
            });
            clearTimeout(timeoutId);

            const result = await response.json();

            if (result.success) {
                localStorage.clear();
                localStorage.setItem('userName', result.user.name);
                localStorage.setItem('userRole', result.user.role || 'user');
                if (result.token) localStorage.setItem('authToken', result.token);

                // Redirecionar por role
                const role = result.user.role;
                if (role === 'admin' || role === 'user') {
                    window.location.href = 'admin.html';
                } else if (role === 'cliente') {
                    window.location.href = 'area-cliente.html';
                } else {
                    window.location.href = 'admin.html';
                }
            } else {
                throw new Error(result.error || 'Credenciais inválidas.');
            }
        } catch (error) {
            clearTimeout(timeoutId);
            const message = error.name === 'AbortError'
                ? 'A requisição demorou muito. Verifique sua conexão.'
                : error.message;

            if (errorMessage) {
                errorMessage.textContent = message;
                errorMessage.classList.remove('hidden');
            }
            if (submitBtn) {
                submitBtn.disabled    = false;
                submitBtn.textContent = 'Entrar';
            }
        }
    });
});