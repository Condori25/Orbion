document.addEventListener('DOMContentLoaded', function () {

  /* ===== 1. TELA DE CARREGAMENTO ===== */
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    // Esconde a tela depois de 2 segundos
    window.setTimeout(function () {
      loadingScreen.classList.add('hidden');
    }, 2000);
  }

  /* ===== 2. MENU LATERAL ===== */
  const menuButton = document.getElementById('menu-button');
  const closeButton = document.getElementById('close-button');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  function openMenu() {
    sidebar.classList.add('open');
    overlay.classList.add('open');
  }
  function closeMenu() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  }

  if (menuButton) menuButton.addEventListener('click', openMenu);
  if (closeButton) closeButton.addEventListener('click', closeMenu);
  if (overlay) overlay.addEventListener('click', closeMenu);

  /* ===== 3. DARK MODE ===== */
  const themeButton = document.getElementById('theme-button');

  // Carrega preferência salva
  if (localStorage.getItem('orbion-theme') === 'dark') {
    document.body.classList.add('dark');
  }

  if (themeButton) {
    themeButton.addEventListener('click', function () {
      document.body.classList.toggle('dark');
      // Salva a preferência
      if (document.body.classList.contains('dark')) {
        localStorage.setItem('orbion-theme', 'dark');
      } else {
        localStorage.setItem('orbion-theme', 'light');
      }
    });
  }

  /* ===== 4. BUSCA ===== */
  const searchButton = document.getElementById('search-button');
  const searchModal = document.getElementById('search-modal');
  const searchClose = document.getElementById('search-close');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');

  // Conteúdo do site para buscar (palavras-chave)
  const conteudoSite = [
    { titulo: 'Início', descricao: 'Página principal da Orbion', url: 'index.html', palavras: 'inicio home principal planeta sustentavel' },
    { titulo: 'Projeto Vida Azul', descricao: 'Preservação dos oceanos 2026-2030', url: 'projetos.html', palavras: 'vida azul oceano mar agua projeto peixes' },
    { titulo: 'Projeto Vida Verde', descricao: 'Preservação das florestas 2020-2025', url: 'projetos.html', palavras: 'vida verde floresta arvores amazonia projeto' },
    { titulo: 'Projetos', descricao: 'Conheça todos os nossos projetos', url: 'projetos.html', palavras: 'projetos iniciativas trabalhos' },
    { titulo: 'Sobre a Orbion', descricao: 'Nossa história e estrutura', url: 'sobre.html', palavras: 'sobre historia estrutura stakeholders 1992 começo empresa' },
    { titulo: 'Contato', descricao: 'Entre em contato conosco', url: 'contato.html', palavras: 'contato email telefone fale conosco endereco' },
  ];

  function openSearch() {
    searchModal.classList.add('open');
    window.setTimeout(function () { searchInput.focus(); }, 100);
  }
  function closeSearch() {
    searchModal.classList.remove('open');
    searchInput.value = '';
    mostrarResultados('');
  }

  function mostrarResultados(termo) {
    termo = termo.toLowerCase().trim();

    if (termo === '') {
      searchResults.innerHTML = '<p class="search-hint">Digite para buscar no site</p>';
      return;
    }

    // Filtra os resultados por palavra
    const encontrados = conteudoSite.filter(function (item) {
      return item.titulo.toLowerCase().includes(termo) ||
             item.descricao.toLowerCase().includes(termo) ||
             item.palavras.toLowerCase().includes(termo);
    });

    if (encontrados.length === 0) {
      searchResults.innerHTML = '<p class="search-hint">Nenhum resultado encontrado para "' + termo + '"</p>';
      return;
    }

    let html = '';
    encontrados.forEach(function (item) {
      html += '<a href="' + item.url + '" class="search-result-item">' +
                '<strong>' + item.titulo + '</strong>' +
                '<span>' + item.descricao + '</span>' +
              '</a>';
    });
    searchResults.innerHTML = html;
  }

  if (searchButton) searchButton.addEventListener('click', openSearch);
  if (searchClose) searchClose.addEventListener('click', closeSearch);
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      mostrarResultados(searchInput.value);
    });
  }

  // Fecha busca ao clicar fora ou apertar ESC
  if (searchModal) {
    searchModal.addEventListener('click', function (e) {
      if (e.target === searchModal) closeSearch();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeSearch();
      closeMenu();
    }
    // Atalho Ctrl+K para abrir busca
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  });

  /* ===== 5. ANIMAÇÃO AO ROLAR (SCROLL REVEAL) ===== */
  const elementosAnimados = document.querySelectorAll('.scroll-animate');

  const observador = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (entrada) {
      if (entrada.isIntersecting) {
        entrada.target.classList.add('visible');
      }
    });
  }, { threshold: 0.15 });

  elementosAnimados.forEach(function (el) {
    observador.observe(el);
  });

  /* ===== 6. FORMULÁRIO DE CONTATO ===== */
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      alert('Mensagem enviada com sucesso! Obrigado pelo contato.');
      contactForm.reset();
    });
  }

});