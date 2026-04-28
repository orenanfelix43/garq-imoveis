// src/home-api.js
import { AuthService } from './modules/authService.js';
import { API_URL } from './config.js';

document.addEventListener('DOMContentLoaded', async () => {

    try {
        const response = await fetch(`${API_URL}/imoveis`);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();

        let lista = [];
        if (result.success && Array.isArray(result.data)) {
            lista = result.data;
        } else if (Array.isArray(result)) {
            lista = result;
        } else if (Array.isArray(result.data)) {
            lista = result.data;
        }

        if (lista.length === 0) {
            console.warn('GARQ — Nenhum imóvel retornado pela API.');
            return;
        }

        const dynamicData = {};

        lista.forEach(imovel => {
            dynamicData[imovel._id] = {
                tipo:      imovel.tipo.toLowerCase(),
                titulo:    imovel.titulo,
                subtitulo: imovel.subtitulo,
                imagens:   imovel.galeria ? imovel.galeria.map(img => img.url) : (imovel.imagens || []),
                descricao: imovel.descricaoLonga || imovel.descricao || '',
                detalhes:  imovel.atributos || imovel.detalhes || [],
            };
        });

        window.imoveisData = dynamicData;

        if (typeof window.renderImoveis === 'function') {
            window.renderImoveis('todos');
        }

    } catch (error) {
        console.error('GARQ — Erro ao carregar imóveis do banco:', error);
    }
});