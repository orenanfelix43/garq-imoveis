/**
 * GARQ Invest - Recuperação de Senha
 * Lógica profissional para envio de link de redefinição
 */

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api' 
    : 'https://garq-imoveis-backend.vercel.app/api';

document.addEventListener('DOMContentLoaded', () => {
    const recoveryForm = document.getElementById('recoveryForm');
    const emailInput = document.getElementById('emailInput');
    const errorMsg = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');

    // Validação de segurança: Só executa se o formulário existir na página atual
    if (!recoveryForm) return;

    recoveryForm.onsubmit = async function(e) {
        e.preventDefault();

        const email = emailInput.value.trim();
        const submitBtn = recoveryForm.querySelector('button');
        

        // 1. Limpeza de estados anteriores
        errorMsg.classList.add('hidden');
        successDiv.classList.add('hidden');
        
        // 2. Feedback visual de carregamento (UX de alto nível)
        const originalBtnText = submitBtn.innerText;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <span class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                PROCESSANDO...
            </span>
        `;

        try {
            // 3. Chamada à API de Autenticação
            const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ email })
            });

            const result = await response.json();

            if (response.ok) {
                // 4. Sucesso: Esconde o form e mostra mensagem positiva
                recoveryForm.classList.add('hidden');
                successDiv.classList.remove('hidden');
            } else {
                // 5. Erro de Negócio (ex: e-mail não encontrado)
                errorMsg.innerText = result.message || "E-mail não encontrado.";
                errorMsg.classList.remove('hidden');
                
                // Restaura o botão para nova tentativa
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
            }
        } catch (error) {
            // 6. Erro de Infraestrutura (servidor offline)
            errorMsg.innerText = "Erro de conexão. Tente novamente mais tarde.";
            errorMsg.classList.remove('hidden');
            
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        }
    };
});