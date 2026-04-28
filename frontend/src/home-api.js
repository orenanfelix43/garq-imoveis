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

        // ── Monta o objeto global de imóveis para o portfólio ────────────────
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

        // ── Popula a seção Destaque com o imóvel marcado como isDestaque ─────
        const destaque = lista.find(imovel => imovel.isDestaque === true);
        preencherDestaque(destaque);

    } catch (error) {
        console.error('GARQ — Erro ao carregar imóveis do banco:', error);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Preenche a seção #destaque do index.html com os dados do imóvel em destaque.
// Se nenhum imóvel estiver marcado, oculta a seção e o link da navbar.
// ─────────────────────────────────────────────────────────────────────────────
function preencherDestaque(imovel) {
    const secao = document.getElementById('destaque');

    // Se não há destaque definido, oculta a seção inteira
    if (!imovel) {
        if (secao) secao.style.display = 'none';
        document.querySelectorAll('a[href="#destaque"]').forEach(el => {
            el.style.display = 'none';
        });
        console.warn('GARQ — Nenhum imóvel marcado como destaque.');
        return;
    }

    // Garante que a seção esteja visível
    if (secao) secao.style.display = '';
    document.querySelectorAll('a[href="#destaque"]').forEach(el => {
        el.style.display = '';
    });

    // ── Imagem principal ──────────────────────────────────────────────────────
    const imgEl = document.getElementById('img-destaque');
    if (imgEl && imovel.galeria && imovel.galeria.length > 0) {
        imgEl.src = imovel.galeria[0].url;
        imgEl.alt = imovel.titulo;
    }

    // ── Título ────────────────────────────────────────────────────────────────
    const tituloEl = document.getElementById('titulo-destaque');
    if (tituloEl) tituloEl.textContent = imovel.titulo;

    // ── Área Total — busca atributo com área/terreno/tamanho, ou usa o 1º ────
    const areaEl = document.getElementById('area-destaque');
    if (areaEl && imovel.atributos && imovel.atributos.length > 0) {
        const attrArea = imovel.atributos.find(a =>
            a.label.toLowerCase().includes('área') ||
            a.label.toLowerCase().includes('area')  ||
            a.label.toLowerCase().includes('terreno') ||
            a.label.toLowerCase().includes('tamanho')
        ) || imovel.atributos[0];

        areaEl.textContent = attrArea.value;
        const areaLabelEl = areaEl.previousElementSibling;
        if (areaLabelEl) areaLabelEl.textContent = attrArea.label;
    }

    // ── Tipologia — busca suíte/quarto/dormitório, ou usa o 2º atributo ──────
    const tipologiaEl = document.getElementById('tipologia-destaque');
    if (tipologiaEl) {
        if (imovel.atributos && imovel.atributos.length > 1) {
            const attrTipo = imovel.atributos.find(a =>
                a.label.toLowerCase().includes('suite')     ||
                a.label.toLowerCase().includes('suíte')     ||
                a.label.toLowerCase().includes('quarto')    ||
                a.label.toLowerCase().includes('tipologia') ||
                a.label.toLowerCase().includes('dormitório')
            ) || imovel.atributos[1];

            tipologiaEl.textContent = attrTipo.value;
            const tipoLabelEl = tipologiaEl.previousElementSibling;
            if (tipoLabelEl) tipoLabelEl.textContent = attrTipo.label;
        } else {
            // Fallback: usa o tipo do imóvel
            const tipo = imovel.tipo.charAt(0).toUpperCase() + imovel.tipo.slice(1);
            tipologiaEl.textContent = tipo;
        }
    }

    // ── Botão "Consultar Detalhes" → abre o detalhe no portfólio ─────────────
    const btnEl = document.getElementById('btn-detalhes-destaque');
    if (btnEl) {
        btnEl.onclick = () => {
            // Faz scroll até o portfólio e depois abre o detalhe do imóvel
            const secaoImoveis = document.getElementById('imoveis');
            if (secaoImoveis) {
                const top = secaoImoveis.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top, behavior: 'smooth' });
            }
            setTimeout(() => {
                if (typeof window.openDetail === 'function') {
                    window.openDetail(imovel._id);
                }
            }, 400);
        };
    }
}