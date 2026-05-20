// Única fonte de verdade: window.__GARQ_CONFIG__ definido no HTML de cada página.
// Fallback para desenvolvimento sem o script inline.
const _isDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const config = {
    isDev:  _isDev,
    apiUrl: window.__GARQ_CONFIG__?.API_URL ?? (
        _isDev
            ? 'http://localhost:5000/api'
            : 'https://garq-imoveis.onrender.com/api'
    ),
};

export const API_URL = config.apiUrl;