import { API_URL } from '../config.js';

export class AuthService {
    constructor() {
        this.apiUrl = `${API_URL}/auth`;
    }

    async register(userData) {
        const response = await fetch(`${this.apiUrl}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao realizar cadastro');
        }

        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userName', data.user.name);
            localStorage.setItem('userRole', data.user.role || 'Administrador');
        }

        return data;
    }

    async login(email, password) {
        const response = await fetch(`${this.apiUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Falha na autenticação');
        }

        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userName', data.user.name);
            localStorage.setItem('userRole', data.user.role || 'Administrador');
        }

        return data;
    }
}