document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) window.lucide.createIcons();

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('loginErrorMessage');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPass').value;

            try {
                const response = await fetch(`${API_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const result = await response.json();

                if (result.success) {
                    // Armazenamento centralizado de dados
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('userName', result.user.name);
                    localStorage.setItem('userRole', result.user.role || 'Administrador');
                    
                    // Redirecionamento após o sucesso
                    window.location.href = 'admin.html';
                } else {
                    throw new Error(result.error || 'Credenciais inválidas');
                }
            } catch (error) {
                if (errorMessage) {
                    errorMessage.textContent = error.message;
                    errorMessage.classList.remove('hidden');
                }
            }
        });
    }
});