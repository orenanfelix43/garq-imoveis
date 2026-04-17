// src/home-api.js
import { AuthService } from './modules/authService.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Busca os imóveis reais do seu banco de dados
        const response = await fetch('http://localhost:5000/api/imoveis');
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            // 2. Transforma os dados do Banco para o formato que seu script.js entende
            const dynamicData = {};
            
            result.data.forEach(imovel => {
                // Criamos uma chave baseada no título (ex: "mansao-solar")
                const slug = imovel.titulo.toLowerCase().replace(/ /g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                
                dynamicData[slug] = {
                    tipo: imovel.tipo.toLowerCase(),
                    titulo: imovel.titulo,
                    subtitulo: imovel.subtitulo,
                    imagens: imovel.galeria.map(img => img.url),
                    descricao: imovel.descricaoLonga,
                    detalhes: imovel.atributos
                };
            });

            // 3. Injeta os dados no script principal e manda renderizar
            // Nota: Isso substitui os dados estáticos pelos do banco
            Object.assign(window.imoveisData, dynamicData);
            
            // Se a função de renderização estiver global, nós a chamamos
            if (typeof window.renderImoveis === 'function') {
                window.renderImoveis(); 
            }
        }
    } catch (error) {
        console.error('Erro ao carregar imóveis do banco:', error);
    }
});