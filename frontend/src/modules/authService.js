// src/modules/authService.js

export class AuthService {
    constructor() {
       // Define a base da URL dependendo de onde o site está rodando
        const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:5000/api' 
            : 'https://garq-imoveis-backend.vercel.app/api';

        // Define o endpoint específico para autenticação
        this.apiUrl = `${BASE_URL}/auth`;
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