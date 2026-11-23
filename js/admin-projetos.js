
document.addEventListener("DOMContentLoaded", () => {

    const API_BASE_URL = "https://orbion-api.onrender.com";

    const token = sessionStorage.getItem("orbion-token");

    const formulario = document.getElementById("form-projeto");
    const lista = document.getElementById("lista-projetos");
    const tituloFormulario = document.getElementById("form-titulo");
    const botaoCancelar = document.getElementById("btn-cancelar");

    // Verifica se existe um token de administrador.
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {
        const payload = JSON.parse(
            atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
        );

        if (payload.is_admin !== true) {
            alert("Acesso permitido somente para administradores.");
            window.location.href = "perfil.html";
            return;
        }

    } catch (erro) {
        sessionStorage.removeItem("orbion-token");
        sessionStorage.removeItem("orbion-id-voluntario");
        window.location.href = "login.html";
        return;
    }

    // Faz requisições para a API.
    async function requisicaoAPI(url, opcoes = {}) {

        const resposta = await fetch(`${API_BASE_URL}${url}`, {
            ...opcoes,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                ...opcoes.headers
            }
        });

        const resultado = await resposta.json().catch(() => ({}));

        if (resposta.status === 401) {
            sessionStorage.removeItem("orbion-token");
            sessionStorage.removeItem("orbion-id-voluntario");
            window.location.href = "login.html";
            throw new Error("Sessão expirada.");
        }

        if (!resposta.ok) {
            throw new Error(
                resultado.detail || resultado.mensagem || "Ocorreu um erro na operação."
            );
        }

        return resultado;
    }

    // Lista os projetos cadastrados.
    async function carregarProjetos() {

        lista.textContent = "Carregando projetos...";

        try {
            const projetos = await requisicaoAPI("/api/projetos");

            lista.replaceChildren();

            if (projetos.length === 0) {
                lista.textContent = "Nenhum projeto cadastrado.";
                return;
            }

            projetos.forEach(projeto => {

                const card = document.createElement("div");
                card.className = "admin-projeto-card";

                const titulo = document.createElement("h3");
                titulo.textContent = projeto.titulo;

                const descricao = document.createElement("p");
                descricao.textContent = projeto.descricao;

                const status = document.createElement("p");
                status.textContent = `Status: ${projeto.status}`;

                const editar = document.createElement("button");
                editar.type = "button";
                editar.textContent = "Editar";

                editar.addEventListener("click", () => {
                    preencherFormulario(projeto);
                });

                const excluir = document.createElement("button");
                excluir.type = "button";
                excluir.textContent = "Excluir";

                excluir.addEventListener("click", () => {
                    excluirProjeto(projeto.id_projeto);
                });

                card.append(
                    titulo,
                    descricao,
                    status,
                    editar,
                    excluir
                );

                lista.appendChild(card);
            });

        } catch (erro) {
            lista.textContent = erro.message;
        }
    }

    // Preenche o formulário para edição.
    function preencherFormulario(projeto) {

        document.getElementById("id_projeto").value = projeto.id_projeto;
        document.getElementById("titulo").value = projeto.titulo;
        document.getElementById("descricao").value = projeto.descricao;
        document.getElementById("data_inicio").value = projeto.data_inicio;
        document.getElementById("data_fim").value = projeto.data_fim || "";
        document.getElementById("status").value = projeto.status;
        document.getElementById("imagem_url").value = projeto.imagem_url || "";
        document.getElementById("objetivos").value = projeto.objetivos || "";
        document.getElementById("publico_alvo").value = projeto.publico_alvo || "";
        document.getElementById("metodologia").value = projeto.metodologia || "";
        document.getElementById("resultados_esperados").value =
            projeto.resultados_esperados || "";

        tituloFormulario.textContent = "Editar projeto";
        document.getElementById("btn-salvar").textContent = "Salvar alterações";
        botaoCancelar.hidden = false;

        formulario.scrollIntoView({
            behavior: "smooth"
        });
    }

    // Cadastra ou atualiza um projeto.
    formulario.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        const idProjeto = document.getElementById("id_projeto").value;

        const dados = {
            titulo: document.getElementById("titulo").value.trim(),
            descricao: document.getElementById("descricao").value.trim(),
            data_inicio: document.getElementById("data_inicio").value,
            data_fim: document.getElementById("data_fim").value || null,
            status: document.getElementById("status").value,
            imagem_url: document.getElementById("imagem_url").value.trim() || null,
            objetivos: document.getElementById("objetivos").value.trim() || null,
            publico_alvo: document.getElementById("publico_alvo").value.trim() || null,
            metodologia: document.getElementById("metodologia").value.trim() || null,
            resultados_esperados:
                document.getElementById("resultados_esperados").value.trim() || null
        };

        try {

            const url = idProjeto
                ? `/api/projetos/${idProjeto}`
                : "/api/projetos";

            const metodo = idProjeto ? "PUT" : "POST";

            const resultado = await requisicaoAPI(url, {
                method: metodo,
                body: JSON.stringify(dados)
            });

            alert(resultado.mensagem);

            formulario.reset();
            limparEdicao();
            carregarProjetos();

        } catch (erro) {
            alert(erro.message);
        }
    });

    // Cancela a edição.
    function limparEdicao() {

        document.getElementById("id_projeto").value = "";
        tituloFormulario.textContent = "Cadastrar novo projeto";
        document.getElementById("btn-salvar").textContent = "Salvar projeto";
        botaoCancelar.hidden = true;
    }

    botaoCancelar.addEventListener("click", () => {
        formulario.reset();
        limparEdicao();
    });

    // Exclui um projeto.
    async function excluirProjeto(idProjeto) {

        const confirmar = confirm(
            "Tem certeza de que deseja excluir este projeto?"
        );

        if (!confirmar) return;

        try {

            const resultado = await requisicaoAPI(
                `/api/projetos/${idProjeto}`,
                {
                    method: "DELETE"
                }
            );

            alert(resultado.mensagem);
            carregarProjetos();

        } catch (erro) {
            alert(erro.message);
        }
    }

    // Carrega os projetos ao abrir a página.
    carregarProjetos();

});
