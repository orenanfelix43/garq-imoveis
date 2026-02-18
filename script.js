// Inicializa ícones do Lucide
lucide.createIcons();

// Banco de Dados dos Imóveis
const imoveisData = {
    'mansao-solar': {
        titulo: 'Mansão Solar | Fazenda Alvorada',
        subtitulo: 'Residência de Elite • Interior de SP',
        imagem: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        descricao: 'Uma obra-prima arquitetônica que equilibra materiais naturais e design contemporâneo.',
        detalhes: [
            { label: 'Área Terreno', value: '2.500 m²' },
            { label: 'Suítes', value: '06 Master' },
            { label: 'Vagas', value: '10 Carros' }
        ]
    },
    'lote-vista-lago': {
        titulo: 'Lote Vista Lago',
        subtitulo: 'Ativo Estratégico • Terreno Premium',
        imagem: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
        descricao: 'Oportunidade rara para construção personalizada com vista perene para o lago.',
        detalhes: [
            { label: 'Área Total', value: '3.100 m²' },
            { label: 'Frente', value: '45 metros' },
            { label: 'Localização', value: 'Setor Gold' }
        ]
    },
    'residencia-glass': {
        titulo: 'Residência Glass',
        subtitulo: 'Arquitetura Minimalista • São Paulo',
        imagem: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
        descricao: 'Transparência e luz definem esta residência urbana com o máximo em tecnologia.',
        detalhes: [
            { label: 'Área Útil', value: '620 m²' },
            { label: 'Suítes', value: '04 Amplas' },
            { label: 'Diferencial', value: 'Rooftop Lounge' }
        ]
    }
};

const homePage = document.getElementById('home-page');
const detailPage = document.getElementById('detail-page');
const detailContent = document.getElementById('detail-content');
const cardsContainer = document.getElementById('cards-container');
const navbar = document.getElementById('navbar');

// Renderiza portfólio dinamicamente
function renderCards() {
    if (!cardsContainer) return;
    cardsContainer.innerHTML = '';
    Object.keys(imoveisData).forEach(key => {
        const item = imoveisData[key];
        const card = `
            <div class="glass-card group overflow-hidden cursor-pointer" onclick="openDetail('${key}')">
                <div class="h-80 overflow-hidden">
                    <img src="${item.imagem}" alt="${item.titulo}" class="w-full h-full object-cover transition duration-1000 group-hover:scale-110">
                </div>
                <div class="p-8">
                    <h3 class="text-xl font-serif text-white mb-2">${item.titulo}</h3>
                    <p class="text-[10px] uppercase tracking-widest text-gold mb-6">${item.subtitulo}</p>
                    <span class="text-gold text-[9px] uppercase tracking-[0.3em] font-bold">Ver Ficha Técnica →</span>
                </div>
            </div>
        `;
        cardsContainer.innerHTML += card;
    });
}

// Abre página de detalhes
function openDetail(id) {
    const data = imoveisData[id];
    if (!data) return;
    const message = encodeURIComponent(`Olá, gostaria de saber mais sobre o ativo: ${data.titulo}`);
    detailContent.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <img src="${data.imagem}" class="w-full h-auto shadow-xl" alt="Foto">
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
                <a href="https://wa.me/5515998440267?text=${message}" target="_blank" class="w-full bg-black text-white px-16 py-6 text-[11px] uppercase tracking-[0.4em] font-bold hover:bg-gold hover:text-black transition-all text-center block shadow-2xl">
                    Consultar via WhatsApp
                </a>
            </div>
        </div>
    `;
    homePage.classList.add('hidden-page');
    detailPage.classList.remove('hidden-page');
    window.scrollTo(0, 0);
    navbar.classList.add('nav-scrolled');
}

function showHome() {
    detailPage.classList.add('hidden-page');
    homePage.classList.remove('hidden-page');
    if (window.scrollY < 50) navbar.classList.remove('nav-scrolled');
}

function acceptCookies() {
    localStorage.setItem('cookies_accepted', 'true');
    document.getElementById('cookie-banner').style.display = 'none';
}

window.onload = function() {
    if (!localStorage.getItem('cookies_accepted')) {
        const banner = document.getElementById('cookie-banner');
        if(banner) banner.style.display = 'flex';
    }
};

function disableF12(e) {
    if (e.keyCode == 123 || (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 74 || e.keyCode == 67)) || (e.ctrlKey && e.keyCode == 85)) {
        return false;
    }
}

window.addEventListener('scroll', () => {
    if (homePage && !homePage.classList.contains('hidden-page')) {
        if (window.scrollY > 50) navbar.classList.add('nav-scrolled');
        else navbar.classList.remove('nav-scrolled');
    }
});

renderCards();