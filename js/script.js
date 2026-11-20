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
  { titulo: 'Cadastro', descricao: 'Cadastre-se como voluntário', url: 'cadastro.html', palavras: 'cadastro registrar criar conta voluntario inscrição' },
  { titulo: 'Login', descricao: 'Acesse sua conta de voluntário', url: 'login.html', palavras: 'login entrar acessar conta senha' },
  { titulo: 'Meu Perfil', descricao: 'Consulte seus dados e competências', url: 'perfil.html', palavras: 'perfil meus dados voluntario competencias areas interesse' }
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
  contactForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const botao = contactForm.querySelector('button[type="submit"]');
    botao.disabled = true;
    botao.textContent = 'Enviando...';

    const dados = {
      nome: contactForm.querySelector('[name="nome"]').value.trim(),
      email: contactForm.querySelector('[name="email"]').value.trim(),
      assunto: contactForm.querySelector('[name="assunto"]').value.trim(),
      mensagem: contactForm.querySelector('[name="mensagem"]').value.trim()
    };

    try {
      const resposta = await fetch('https://orbion-api.onrender.com/api/contato', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados)
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(resultado.detail || 'Erro ao enviar mensagem.');
      }

      alert('Mensagem enviada com sucesso! Obrigado pelo contato.');
      contactForm.reset();

    } catch (erro) {
      console.error('Erro:', erro);
      alert('Não foi possível enviar sua mensagem. Tente novamente.');

    } finally {
      botao.disabled = false;
      botao.textContent = 'Enviar mensagem';
    }
  });
}


  // ===== CADASTRO DE VOLUNTÁRIO =====
  const cadastroForm = document.getElementById("register-form");

  if (cadastroForm) {
    const API_BASE_URL = "https://orbion-api.onrender.com";
    const areasContainer = document.getElementById("register-areas");
    const competenciasContainer = document.getElementById("register-competencias");
    const cadastroMessage = document.getElementById("register-message");
    const nascimentoInput = document.getElementById("register-nascimento");

    // Idade mínima: 15 anos
    const hoje = new Date();
    const limiteNascimento = new Date(
      hoje.getFullYear() - 15,
      hoje.getMonth(),
      hoje.getDate()
    );

    nascimentoInput.max = [
      limiteNascimento.getFullYear(),
      String(limiteNascimento.getMonth() + 1).padStart(2, "0"),
      String(limiteNascimento.getDate()).padStart(2, "0")
    ].join("-");

    // Carregar áreas de interesse
    async function carregarAreas() {
      try {
        const resposta = await fetch(`${API_BASE_URL}/api/areas-interesse`);

        if (!resposta.ok) {
          throw new Error("Não foi possível carregar as áreas.");
        }

        const areas = await resposta.json();
        areasContainer.innerHTML = "";

        areas.forEach(area => {
          const item = document.createElement("label");
          item.className = "register-option";

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.name = "areas_interesse";
          checkbox.value = area.id_area;

          const nome = document.createElement("span");
          nome.textContent = area.nome;

          item.append(checkbox, nome);
          areasContainer.appendChild(item);
        });

        if (areas.length === 0) {
          areasContainer.textContent = "Nenhuma área cadastrada.";
        }
      } catch (erro) {
        areasContainer.textContent = "Erro ao carregar as áreas de interesse.";
        console.error(erro);
      }
    }

    // Carregar competências
    async function carregarCompetencias() {
      try {
        const resposta = await fetch(`${API_BASE_URL}/api/competencias`);

        if (!resposta.ok) {
          throw new Error("Não foi possível carregar as competências.");
        }

        const competencias = await resposta.json();
        competenciasContainer.innerHTML = "";

        competencias.forEach(competencia => {
          const grupo = document.createElement("div");
          grupo.className = "form-group";

          const label = document.createElement("label");
          label.textContent = competencia.nome;

          const select = document.createElement("select");
          select.dataset.competenciaId = competencia.id_competencia;

          const opcaoInicial = document.createElement("option");
          opcaoInicial.value = "";
          opcaoInicial.textContent = "Não selecionar";
          select.appendChild(opcaoInicial);

          [
            ["Basico", "Básico"],
            ["Intermediario", "Intermediário"],
            ["Avancado", "Avançado"]
          ].forEach(([valor, texto]) => {
            const opcao = document.createElement("option");
            opcao.value = valor;
            opcao.textContent = texto;
            select.appendChild(opcao);
          });

          grupo.append(label, select);
          competenciasContainer.appendChild(grupo);
        });

        if (competencias.length === 0) {
          competenciasContainer.textContent = "Nenhuma competência cadastrada.";
        }
      } catch (erro) {
        competenciasContainer.textContent = "Erro ao carregar as competências.";
        console.error(erro);
      }
    }

    carregarAreas();
    carregarCompetencias();

    // Enviar cadastro
    cadastroForm.addEventListener("submit", async function(event) {
      event.preventDefault();

      cadastroMessage.textContent = "";
      cadastroMessage.style.color = "";

      const senha = document.getElementById("register-senha").value;
      const confirmarSenha = document.getElementById("register-confirmar-senha").value;

      if (senha !== confirmarSenha) {
        cadastroMessage.textContent = "As senhas não coincidem.";
        cadastroMessage.style.color = "#d93025";
        return;
      }

      if (senha.length < 8) {
        cadastroMessage.textContent = "A senha deve ter pelo menos 8 caracteres.";
        cadastroMessage.style.color = "#d93025";
        return;
      }

      const areasSelecionadas = Array.from(
        cadastroForm.querySelectorAll('input[name="areas_interesse"]:checked')
      ).map(input => Number(input.value));

      const competenciasSelecionadas = Array.from(
        competenciasContainer.querySelectorAll("select")
      )
        .filter(select => select.value !== "")
        .map(select => ({
          id_competencia: Number(select.dataset.competenciaId),
          nivel: select.value
        }));

      const dadosCadastro = {
        nome: document.getElementById("register-nome").value.trim(),
        telefone: document.getElementById("register-telefone").value.trim(),
        email: document.getElementById("register-email").value.trim(),
        senha: senha,
        data_nascimento: nascimentoInput.value,
        areas_interesse: areasSelecionadas,
        competencias: competenciasSelecionadas
      };

      const botao = cadastroForm.querySelector('button[type="submit"]');
      botao.disabled = true;
      botao.textContent = "Enviando...";
      cadastroMessage.textContent = "Enviando seu cadastro...";

      try {
        const resposta = await fetch(`${API_BASE_URL}/api/cadastro`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(dadosCadastro)
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
          const detalhe = resultado.detail;
          throw new Error(
            typeof detalhe === "string"
              ? detalhe
              : "Não foi possível realizar o cadastro."
          );
        }

        cadastroMessage.textContent =
          "Cadastro realizado com sucesso! Bem-vindo à Orbion.";
        cadastroMessage.style.color = "#699658";

        cadastroForm.reset();
      } catch (erro) {
        cadastroMessage.textContent = erro.message;
        cadastroMessage.style.color = "#d93025";
        console.error("Erro no cadastro:", erro);
      } finally {
        botao.disabled = false;
        botao.textContent = "Criar minha conta";
      }
    });
  }


  // ===== LOGIN DE VOLUNTÁRIO =====
  const loginForm = document.getElementById("login-form");

  if (loginForm) {
    const API_BASE_URL = "https://orbion-api.onrender.com";
    const loginMessage = document.getElementById("login-message");

    loginForm.addEventListener("submit", async function(event) {
      event.preventDefault();

      loginMessage.textContent = "";
      loginMessage.style.color = "";

      const email = document.getElementById("login-email").value.trim();
      const senha = document.getElementById("login-senha").value;

      const botao = loginForm.querySelector('button[type="submit"]');

      botao.disabled = true;
      botao.textContent = "Entrando...";

      try {
        const resposta = await fetch(`${API_BASE_URL}/api/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, senha })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
          const detalhe = resultado.detail;

          throw new Error(
            typeof detalhe === "string"
              ? detalhe
              : "Não foi possível realizar o login."
          );
        }

        sessionStorage.setItem("orbion-token", resultado.access_token);
        sessionStorage.setItem(
          "orbion-id-voluntario",
          resultado.id_voluntario
        );

        window.location.href = "perfil.html";

        loginMessage.textContent = "Login realizado com sucesso!";
        loginMessage.style.color = "#699658";

        loginForm.reset();

      } catch (erro) {
        loginMessage.textContent = erro.message;
        loginMessage.style.color = "#d93025";
        console.error("Erro no login:", erro);

      } finally {
        botao.disabled = false;
        botao.textContent = "Entrar";
      }
    });
  }


  // ===== PERFIL DO VOLUNTÁRIO =====
  
  // ===== PERFIL DO VOLUNTÁRIO =====
  const perfilLoading = document.getElementById("profile-loading");

  if (perfilLoading) {
    const API_BASE_URL = "https://orbion-api.onrender.com";
    const token = sessionStorage.getItem("orbion-token");
    const perfilMessage = document.getElementById("profile-message");
    const perfilForm = document.getElementById("profile-form");
    const areasContainer = document.getElementById("perfil-areas");
    const competenciasContainer = document.getElementById("perfil-competencias");

    async function carregarPerfil() {
      if (!token) {
        window.location.href = "login.html";
        return;
      }

      try {
        const [respostaPerfil, respostaAreas, respostaCompetencias] =
          await Promise.all([
            fetch(`${API_BASE_URL}/api/perfil`, {
              headers: { "Authorization": `Bearer ${token}` }
            }),
            fetch(`${API_BASE_URL}/api/areas-interesse`),
            fetch(`${API_BASE_URL}/api/competencias`)
          ]);

        const resultado = await respostaPerfil.json();

        if (respostaPerfil.status === 401) {
          sessionStorage.removeItem("orbion-token");
          sessionStorage.removeItem("orbion-id-voluntario");
          window.location.href = "login.html";
          return;
        }

        if (!respostaPerfil.ok) {
          throw new Error(
            typeof resultado.detail === "string"
              ? resultado.detail
              : "Não foi possível carregar o perfil."
          );
        }

        if (!respostaAreas.ok || !respostaCompetencias.ok) {
          throw new Error("Não foi possível carregar as opções do perfil.");
        }

        const areas = await respostaAreas.json();
        const competencias = await respostaCompetencias.json();
        const voluntario = resultado.voluntario;

        // Preencher dados pessoais
        document.getElementById("perfil-nome").value = voluntario.nome;
        document.getElementById("perfil-email").value = voluntario.email;
        document.getElementById("perfil-telefone").value =
          voluntario.telefone || "";

        document.getElementById("perfil-nascimento").value =
          new Date(voluntario.data_nascimento + "T00:00:00")
            .toLocaleDateString("pt-BR");

        // Áreas de interesse
        areasContainer.replaceChildren();

        const areasSelecionadas = new Set(
          resultado.areas_interesse.map(area => Number(area.id_area))
        );

        areas.forEach(area => {
          const item = document.createElement("label");
          item.className = "register-option";

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.name = "areas_interesse";
          checkbox.value = area.id_area;
          checkbox.checked = areasSelecionadas.has(Number(area.id_area));

          const nome = document.createElement("span");
          nome.textContent = area.nome;

          item.append(checkbox, nome);
          areasContainer.appendChild(item);
        });

        if (areas.length === 0) {
          areasContainer.textContent = "Nenhuma área cadastrada.";
        }

        // Competências
        competenciasContainer.replaceChildren();

        const competenciasAtuais = new Map(
          resultado.competencias.map(competencia => [
            Number(competencia.id_competencia),
            competencia.nivel
          ])
        );

        competencias.forEach(competencia => {
          const grupo = document.createElement("div");
          grupo.className = "form-group";

          const identificador = competencia.id_competencia;
          const nivelAtual = competenciasAtuais.get(Number(identificador));

          const label = document.createElement("label");
          label.className = "register-option";

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.name = "competencias";
          checkbox.value = identificador;
          checkbox.checked = Boolean(nivelAtual);

          const nome = document.createElement("span");
          nome.textContent = competencia.nome;

          label.append(checkbox, nome);

          const select = document.createElement("select");
          select.dataset.competenciaId = identificador;
          select.disabled = !checkbox.checked;

          [
            ["Basico", "Básico"],
            ["Intermediario", "Intermediário"],
            ["Avancado", "Avançado"]
          ].forEach(([valor, texto]) => {
            const opcao = document.createElement("option");
            opcao.value = valor;
            opcao.textContent = texto;
            opcao.selected = valor === nivelAtual;
            select.appendChild(opcao);
          });

          checkbox.addEventListener("change", function () {
            select.disabled = !checkbox.checked;
          });

          grupo.append(label, select);
          competenciasContainer.appendChild(grupo);
        });

        if (competencias.length === 0) {
          competenciasContainer.textContent =
            "Nenhuma competência cadastrada.";
        }

      } catch (erro) {
        perfilMessage.textContent = erro.message;
        perfilMessage.style.color = "#d93025";
        console.error("Erro ao carregar perfil:", erro);

      } finally {
        perfilLoading.style.display = "none";
      }
    }

    // Salvar alterações do perfil
    perfilForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      perfilMessage.textContent = "";
      perfilMessage.style.color = "";

      const areasSelecionadas = Array.from(
        areasContainer.querySelectorAll(
          'input[name="areas_interesse"]:checked'
        )
      ).map(input => Number(input.value));

      const competenciasSelecionadas = Array.from(
        competenciasContainer.querySelectorAll(
          'input[name="competencias"]:checked'
        )
      ).map(checkbox => {
        const select = competenciasContainer.querySelector(
          `select[data-competencia-id="${checkbox.value}"]`
        );

        return {
          id_competencia: Number(checkbox.value),
          nivel: select.value
        };
      });

      const dados = {
        nome: document.getElementById("perfil-nome").value.trim(),
        telefone:
          document.getElementById("perfil-telefone").value.trim() || null,
        areas_interesse: areasSelecionadas,
        competencias: competenciasSelecionadas
      };

      const botao = perfilForm.querySelector('button[type="submit"]');
      botao.disabled = true;
      botao.textContent = "Salvando...";

      try {
        const resposta = await fetch(`${API_BASE_URL}/api/perfil`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(dados)
        });

        const resultado = await resposta.json();

        if (resposta.status === 401) {
          sessionStorage.removeItem("orbion-token");
          sessionStorage.removeItem("orbion-id-voluntario");
          window.location.href = "login.html";
          return;
        }

        if (!resposta.ok) {
          throw new Error(
            typeof resultado.detail === "string"
              ? resultado.detail
              : "Não foi possível salvar as alterações."
          );
        }

        perfilMessage.textContent = "Perfil atualizado com sucesso!";
        perfilMessage.style.color = "#699658";

      } catch (erro) {
        perfilMessage.textContent = erro.message;
        perfilMessage.style.color = "#d93025";
        console.error("Erro ao salvar perfil:", erro);

      } finally {
        botao.disabled = false;
        botao.textContent = "Salvar alterações";
      }
    });

    carregarPerfil();
  }



  // ===== SAIR DA CONTA =====
  const logoutButton = document.getElementById("logout-button");

  if (logoutButton) {
    logoutButton.addEventListener("click", function () {
      sessionStorage.removeItem("orbion-token");
      sessionStorage.removeItem("orbion-id-voluntario");

      window.location.href = "login.html";
    });
  }


});
