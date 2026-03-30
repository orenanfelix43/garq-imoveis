const baseUrl = "https://pub-c3e6ea3b19da44d7b869d5d7b4eaf09b.r2.dev";

const categoryVideos = {
    'todos': `${baseUrl}/Todos.mp4`,
    'casa': `${baseUrl}/AereoCasa.MP4`,
    'terreno': `${baseUrl}/SuperiorTerreno.MP4`,
    'apartamento': 'https://vjs.zencdn.net/v/oceans.mp4'
};

const imoveisData = {
    'mansao-solar': {
        tipo: 'casa',
        titulo: 'Mansão Solar | Fazenda Alvorada',
        subtitulo: 'Residência de Elite • Interior de SP',
        imagens: ['mansaosolar/1.webp'],
        descricao: 'Uma obra-prima arquitetônica que equilibra materiais naturais e design contemporâneo.',
        detalhes: [
            { label: 'Área Terreno', value: '2.500 m²' },
            { label: 'Suítes', value: '06 Master' }
        ]
    },
    'lote-vista-lago': {
        tipo: 'terreno',
        titulo: 'Lote Vista Lago',
        subtitulo: 'Ativo Estratégico • Terreno Premium',
        imagens: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80'],
        descricao: 'Oportunidade rara para construção personalizada com vista perene para o lago.',
        detalhes: [
            { label: 'Área Total', value: '3.100 m²' },
            { label: 'Frente', value: '45 metros' }
        ]
    }
};

// ─── Estado Global ────────────────────────────────────────────────────────────
let nodes = {};
let currentSlide = 0;
let slideInterval;

// ─── Mapeamento de Nós DOM ────────────────────────────────────────────────────
function mapNodes() {
    nodes = {
        home:         document.getElementById('home-page'),
        detail:       document.getElementById('detail-page'),
        detailContent:document.getElementById('detail-content'),
        container:    document.getElementById('cards-container'),
        navbar:       document.getElementById('navbar'),
        title:        document.getElementById('portfolio-title'),
        videoWrapper: document.getElementById('category-video-wrapper'),
        videoElement: document.getElementById('main-category-video'),
        videoLabel:   document.getElementById('video-label'),
        videoTitle:   document.getElementById('video-title')
    };
}

// ─── Ícones ───────────────────────────────────────────────────────────────────
function initIcons() {
    if (window.lucide) window.lucide.createIcons();
}

// ─── Vídeo por Categoria ──────────────────────────────────────────────────────
function updateCategoryVideo(filterType) {
    if (!nodes.videoWrapper || !nodes.videoElement) return;

    const videoSrc    = categoryVideos[filterType] || categoryVideos['todos'];
    const displayLabel = `Experiência GARQ • ${filterType === 'todos' ? 'Institucional' : filterType}`;
    const mainTitle    = filterType === 'todos' ? 'Estratégia e Solidez' : `${filterType}s Exclusivos`;

    nodes.videoWrapper.classList.remove('h-0', 'mb-0', 'opacity-0');
    nodes.videoWrapper.classList.add('h-[280px]', 'md:h-[450px]', 'opacity-100', 'mb-16');

    if (nodes.videoElement.src !== videoSrc) {
        nodes.videoElement.src = videoSrc;
        nodes.videoElement.load();
    }

    if (nodes.videoLabel) nodes.videoLabel.textContent = displayLabel;
    if (nodes.videoTitle) nodes.videoTitle.textContent = mainTitle;
}

