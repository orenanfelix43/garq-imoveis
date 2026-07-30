import { API_URL } from './config.js';

function csrfToken() {
    const cookie = document.cookie.split('; ').find(item => item.startsWith('XSRF-TOKEN='));
    return cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : '';
}

export function apiFetch(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = { ...(options.headers || {}) };
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        const token = csrfToken();
        if (token) headers['X-CSRF-Token'] = token;
    }
    return fetch(url, { ...options, headers, credentials: 'include' });
}

export async function getCurrentUser(requiredRole) {
    for (const key of ['authToken', 'userName', 'userRole']) localStorage.removeItem(key);
    const response = await apiFetch(`${API_URL}/auth/session`);
    if (!response.ok) return null;
    const result = await response.json();
    if (!result.success || !result.user) return null;
    if (requiredRole && result.user.role !== requiredRole) return null;
    return result.user;
}
