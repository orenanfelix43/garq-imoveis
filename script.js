/**
 * GARQ Imóveis - Script de Performance v2.6
 * Ajuste: Redirecionamento automático no filtro e otimização de scroll.
 */

const categoryVideos = {
    'todos': 'https://vjs.zencdn.net/v/oceans.mp4',
    'casa': 'https://www.w3schools.com/html/mov_bbb.mp4', 
    'terreno': 'https://www.w3schools.com/html/movie.mp4', 
    'apartamento': 'https://vjs.zencdn.net/v/oceans.mp4' 
};

const imoveisData = {
    'mansao-solar': {
        tipo: 'casa',
        titulo: 'Mansão Solar | Fazenda Alvorada',
        subtitulo: 'Residência de Elite • Interior de SP',
        imagens: ['assets/carrosel.jpeg', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'],
        descricao: 'Uma obra-prima arquitetônica que equilibra materiais naturais e design contemporâneo.',
        detalhes: [{ label: 'Área Terreno', value: '2.500 m²' }, { label: 'Suítes', value: '06 Master' }]
    },
    'lote-vista-lago': {
        tipo: 'terreno',
        titulo: 'Lote Vista Lago',
        subtitulo: 'Ativo Estratégico • Terreno Premium',
        imagens: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80'],
        descricao: 'Oportunidade rara para construção personalizada com vista perene para o lago.',
        detalhes: [{ label: 'Área Total', value: '3.100 m²' }, { label: 'Frente', value: '45 metros' }]
    }
};

const nodes = {
    home: document.getElementById('home-page'),
    detail: document.getElementById('detail-page'),
    detailContent: document.getElementById('detail-content'),
    container: document.getElementById('cards-container'),
    navbar: document.getElementById('navbar'),
    title: document.getElementById('portfolio-title'),
    videoWrapper: document.getElementById('category-video-wrapper')
};

let currentSlide = 0;
let slideInterval;

function initIcons() {
    if (window.lucide) window.lucide.createIcons();
}

function updateCategoryVideo(filterType) {
    if (!nodes.videoWrapper) return;
    const videoSrc = categoryVideos[filterType] || categoryVideos['todos'];
    const displayLabel = filterType === 'todos' ? 'Institucional' : filterType;
    const mainTitle = filterType === 'todos' ? 'Estratégia e Solidez' : `${filterType}s Exclusivos`;

    nodes.videoWrapper.classList.remove('h-0', 'mb-0');
    nodes.videoWrapper.classList.add('h-[280px]', 'md:h-[450px]', 'opacity-100', 'mb-16');

    nodes.videoWrapper.innerHTML = `
        <div class="relative w-full h-full overflow-hidden rounded-sm shadow-2xl bg-black border border-white/5 group">
            <video src="${videoSrc}" autoplay muted loop playsinline class="w-full h-full object-cover opacity-40 transition-transform duration-[20s] group-hover:scale-110"></video>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-t from-black/80 via-transparent to-black/20">
                <div class="fade-in">
                    <span class="text-gold uppercase tracking-[0.6em] text-[10px] font-bold mb-4 block opacity-80">Experiência GARQ • ${displayLabel}</span>
                    <h3 class="text-white text-3xl md:text-5xl font-serif uppercase tracking-tighter mb-6">${mainTitle}</h3>
                    <div class="w-16 h-[1px] bg-gold/40 mx-auto"></div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Filtra o portfólio e realiza o scroll automático se solicitado
 */
function filterPortfolio(filterType = 'todos', shouldScroll = true) {
    if (!nodes.container) return;
    
    if (nodes.home.classList.contains('hidden')) showHome();

    updateCategoryVideo(filterType);

    const titles = {
        'todos': 'Inventário de Ativos',
        'casa': 'Casas de Alto Padrão',
        'terreno': 'Terrenos e Lotes',
        'apartamento': 'Apartamentos Exclusivos'
    };
    
    if(nodes.title) nodes.title.innerText = titles[filterType] || titles.todos;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filterType);
    });

    // Redirecionamento automático (Scroll)
    if (shouldScroll) {
        const target = document.getElementById('imoveis');
        if (target) {
            const offset = 80; 
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = target.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }

    nodes.container.style.opacity = '0';
    setTimeout(() => {
        nodes.container.innerHTML = '';
        const filteredKeys = Object.keys(imoveisData).filter(key => 
            filterType === 'todos' || imoveisData[key].tipo === filterType
        );

        if (filteredKeys.length === 0) {
            nodes.container.innerHTML = `<p class="col-span-full text-center text-gray-500 py-20 italic">Nenhum ativo disponível no momento.</p>`;
        } else {
            filteredKeys.forEach(key => {
                const item = imoveisData[key];
                const card = document.createElement('div');
                card.className = "glass-card group overflow-hidden cursor-pointer fade-in";
                card.onclick = () => openDetail(key);
                card.innerHTML = `
                    <div class="h-80 overflow-hidden"><img src="${item.imagens[0]}" class="w-full h-full object-cover transition duration-1000 group-hover:scale-110"></div>
                    <div class="p-8">
                        <h3 class="text-xl font-serif text-white mb-2">${item.titulo}</h3>
                        <p class="text-[10px] uppercase tracking-widest text-gold mb-6">${item.subtitulo}</p>
                        <span class="text-gold text-[9px] uppercase tracking-[0.3em] font-bold">Ver Ficha Técnica →</span>
                    </div>
                `;
                nodes.container.appendChild(card);
            });
        }
        nodes.container.style.opacity = '1';
    }, 300);
}

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

function stopAutoSlide() { if (slideInterval) clearInterval(slideInterval); }

function openDetail(id) {
    const data = imoveisData[id];
    if (!data) return;
    currentSlide = 0;
    const totalImgs = data.imagens.length;
    nodes.detailContent.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div class="relative overflow-hidden rounded-sm shadow-2xl bg-gray-100 group">
                <div id="slider-track" class="flex transition-transform duration-700">
                    ${data.imagens.map(img => `<img src="${img}" class="w-full h-auto flex-shrink-0 object-cover">`).join('')}
                </div>
                ${totalImgs > 1 ? `
                    <button onclick="moveSlide(-1, ${totalImgs})" class="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 hover:bg-gold opacity-0 group-hover:opacity-100"><i data-lucide="chevron-left"></i></button>
                    <button onclick="moveSlide(1, ${totalImgs})" class="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 hover:bg-gold opacity-0 group-hover:opacity-100"><i data-lucide="chevron-right"></i></button>
                ` : ''}
            </div>
            <div>
                <span class="text-gold uppercase tracking-[0.5em] text-[11px] font-bold mb-4 block">${data.subtitulo}</span>
                <h2 class="text-4xl md:text-6xl font-serif mb-8 leading-tight">${data.titulo}</h2>
                <p class="text-gray-600 text-lg leading-relaxed mb-12 font-light italic">"${data.descricao}"</p>
                <div class="grid grid-cols-2 gap-8 mb-16">
                    ${data.detalhes.map(d => `
                        <div class="border-b border-gray-100 pb-4">
                            <span class="block text-[9px] uppercase text-gray-400 font-bold mb-1 tracking-widest">${d.label}</span>
                            <span class="text-xl font-medium">${d.value}</span>
                        </div>
                    `).join('')}
                </div>
                <a href="https://wa.me/5515998440267" target="_blank" class="w-full bg-black text-white px-16 py-6 text-[11px] uppercase tracking-[0.4em] font-bold hover:bg-gold transition-all text-center block">Solicitar Atendimento Private</a>
            </div>
        </div>
    `;
    nodes.home.classList.add('hidden');
    nodes.detail.classList.remove('hidden');
    nodes.navbar.classList.add('nav-scrolled');
    window.scrollTo(0, 0);
    initIcons();
    startAutoSlide(totalImgs);
}

function showHome() {
    stopAutoSlide();
    nodes.detail.classList.add('hidden');
    nodes.home.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.scrollY < 50) nodes.navbar.classList.remove('nav-scrolled');
    initIcons();
}

window.addEventListener('scroll', () => {
    if (!nodes.home.classList.contains('hidden')) {
        window.scrollY > 50 ? nodes.navbar.classList.add('nav-scrolled') : nodes.navbar.classList.remove('nav-scrolled');
    }
}, { passive: true });

window.addEventListener('DOMContentLoaded', () => {
    filterPortfolio('todos', false); // Não faz scroll no carregamento inicial
    initIcons();
});