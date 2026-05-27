import { API_URL } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) window.lucide.createIcons();

    const form    = document.getElementById('cadastroForm');
    const erroEl  = document.getElementById('cadastroErro');
    const btn     = document.getElementById('cadastroBtn');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        erroEl.classList.add('hidden');

        const nome     = document.getElementById('cadastroNome').value.trim();
        const phone    = document.getElementById('cadastroPhone').value.trim();
        const email    = document.getElementById('cadastroEmail').value.trim().toLowerCase();
        const senha    = document.getElementById('cadastroSenha').value;
        const confirma = document.getElementById('cadastroConfirma').value;

        // Validações
        if (!nome || !phone || !email || !senha) {
            mostrarErro('Todos os campos são obrigatórios.');
            return;
        }
        if (senha.length < 6) {
            mostrarErro('A senha deve ter no mínimo 6 caracteres.');
            return;
        }
        if (senha !== confirma) {
            mostrarErro('As senhas não coincidem.');
            return;
        }

        setLoading(true);

        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 30_000);

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method:      'POST',
                headers:     { 'Content-Type': 'application/json' },
                credentials: 'include',
                signal:      controller.signal,
                body:        JSON.stringify({
                    name:     nome,
                    phone,
                    email,
                    password: senha,
                    role:     'cliente', // sempre cliente no auto-cadastro
                }),
            });
            clearTimeout(timeoutId);

            const result = await response.json();

            if (result.success) {
                // Salvar sessão e redirecionar
                localStorage.clear();
                localStorage.setItem('userName', result.user.name);
                localStorage.setItem('userRole', result.user.role);
                if (result.token) localStorage.setItem('authToken', result.token);

                window.location.href = 'area-cliente.html';
            } else {
                mostrarErro(result.error || 'Erro ao criar conta. Tente novamente.');
            }
        } catch (err) {
            clearTimeout(timeoutId);
            const msg = err.name === 'AbortError'
                ? 'A requisição demorou muito. Tente novamente.'
                : 'Falha de conexão. Verifique sua internet.';
            mostrarErro(msg);
        } finally {
            setLoading(false);
        }
    });

    function mostrarErro(msg) {
        erroEl.textContent = msg;
        erroEl.classList.remove('hidden');
    }

    function setLoading(loading) {
        btn.disabled    = loading;
        btn.textContent = loading ? 'Criando conta...' : 'Criar Conta';
    }
});