// ─── Filtro de Portfólio ──────────────────────────────────────────────────────
function filterPortfolio(filterType = 'todos', shouldScroll = true) {
    if (!nodes.container) return;

    // Se estiver na página de detalhe, volta para home primeiro
    if (nodes.home && nodes.home.classList.contains('hidden')) showHome();

    updateCategoryVideo(filterType);

    const titles = {
        'todos':       'Inventário de Ativos',
        'casa':        'Casas de Alto Padrão',
        'terreno':     'Terrenos e Lotes',
        'apartamento': 'Apartamentos Exclusivos'
    };

    if (nodes.title) nodes.title.innerText = titles[filterType] || titles['todos'];

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filterType);
    });

    if (shouldScroll) {
        const target = document.getElementById('imoveis');
        if (target) {
            const offset = 80;
            const offsetPosition = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
    }

    nodes.container.style.opacity = '0';

    setTimeout(() => {
        nodes.container.innerHTML = '';

        const filteredKeys = Object.keys(imoveisData).filter(key =>
            filterType === 'todos' || imoveisData[key].tipo === filterType
        );

        if (filteredKeys.length === 0) {
            const empty = document.createElement('p');
            empty.className = "col-span-full text-center text-gray-500 py-20 italic";
            empty.textContent = "Nenhum ativo disponível no momento.";
            nodes.container.appendChild(empty);
        } else {
            filteredKeys.forEach(key => {
                const item = imoveisData[key];

                const card = document.createElement('div');
                card.className = "glass-card group overflow-hidden cursor-pointer fade-in";
                card.addEventListener('click', () => openDetail(key));

                const imgWrapper = document.createElement('div');
                imgWrapper.className = "h-80 overflow-hidden";

                const img = document.createElement('img');
                img.src = item.imagens[0];
                img.alt = item.titulo;
                img.loading = "lazy";
                img.className = "w-full h-full object-cover transition duration-1000 group-hover:scale-110";
                imgWrapper.appendChild(img);

                const infoDiv = document.createElement('div');
                infoDiv.className = "p-8";

                const h3 = document.createElement('h3');
                h3.className = "text-xl font-serif text-white mb-2";
                h3.textContent = item.titulo;

                const sub = document.createElement('p');
                sub.className = "text-[10px] uppercase tracking-widest text-gold mb-6";
                sub.textContent = item.subtitulo;

                const link = document.createElement('span');
                link.className = "text-gold text-[9px] uppercase tracking-[0.3em] font-bold";
                link.textContent = "Ver Ficha Técnica →";

                infoDiv.appendChild(h3);
                infoDiv.appendChild(sub);
                infoDiv.appendChild(link);
                card.appendChild(imgWrapper);
                card.appendChild(infoDiv);
                nodes.container.appendChild(card);
            });
        }

        nodes.container.style.opacity = '1';
    }, 300);
}

// ─── Slider ───────────────────────────────────────────────────────────────────
function moveSlide(direction, total) {
    currentSlide = (currentSlide + direction + total) % total;
    const track = document.getElementById('slider-track');
    if (track) track.style.transform = `translateX(-${currentSlide * 100}%)`;
}

function startAutoSlide(total) {
    stopAutoSlide();
    if (total <= 1) return;
    slideInterval = setInterval(() => moveSlide(1, total), 5000);
}

function stopAutoSlide() {
    if (slideInterval) clearInterval(slideInterval);
}

