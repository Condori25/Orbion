
document.addEventListener("DOMContentLoaded", async () => {
    const API_BASE_URL = "https://orbion-api.onrender.com";
    const lista = document.getElementById("lista-projetos");

    try {
        const resposta = await fetch(`${API_BASE_URL}/api/projetos`);

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar os projetos.");
        }

        const projetos = await resposta.json();

        lista.replaceChildren();

        if (projetos.length === 0) {
            lista.textContent = "Nenhum projeto disponível no momento.";
            return;
        }

        const observer = "IntersectionObserver" in window
            ? new IntersectionObserver((entradas) => {
                entradas.forEach(entrada => {
                    if (entrada.isIntersecting) {
                        entrada.target.classList.add("visible");
                        observer.unobserve(entrada.target);
                    }
                });
            }, { threshold: 0.1 })
            : null;

        projetos.forEach((projeto, index) => {
            const titulo = projeto.titulo || "Projeto sem título";
            const tituloNormalizado = titulo.toLowerCase();

            const banner = document.createElement("a");
            banner.className = "project-banner scroll-animate";
            banner.href = `detalhes-projeto.html?id=${encodeURIComponent(projeto.id_projeto)}`;
            banner.setAttribute("aria-label", `Ver detalhes de ${titulo}`);

            if (index > 0) {
                banner.classList.add("delay-100");
            }

            if (tituloNormalizado.includes("azul")) {
                banner.classList.add("project-azul");
            } else if (tituloNormalizado.includes("verde")) {
                banner.classList.add("project-verde");
            }

            let imagem = projeto.imagem_url;

            if (!imagem && tituloNormalizado.includes("azul")) {
                imagem = "images/ocean.jpg";
            } else if (!imagem && tituloNormalizado.includes("verde")) {
                imagem = "images/forest.jpg";
            }

            if (imagem) {
                banner.style.backgroundImage = `url("${imagem.replace(/["\\]/g, "")}")`;
            }

            const conteudo = document.createElement("div");
            conteudo.className = "project-banner-content";

            const tituloElemento = document.createElement("h3");
            tituloElemento.textContent = titulo;

            const periodo = document.createElement("p");

            const anoInicio = projeto.data_inicio
                ? projeto.data_inicio.substring(0, 4)
                : "";

            const anoFim = projeto.data_fim
                ? projeto.data_fim.substring(0, 4)
                : "";

            if (anoInicio && anoFim) {
                periodo.textContent = `${anoInicio} - ${anoFim}`;
            } else if (anoInicio) {
                periodo.textContent = anoInicio;
            }

            conteudo.append(tituloElemento);

            if (periodo.textContent) {
                conteudo.append(periodo);
            }

            banner.append(conteudo);
            lista.append(banner);

            if (observer) {
                observer.observe(banner);
            } else {
                banner.classList.add("visible");
            }
        });

    } catch (erro) {
        console.error("Erro ao carregar projetos:", erro);
        lista.textContent = "Não foi possível carregar os projetos. Tente novamente mais tarde.";
    }
});
