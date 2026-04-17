// src/modules/authService.js

export class AuthService {
    constructor() {
        // Altere para a URL do seu servidor (ex: http://localhost:5000/api/auth)
        this.apiUrl = 'http://localhost:5000/api/auth';
    }

    async register(userData) {
        try {
            const response = await fetch(`${this.apiUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao realizar cadastro');
            }

            // Se o cadastro retornar um token, salvamos no localStorage
            if (data.token) {
                localStorage.setItem('garq_token', data.token);
                localStorage.setItem('garq_user', JSON.stringify(data.user));
            }

            return data;
        } catch (error) {
            console.error('AuthService Error:', error);
        throw error;
    }
}

// Adicione este método dentro da classe AuthService que criamos antes
async login(email, password) {
    try {
        const response = await fetch(`${this.apiUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Falha na autenticação');
        }

        // Armazenamento ágil do Token e dados do usuário
        if (data.token) {
            localStorage.setItem('garq_token', data.token);
            localStorage.setItem('garq_user', JSON.stringify(data.user));
        }

        return data;
    } catch (error) {
        throw error;
    }
    }
}