// ─── Página de Detalhes ───────────────────────────────────────────────────────
// FIX: função openDetail sem redeclaração interna, com DOM seguro (sem innerHTML para dados)
function openDetail(id) {
    const data = imoveisData[id];
    if (!data) return;

    currentSlide = 0;
    stopAutoSlide();
    const totalImgs = data.imagens.length;

    // --- Coluna esquerda: galeria de imagens ---
    const galleryCol = document.createElement('div');
    galleryCol.className = "relative overflow-hidden rounded-sm shadow-2xl bg-gray-100 group";

    const track = document.createElement('div');
    track.id = "slider-track";
    track.className = "flex transition-transform duration-700";

    data.imagens.forEach(imgSrc => {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = data.titulo;
        img.className = "w-full h-auto flex-shrink-0 object-cover";
        track.appendChild(img);
    });
    galleryCol.appendChild(track);

    if (totalImgs > 1) {
        const btnPrev = document.createElement('button');
        btnPrev.className = "absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 hover:bg-gold opacity-0 group-hover:opacity-100";
        btnPrev.setAttribute('aria-label', 'Imagem anterior');
        btnPrev.innerHTML = '<i data-lucide="chevron-left"></i>';
        btnPrev.addEventListener('click', () => moveSlide(-1, totalImgs));

        const btnNext = document.createElement('button');
        btnNext.className = "absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 hover:bg-gold opacity-0 group-hover:opacity-100";
        btnNext.setAttribute('aria-label', 'Próxima imagem');
        btnNext.innerHTML = '<i data-lucide="chevron-right"></i>';
        btnNext.addEventListener('click', () => moveSlide(1, totalImgs));

        galleryCol.appendChild(btnPrev);
        galleryCol.appendChild(btnNext);
    }

    // --- Coluna direita: informações do imóvel (100% via textContent — seguro contra XSS) ---
    const infoCol = document.createElement('div');

    const subtituloEl = document.createElement('span');
    subtituloEl.className = "text-gold uppercase tracking-[0.5em] text-[11px] font-bold mb-4 block";
    subtituloEl.textContent = data.subtitulo;

    const tituloEl = document.createElement('h2');
    tituloEl.className = "text-4xl md:text-6xl font-serif mb-8 leading-tight";
    tituloEl.textContent = data.titulo;

    const descEl = document.createElement('p');
    descEl.className = "text-gray-600 text-lg leading-relaxed mb-12 font-light italic";
    descEl.textContent = `"${data.descricao}"`;

    const detalhesGrid = document.createElement('div');
    detalhesGrid.className = "grid grid-cols-2 gap-8 mb-16";

    data.detalhes.forEach(d => {
        const item = document.createElement('div');
        item.className = "border-b border-gray-100 pb-4";

        const label = document.createElement('span');
        label.className = "block text-[9px] uppercase text-gray-400 font-bold mb-1 tracking-widest";
        label.textContent = d.label;

        const value = document.createElement('span');
        value.className = "text-xl font-medium";
        value.textContent = d.value;

        item.appendChild(label);
        item.appendChild(value);
        detalhesGrid.appendChild(item);
    });

    const ctaLink = document.createElement('a');
    ctaLink.href = "https://wa.me/5515998440267";
    ctaLink.target = "_blank";
    ctaLink.rel = "noopener noreferrer";
    ctaLink.className = "w-full bg-black text-white px-16 py-6 text-[11px] uppercase tracking-[0.4em] font-bold hover:bg-gold transition-all text-center block";
    ctaLink.textContent = "Solicitar Atendimento Private";

    infoCol.appendChild(subtituloEl);
    infoCol.appendChild(tituloEl);
    infoCol.appendChild(descEl);
    infoCol.appendChild(detalhesGrid);
    infoCol.appendChild(ctaLink);

    // --- Monta grid e exibe ---
    const grid = document.createElement('div');
    grid.className = "grid grid-cols-1 lg:grid-cols-2 gap-16 items-start";
    grid.appendChild(galleryCol);
    grid.appendChild(infoCol);

    nodes.detailContent.replaceChildren(grid);
    nodes.home.classList.add('hidden');
    nodes.detail.classList.remove('hidden');
    nodes.navbar.classList.add('nav-scrolled');
    window.scrollTo(0, 0);
    initIcons();
    startAutoSlide(totalImgs);
}

// ─── Voltar para Home ─────────────────────────────────────────────────────────
function showHome() {
    stopAutoSlide();
    nodes.detail.classList.add('hidden');
    nodes.home.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.scrollY < 50) nodes.navbar.classList.remove('nav-scrolled');
    initIcons();
}

// ─── Scroll: atualiza navbar ──────────────────────────────────────────────────
window.addEventListener('scroll', () => {
    if (nodes.home && !nodes.home.classList.contains('hidden')) {
        nodes.navbar.classList.toggle('nav-scrolled', window.scrollY > 50);
    }
}, { passive: true });

// ─── FIX: único ponto de inicialização (sem duplicatas) ───────────────────────
window.addEventListener('DOMContentLoaded', () => {
    mapNodes();

    const required = ['home-page', 'cards-container', 'navbar'];
    const missing  = required.filter(id => !document.getElementById(id));

    if (missing.length > 0) {
        console.error('GARQ — IDs faltando no HTML:', missing);
        return;
    }

    filterPortfolio('todos', false);
    initIcons();
});