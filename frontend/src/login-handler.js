// frontend/src/login-handler.js
import { API_URL } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) window.lucide.createIcons();

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('loginErrorMessage');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPass').value;

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Autenticando...';
            }

            try {
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const result = await response.json();

                if (result.success) {
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('userName', result.user.name);
                    localStorage.setItem('userRole', result.user.role || 'Administrador');

                    window.location.href = 'admin.html';
                } else {
                    throw new Error(result.error || 'Credenciais inválidas');
                }
            } catch (error) {
                if (errorMessage) {
                    errorMessage.textContent = error.message;
                    errorMessage.classList.remove('hidden');
                }
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Entrar';
                }
            }
        });
    }
});