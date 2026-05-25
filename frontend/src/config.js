// Em produção: usa /api relativo (proxy Vercel → Render)
// Mesmo domínio = Safari ITP não bloqueia cookies nem localStorage
// Em dev local: usa localhost diretamente
const _isDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const config = {
    isDev:  _isDev,
    apiUrl: _isDev
        ? 'http://localhost:5000/api'
        : '/api',
};

export const API_URL = config.apiUrl;