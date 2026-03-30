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

let nodes = {};

function mapNodes() {
    nodes = {
        home: document.getElementById('home-page'),
        detail: document.getElementById('detail-page'),
        detailContent: document.getElementById('detail-content'),
        container: document.getElementById('cards-container'),
        navbar: document.getElementById('navbar'),
        title: document.getElementById('portfolio-title'),
        videoWrapper: document.getElementById('category-video-wrapper'),
        videoElement: document.getElementById('main-category-video'),
        videoLabel: document.getElementById('video-label'),
        videoTitle: document.getElementById('video-title')
    };
}

window.addEventListener('DOMContentLoaded', () => {
    mapNodes(); // Mapeia os elementos apenas quando o HTML carregar
    if (nodes.home) {
        filterPortfolio('todos', false);
        initIcons();
    }
});

let currentSlide = 0;
let slideInterval;

function initIcons() {
    if (window.lucide) window.lucide.createIcons();
}

function updateCategoryVideo(filterType) {
    if (!nodes.videoWrapper || !nodes.videoElement) return;

    const videoSrc = categoryVideos[filterType] || categoryVideos['todos'];
    const displayLabel = `Experiência GARQ • ${filterType === 'todos' ? 'Institucional' : filterType}`;
    const mainTitle = filterType === 'todos' ? 'Estratégia e Solidez' : `${filterType}s Exclusivos`;

    // 1. Mostramos o container (se estiver escondido)
    nodes.videoWrapper.classList.remove('h-0', 'mb-0', 'opacity-0');
    nodes.videoWrapper.classList.add('h-[280px]', 'md:h-[450px]', 'opacity-100', 'mb-16');

    // 2. Atualizamos apenas o que mudou (ATUALIZAÇÃO CIRÚRGICA)
    if (nodes.videoElement.src !== videoSrc) {
        nodes.videoElement.src = videoSrc;
        nodes.videoElement.load(); // Força o carregamento da nova fonte
    }

    nodes.videoLabel.textContent = displayLabel; // Seguro
    nodes.videoTitle.textContent = mainTitle;     // Seguro
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

    if (nodes.title) nodes.title.innerText = titles[filterType] || titles.todos;

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
            // CÓDIGO CORRIGIDO (SEGURO)
            filteredKeys.forEach(key => {
                const item = imoveisData[key];

                // 1. Criamos o elemento principal
                const card = document.createElement('div');
                card.className = "glass-card group overflow-hidden cursor-pointer fade-in";

                // Usar addEventListener garante que o clique funcione mesmo em elementos dinâmicos
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    openDetail(key); // O 'key' aqui é o ID como 'mansao-solar'
                });

                // 2. Criamos a estrutura de imagem com segurança
                const imgWrapper = document.createElement('div');
                imgWrapper.className = "h-80 overflow-hidden";

                const img = document.createElement('img');
                img.src = item.imagens[0]; // Atribuição direta de propriedade é segura
                img.className = "w-full h-full object-cover transition duration-1000 group-hover:scale-110";
                imgWrapper.appendChild(img);

                // 3. Criamos o container de texto
                const infoDiv = document.createElement('div');
                infoDiv.className = "p-8";

                const title = document.createElement('h3');
                title.className = "text-xl font-serif text-white mb-2";
                // USAMOS textContent EM VEZ DE innerHTML
                title.textContent = item.titulo;

                const sub = document.createElement('p');
                sub.className = "text-[10px] uppercase tracking-widest text-gold mb-6";
                sub.textContent = item.subtitulo;

                const linkText = document.createElement('span');
                linkText.className = "text-gold text-[9px] uppercase tracking-[0.3em] font-bold";
                linkText.textContent = "Ver Ficha Técnica →";

                // 4. Montamos a árvore (Append)
                infoDiv.appendChild(title);
                infoDiv.appendChild(sub);
                infoDiv.appendChild(linkText);

                card.appendChild(imgWrapper);
                card.appendChild(infoDiv);

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
    // 1. Reset de estado interno
    currentSlide = 0;
    stopAutoSlide(); // Garante que nenhum timer anterior fique rodando
    const totalImgs = data.imagens.length;

    // Limpa e reconstrói de forma segura
    function openDetail(id) {
        const data = imoveisData[id];
        const fragment = document.createDocumentFragment();
        const container = document.createElement('div');
        container.className = "grid grid-cols-1 lg:grid-cols-2 gap-16 items-start";

        // Use uma função auxiliar para gerar o conteúdo interno com segurança
        container.innerHTML = generateDetailTemplate(data);

        fragment.appendChild(container);
        nodes.detailContent.replaceChildren(fragment); // Mais rápido que innerHTML = ''
    }
    const grid = document.createElement('div');
    grid.className = "grid grid-cols-1 lg:grid-cols-2 gap-16 items-start";

    // Conteúdo (Texto e Imagens)
    grid.innerHTML = `
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
    `;

    nodes.detailContent.replaceChildren(grid);
    nodes.home.classList.add('hidden');
    nodes.detail.classList.remove('hidden');
    nodes.navbar.classList.add('nav-scrolled');
    window.scrollTo(0, 0);
    initIcons();
    startAutoSlide(totalImgs);
    refreshUI();
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

// Adicione esta proteção no final do seu script.js
window.addEventListener('DOMContentLoaded', () => {
    // Verifica se todos os nós críticos existem antes de iniciar
    const requiredNodes = ['home-page', 'cards-container', 'navbar'];
    const missing = requiredNodes.filter(id => !document.getElementById(id));

    if (missing.length === 0) {
        filterPortfolio('todos', false);
        initIcons();
    } else {
        console.error("Erro Crítico: IDs faltando no HTML:", missing);
    }
});

function refreshUI() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

window.addEventListener('load', () => {
    mapNodes();
    refreshUI();
});