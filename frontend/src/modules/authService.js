import { API_URL } from '../config.js';
import { apiFetch, getCurrentUser } from '../api-fetch.js';

async function request(path, options) {
    const response = await apiFetch(`${API_URL}/auth${path}`, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Falha na autenticação.');
    return data;
}

export class AuthService {
    isAuthenticated() { return getCurrentUser().then(Boolean); }
    getToken() { return null; }
    register(payload) { return request('/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); }
    login(email, password) { return request('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.toLowerCase().trim(), password }) }); }
    async logout(redirect = true) {
        try { await request('/logout', { method: 'POST' }); } catch (_) {}
        if (redirect) window.location.href = 'login.html';
    }
}

export const authService = new AuthService();
