
document.addEventListener("DOMContentLoaded", async () => {
    const API_BASE_URL = "https://orbion-api.onrender.com";

    const tituloElemento = document.getElementById("projeto-titulo");
    const periodoElemento = document.getElementById("projeto-periodo");
    const statusElemento = document.getElementById("projeto-status");
    const imagemContainer = document.getElementById("projeto-imagem-container");
    const imagemElemento = document.getElementById("projeto-imagem");
    const galeriaContainer = document.getElementById("projeto-galeria-container");
const galeriaElemento = document.getElementById("projeto-galeria");
    const conteudo = document.getElementById("projeto-conteudo");

    const parametros = new URLSearchParams(window.location.search);
    const idProjeto = parametros.get("id");

    if (!idProjeto || !/^\d+$/.test(idProjeto)) {
        exibirErro(
            "Projeto não encontrado",
            "O endereço acessado não contém um identificador válido de projeto."
        );
        return;
    }

    try {
        const resposta = await fetch(`${API_BASE_URL}/api/projetos`);

        if (!resposta.ok) {
            throw new Error("Não foi possível consultar os projetos.");
        }

        const projetos = await resposta.json();

        const projeto = projetos.find(
            item => String(item.id_projeto) === idProjeto
        );

        if (!projeto) {
            exibirErro(
                "Projeto não encontrado",
                "O projeto solicitado não está disponível."
            );
            return;
        }

        // Título da página
        tituloElemento.textContent = projeto.titulo;
        document.title = `${projeto.titulo} - Orbion`;

        // Período do projeto
        const inicio = projeto.data_inicio
            ? formatarData(projeto.data_inicio)
            : "";

        const fim = projeto.data_fim
            ? formatarData(projeto.data_fim)
            : "";

        if (inicio && fim) {
            periodoElemento.textContent = `${inicio} — ${fim}`;
        } else if (inicio) {
            periodoElemento.textContent = `Início: ${inicio}`;
        } else if (fim) {
            periodoElemento.textContent = `Término: ${fim}`;
        } else {
            periodoElemento.textContent = "";
        }

        // Status
        statusElemento.textContent = projeto.status || "";

        // Imagem principal
        if (projeto.imagem_url) {
            imagemElemento.src = projeto.imagem_url;
            imagemElemento.alt = `Imagem do projeto ${projeto.titulo}`;
            imagemContainer.hidden = false;

            imagemElemento.addEventListener("error", () => {
                imagemContainer.hidden = true;
            }, { once: true });
        } else {
            imagemContainer.hidden = true;
        }

                // Galeria de imagens
        await carregarGaleria();

        async function carregarGaleria() {
            try {
                const respostaGaleria = await fetch(
                    `${API_BASE_URL}/api/projetos/${idProjeto}/imagens`
                );

                if (!respostaGaleria.ok) {
                    throw new Error("Não foi possível carregar a galeria.");
                }

                const imagens = await respostaGaleria.json();

                galeriaElemento.replaceChildren();

                if (!imagens.length) {
                    galeriaContainer.hidden = true;
                    return;
                }

                imagens.forEach(imagem => {
                    const figura = document.createElement("figure");
                    const foto = document.createElement("img");

                    foto.src = imagem.imagem_url;
                    foto.alt = imagem.descricao || `Imagem do projeto ${projeto.titulo}`;
                    foto.loading = "lazy";

                    figura.appendChild(foto);

                    if (imagem.descricao) {
                        const legenda = document.createElement("figcaption");
                        legenda.textContent = imagem.descricao;
                        figura.appendChild(legenda);
                    }

                    foto.addEventListener("error", () => {
                        figura.remove();

                        if (!galeriaElemento.children.length) {
                            galeriaContainer.hidden = true;
                        }
                    }, { once: true });

                    galeriaElemento.appendChild(figura);
                });

                galeriaContainer.hidden = false;

            } catch (erro) {
                console.error("Erro ao carregar galeria:", erro);
                galeriaContainer.hidden = true;
            }
        }

        // Conteúdo da reportagem
        conteudo.replaceChildren();

        adicionarSecao("Sobre o projeto", projeto.descricao);
        adicionarSecao("Objetivos", projeto.objetivos);
        adicionarSecao("Público-alvo", projeto.publico_alvo);
        adicionarSecao("Metodologia", projeto.metodologia);
        adicionarSecao("Resultados esperados", projeto.resultados_esperados);

        function adicionarSecao(titulo, texto) {
            if (!texto || !texto.trim()) {
                return;
            }

            const secao = document.createElement("section");
            const subtitulo = document.createElement("h2");
            const paragrafo = document.createElement("p");

            subtitulo.textContent = titulo;
            paragrafo.textContent = texto;

            secao.append(subtitulo, paragrafo);
            conteudo.append(secao);
        }

        function formatarData(data) {
            const [ano, mes, dia] = data.substring(0, 10).split("-");
            return `${dia}/${mes}/${ano}`;
        }

    } catch (erro) {
        console.error("Erro ao carregar detalhes do projeto:", erro);

        exibirErro(
            "Erro ao carregar projeto",
            "Não foi possível carregar as informações. Tente novamente mais tarde."
        );
    }

    function exibirErro(titulo, mensagem) {
        tituloElemento.textContent = titulo;
        periodoElemento.textContent = "";
        statusElemento.textContent = "";
        imagemContainer.hidden = true;
        conteudo.textContent = mensagem;
    }
});
