// src/home-api.js
import { AuthService } from './modules/authService.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- DETECÇÃO DINÂMICA DA URL ---
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/api' 
        : 'https://garq-imoveis-backend.vercel.app/api';

    try {
        // 1. Busca os imóveis usando a variável dinâmica
        const response = await fetch(`${API_URL}/imoveis`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            const dynamicData = {};
            
            result.data.forEach(imovel => {
                const slug = imovel.titulo.toLowerCase()
                    .replace(/ /g, '-')
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
                
                dynamicData[slug] = {
                    tipo: imovel.tipo.toLowerCase(),
                    titulo: imovel.titulo,
                    subtitulo: imovel.subtitulo,
                    // Garante que mapeia 'galeria' do banco para 'imagens' do script
                    imagens: imovel.galeria ? imovel.galeria.map(img => img.url) : [],
                    descricao: imovel.descricaoLonga || imovel.descricao,
                    detalhes: imovel.atributos || []
                };
            });

            // 2. Injeta os dados no objeto global
            Object.assign(window.imoveisData, dynamicData);
            
            // 3. Re-renderiza a tela com os dados novos
            if (typeof window.renderImoveis === 'function') {
                window.renderImoveis('todos'); 
            }
        }
    } catch (error) {
        console.error('GARQ — Erro ao carregar imóveis do banco:', error);
    }
});