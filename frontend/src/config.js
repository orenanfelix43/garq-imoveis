const _isDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const config = {
    isDev:   _isDev,
    apiUrl:  _isDev
        ? 'http://localhost:5000/api'
        : 'https://garq-imoveis.onrender.com/api',
};

export const API_URL = config.apiUrl;