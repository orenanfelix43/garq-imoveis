/**
 * api-fetch.js
 * Wrapper de fetch que injeta Authorization: Bearer <token> automaticamente.
 * Necessário para mobile (Safari ITP bloqueia cookies SameSite=None cross-origin).
 * Usa cookie quando disponível, token do localStorage como fallback.
 */

export function apiFetch(url, options = {}) {
    const token = localStorage.getItem('authToken');

    const headers = {
        ...(options.headers || {}),
    };

    // Injeta o header Authorization como fallback para quando o cookie não é enviado
    if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
        ...options,
        headers,
        credentials: 'include', // mantém o cookie quando disponível
    });
}