// src/auth-handler.js
import { AuthService } from './modules/authService.js';

const auth = new AuthService();

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('regErrorMessage');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 1. Coleta de dados conforme seu HTML
            const name = document.getElementById('regUser').value;
            const email = document.getElementById('regEmail').value;
            const phone = document.getElementById('regPhone').value;
            const password = document.getElementById('regPass').value;
            const confirmPassword = document.getElementById('regConfirmPass').value;

            // 2. Validação básica de senha
            if (password !== confirmPassword) {
                errorMessage.textContent = "As senhas não coincidem.";
                errorMessage.classList.remove('hidden');
                return;
            }

            try {
                // 3. Envio para o Backend
                await auth.register({ name, email, phone, password });
                
                // 4. Sucesso: Redirecionar para o painel
                alert('Cadastro realizado com sucesso!');
                window.location.href = 'admin.html'; 
            } catch (error) {
                errorMessage.textContent = error.message;
                errorMessage.classList.remove('hidden');
            }
        });
    }
});