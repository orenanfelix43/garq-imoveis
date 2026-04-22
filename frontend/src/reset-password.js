const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api' 
    : 'https://garq-imoveis-backend.vercel.app/api';
    
document.getElementById('resetForm').onsubmit = async function(e) {
    e.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorMsg = document.getElementById('errorMessage');
    const submitBtn = document.getElementById('submitBtn');
    const successDiv = document.getElementById('successMessage');
    const form = document.getElementById('resetForm');

    // 1. Validar se as senhas são iguais
    if (newPassword !== confirmPassword) {
        errorMsg.innerText = "As senhas não coincidem.";
        errorMsg.classList.remove('hidden');
        return;
    }

    // 2. Pegar o Token da URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        errorMsg.innerText = "Token inválido ou expirado.";
        errorMsg.classList.remove('hidden');
        return;
    }

    // Estado de carregamento
    errorMsg.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.innerText = "ATUALIZANDO...";

    try {
        // 3. Enviar o POST para o Backend
        const response = await fetch(`${API_URL}/api/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password: newPassword })
        });

        const result = await response.json();

        if (response.ok) {
            form.classList.add('hidden');
            successDiv.classList.remove('hidden');
        } else {
            errorMsg.innerText = result.message || "Erro ao atualizar senha.";
            errorMsg.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.innerText = "ATUALIZAR SENHA";
        }
    } catch (error) {
        errorMsg.innerText = "Erro de conexão com o servidor.";
        errorMsg.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.innerText = "ATUALIZAR SENHA";
    }
};