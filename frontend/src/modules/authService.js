import { API_URL } from '../config.js';

// ─── Constantes internas ─────────────────────────────────────────────────────
const STORAGE_KEYS = {
    TOKEN:    'token',
    USERNAME: 'userName',
    ROLE:     'userRole',
};

const REQUEST_TIMEOUT_MS = 10_000; // 10 segundos

// ─── Helper: fetch com timeout ────────────────────────────────────────────────
async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error('A requisição excedeu o tempo limite. Tente novamente.');
        }
        throw err;
    }
}

// ─── Classe principal ─────────────────────────────────────────────────────────
export class AuthService {
    constructor() {
        this.apiUrl = `${API_URL}/auth`;
    }

    isAuthenticated() {
        return !!localStorage.getItem(STORAGE_KEYS.TOKEN);
    }

    getToken() {
        return localStorage.getItem(STORAGE_KEYS.TOKEN);
    }

    _saveSession(data) {
        this.logout(false); // false = sem redirecionamento
        localStorage.setItem(STORAGE_KEYS.TOKEN,    data.token);
        localStorage.setItem(STORAGE_KEYS.USERNAME, data.user.name);
        localStorage.setItem(STORAGE_KEYS.ROLE,     data.user.role || 'user');
    }

    // ── Registro ──────────────────────────────────────────────────────────────
    async register({ name, email, phone, password }) {
        const response = await fetchWithTimeout(`${this.apiUrl}/register`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ name, email: email.toLowerCase().trim(), phone, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao realizar cadastro.');
        }

        if (data.token) this._saveSession(data);

        return data;
    }

    // ── Login ─────────────────────────────────────────────────────────────────
    async login(email, password) {
        const response = await fetchWithTimeout(`${this.apiUrl}/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email: email.toLowerCase().trim(), password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Falha na autenticação.');
        }

        if (data.token) this._saveSession(data);

        return data;
    }

    logout(redirect = true) {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USERNAME);
        localStorage.removeItem(STORAGE_KEYS.ROLE);
        if (redirect) {
            window.location.href = 'login.html';
        }
    }
}

export const authService = new AuthService();