
document.addEventListener("DOMContentLoaded", () => {

    const API_BASE_URL = "https://orbion-api.onrender.com";

    const token = sessionStorage.getItem("orbion-token");

    const formulario = document.getElementById("form-projeto");
    const lista = document.getElementById("lista-projetos");
    const tituloFormulario = document.getElementById("form-titulo");
    const botaoCancelar = document.getElementById("btn-cancelar");
    const botaoSalvar = document.getElementById("btn-salvar");
    
    const campoCapa = document.getElementById("imagem_capa");
const campoGaleria = document.getElementById("imagens-galeria");

const previewCapa = document.getElementById("preview-capa");
const previewGaleria = document.getElementById("preview-galeria");
const galeriaExistente = document.getElementById("galeria-existente");

    let operacaoEmAndamento = false;

    // ==========================================
// PRÉ-VISUALIZAÇÃO DAS IMAGENS
// ==========================================

campoCapa.addEventListener("change", () => {

    previewCapa.replaceChildren();

    const arquivo = campoCapa.files[0];

    if (!arquivo) return;

    const imagem = document.createElement("img");
    imagem.src = URL.createObjectURL(arquivo);
    imagem.alt = "Pré-visualização da capa";
    imagem.style.maxWidth = "200px";
    imagem.style.marginTop = "10px";
    imagem.style.borderRadius = "10px";

    previewCapa.appendChild(imagem);
});

campoGaleria.addEventListener("change", () => {

    previewGaleria.replaceChildren();

    Array.from(campoGaleria.files).forEach(arquivo => {

        const imagem = document.createElement("img");
        imagem.src = URL.createObjectURL(arquivo);
        imagem.alt = "Pré-visualização da galeria";
        imagem.style.width = "110px";
        imagem.style.height = "90px";
        imagem.style.objectFit = "cover";
        imagem.style.borderRadius = "8px";
        imagem.style.margin = "5px";

        previewGaleria.appendChild(imagem);
    });
});

    // ==========================================
    // ESTILOS DOS AVISOS E DO LOADING
    // ==========================================

    const estilos = document.createElement("style");

    estilos.textContent = `
        .admin-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.65);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            z-index: 99999;
            opacity: 0;
            visibility: hidden;
            transition: opacity .25s ease, visibility .25s ease;
        }

        .admin-modal-overlay.ativo {
            opacity: 1;
            visibility: visible;
        }

        .admin-modal {
            background: #fff;
            width: 100%;
            max-width: 420px;
            padding: 35px 28px;
            border-radius: 16px;
            text-align: center;
            box-shadow: 0 15px 50px rgba(0,0,0,.25);
            transform: translateY(15px) scale(.97);
            transition: transform .25s ease;
        }

        .admin-modal-overlay.ativo .admin-modal {
            transform: translateY(0) scale(1);
        }

        .admin-modal-icone {
            width: 65px;
            height: 65px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 18px;
            font-size: 35px;
            font-weight: bold;
        }

        .admin-modal.sucesso .admin-modal-icone {
            background: #e3f8eb;
            color: #16a34a;
        }

        .admin-modal.erro .admin-modal-icone {
            background: #fee2e2;
            color: #dc2626;
        }

        .admin-modal.confirmacao .admin-modal-icone {
            background: #fff3d6;
            color: #d97706;
        }

        .admin-modal h2 {
            color: #222;
            font-size: 22px;
            margin-bottom: 12px;
        }

        .admin-modal p {
            color: #666;
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 25px;
            overflow-wrap: anywhere;
        }

        .admin-modal-botoes {
            display: flex;
            justify-content: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .admin-modal-botoes button {
            border: none;
            padding: 12px 22px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: .2s;
        }

        .admin-modal-botoes button:disabled {
            opacity: .6;
            cursor: not-allowed;
        }

        .admin-modal-btn-principal {
            background: #1677b8;
            color: #fff;
        }

        .admin-modal-btn-principal:hover {
            background: #105f94;
        }

        .admin-modal-btn-excluir {
            background: #dc2626;
            color: #fff;
        }

        .admin-modal-btn-excluir:hover {
            background: #b91c1c;
        }

        .admin-modal-btn-cancelar {
            background: #e5e5e5;
            color: #222;
        }

        .admin-loading {
            display: inline-block;
            width: 17px;
            height: 17px;
            border: 3px solid rgba(255,255,255,.4);
            border-top-color: #fff;
            border-radius: 50%;
            animation: admin-girar .7s linear infinite;
            vertical-align: middle;
            margin-right: 9px;
        }

        .admin-lista-loading {
            display: flex;
            align-items: center;
            gap: 12px;
            color: #666;
            padding: 20px 0;
        }

        .admin-lista-loading .admin-loading {
            border-color: #ddd;
            border-top-color: #1677b8;
            width: 22px;
            height: 22px;
            margin: 0;
        }

        @keyframes admin-girar {
            to { transform: rotate(360deg); }
        }

        @media(max-width: 480px) {
            .admin-modal {
                padding: 28px 20px;
            }

            .admin-modal-botoes {
                flex-direction: column;
            }

            .admin-modal-botoes button {
                width: 100%;
            }
        }
    `;

    document.head.appendChild(estilos);

    // ==========================================
    // JANELAS PERSONALIZADAS
    // ==========================================

    function abrirModal(tipo, titulo, mensagem, confirmacao = false) {

        return new Promise(resolve => {

            const overlay = document.createElement("div");
            overlay.className = "admin-modal-overlay";

            const modal = document.createElement("div");
            modal.className = `admin-modal ${tipo}`;

            const icone = document.createElement("div");
            icone.className = "admin-modal-icone";

            icone.textContent =
                tipo === "sucesso" ? "✓" :
                tipo === "erro" ? "!" : "?";

            const tituloElemento = document.createElement("h2");
            tituloElemento.textContent = titulo;

            const mensagemElemento = document.createElement("p");
            mensagemElemento.textContent = mensagem;

            const botoes = document.createElement("div");
            botoes.className = "admin-modal-botoes";

            function fechar(resultado) {
                overlay.classList.remove("ativo");

                setTimeout(() => overlay.remove(), 250);

                resolve(resultado);
            }

            if (confirmacao) {

                const cancelar = document.createElement("button");
                cancelar.type = "button";
                cancelar.className = "admin-modal-btn-cancelar";
                cancelar.textContent = "Cancelar";
                cancelar.addEventListener("click", () => fechar(false));

                const confirmar = document.createElement("button");
                confirmar.type = "button";
                confirmar.className = "admin-modal-btn-excluir";
                confirmar.textContent = "Excluir";
                confirmar.addEventListener("click", () => fechar(true));

                botoes.append(cancelar, confirmar);

            } else {

                const fecharBotao = document.createElement("button");
                fecharBotao.type = "button";
                fecharBotao.className = "admin-modal-btn-principal";
                fecharBotao.textContent = "Entendi";
                fecharBotao.addEventListener("click", () => fechar(true));

                botoes.appendChild(fecharBotao);
            }

            modal.append(
                icone,
                tituloElemento,
                mensagemElemento,
                botoes
            );

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            requestAnimationFrame(() => {
                overlay.classList.add("ativo");
            });
        });
    }

    // ==========================================
    // CONTROLE DE LOADING DOS BOTÕES
    // ==========================================

    function alterarLoading(botao, carregando, textoOriginal, textoLoading) {

        if (carregando) {

            botao.disabled = true;
            botao.dataset.textoOriginal = textoOriginal;

            const spinner = document.createElement("span");
            spinner.className = "admin-loading";

            botao.replaceChildren(spinner, document.createTextNode(textoLoading));

        } else {

            botao.disabled = false;
            botao.textContent = textoOriginal;
        }
    }

    // ==========================================
    // VERIFICAÇÃO DE AUTENTICAÇÃO
    // ==========================================

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {

        const payload = JSON.parse(
            atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
        );

        if (payload.is_admin !== true) {
            window.location.href = "perfil.html";
            return;
        }

    } catch (erro) {

        sessionStorage.removeItem("orbion-token");
        sessionStorage.removeItem("orbion-id-voluntario");

        window.location.href = "login.html";
        return;
    }

        // Libera o painel somente após confirmar que é administrador
    document.body.classList.remove("admin-acesso-pendente");

    // ==========================================
    // REQUISIÇÕES PARA A API
    // ==========================================

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
                resultado.detail ||
                resultado.mensagem ||
                "Ocorreu um erro na operação."
            );
        }

        return resultado;
    }

    // ==========================================
// ENVIO DE IMAGENS
// ==========================================

async function enviarArquivo(url, arquivo, dadosExtras = {}) {

    const formularioArquivo = new FormData();

    formularioArquivo.append("arquivo", arquivo);

    Object.entries(dadosExtras).forEach(([chave, valor]) => {
        formularioArquivo.append(chave, valor);
    });

    const resposta = await fetch(`${API_BASE_URL}${url}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        },
        body: formularioArquivo
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
            resultado.detail ||
            "Não foi possível enviar a imagem."
        );
    }

    return resultado;
}

    // ==========================================
    // LISTAGEM DOS PROJETOS
    // ==========================================

    async function carregarProjetos() {

        lista.replaceChildren();

        const carregando = document.createElement("div");
        carregando.className = "admin-lista-loading";

        const spinner = document.createElement("span");
        spinner.className = "admin-loading";

        const textoLoading = document.createElement("span");
        textoLoading.textContent = "Carregando projetos...";

        carregando.append(spinner, textoLoading);
        lista.appendChild(carregando);

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
                    excluirProjeto(projeto.id_projeto, excluir);
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

    // ==========================================
    // EDIÇÃO DE PROJETOS
    // ==========================================

    function preencherFormulario(projeto) {

        carregarGaleriaExistente(projeto.id_projeto);
        document.getElementById("id_projeto").value = projeto.id_projeto;
        document.getElementById("titulo").value = projeto.titulo;
        document.getElementById("descricao").value = projeto.descricao;
        document.getElementById("data_inicio").value = projeto.data_inicio;
        document.getElementById("data_fim").value = projeto.data_fim || "";
        document.getElementById("status").value = projeto.status;
       
        document.getElementById("objetivos").value = projeto.objetivos || "";
        document.getElementById("publico_alvo").value = projeto.publico_alvo || "";
        document.getElementById("metodologia").value = projeto.metodologia || "";

        document.getElementById("resultados_esperados").value =
            projeto.resultados_esperados || "";

        tituloFormulario.textContent = "Editar projeto";
        // Limpar seleções anteriores de imagens
campoCapa.value = "";
campoGaleria.value = "";

previewCapa.replaceChildren();
previewGaleria.replaceChildren();
        botaoSalvar.textContent = "Salvar alterações";
        botaoCancelar.hidden = false;

        formulario.scrollIntoView({
            behavior: "smooth"
        });
    }

// ==========================================
// CARREGAR GALERIA EXISTENTE
// ==========================================

async function carregarGaleriaExistente(idProjeto) {

    galeriaExistente.replaceChildren();

    const titulo = document.createElement("h3");
    titulo.textContent = "Imagens cadastradas na galeria";

    galeriaExistente.appendChild(titulo);

    try {

        const imagens = await requisicaoAPI(
            `/api/projetos/${idProjeto}/imagens`
        );

        if (imagens.length === 0) {
            const mensagem = document.createElement("p");
            mensagem.textContent = "Nenhuma imagem cadastrada na galeria.";
            galeriaExistente.appendChild(mensagem);
            return;
        }

        imagens.forEach(imagem => {

            const card = document.createElement("div");
            card.style.display = "inline-flex";
            card.style.flexDirection = "column";
            card.style.margin = "10px";
            card.style.gap = "8px";

            const foto = document.createElement("img");
            foto.src = imagem.imagem_url;
            foto.alt = imagem.descricao || "Imagem do projeto";
            foto.style.width = "130px";
            foto.style.height = "100px";
            foto.style.objectFit = "cover";
            foto.style.borderRadius = "8px";

            const excluir = document.createElement("button");
            excluir.type = "button";
            excluir.textContent = "Excluir imagem";

            excluir.addEventListener("click", async () => {

                if (operacaoEmAndamento) return;

                const confirmar = await abrirModal(
                    "confirmacao",
                    "Excluir imagem?",
                    "Deseja realmente remover esta imagem da galeria?",
                    true
                );

                if (!confirmar) return;

                operacaoEmAndamento = true;

                try {

                    await requisicaoAPI(
                        `/api/projetos/imagens/${imagem.id_imagem}`,
                        {
                            method: "DELETE"
                        }
                    );

                    await carregarGaleriaExistente(idProjeto);

                    await abrirModal(
                        "sucesso",
                        "Imagem excluída!",
                        "A imagem foi removida com sucesso."
                    );

                } catch (erro) {

                    await abrirModal(
                        "erro",
                        "Erro ao excluir imagem",
                        erro.message
                    );

                } finally {

                    operacaoEmAndamento = false;
                }
            });

            card.append(foto, excluir);
            galeriaExistente.appendChild(card);
        });

    } catch (erro) {

        const mensagem = document.createElement("p");
        mensagem.textContent = erro.message;
        galeriaExistente.appendChild(mensagem);
    }
}

    // ==========================================
    // CADASTRO E ATUALIZAÇÃO
    // ==========================================

    formulario.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        if (operacaoEmAndamento) return;

        operacaoEmAndamento = true;

        const idProjeto = document.getElementById("id_projeto").value;

        const estaEditando = Boolean(idProjeto);

        const textoOriginal = estaEditando
            ? "Salvar alterações"
            : "Salvar projeto";

        const textoLoading = estaEditando
            ? "Atualizando projeto..."
            : "Salvando projeto...";

        alterarLoading(
            botaoSalvar,
            true,
            textoOriginal,
            textoLoading
        );

        const dados = {

            titulo: document.getElementById("titulo").value.trim(),

            descricao: document.getElementById("descricao").value.trim(),

            data_inicio: document.getElementById("data_inicio").value,

            data_fim: document.getElementById("data_fim").value || null,

            status: document.getElementById("status").value,

            

            objetivos: document.getElementById("objetivos").value.trim() || null,

            publico_alvo: document.getElementById("publico_alvo").value.trim() || null,

            metodologia: document.getElementById("metodologia").value.trim() || null,

            resultados_esperados:
                document.getElementById("resultados_esperados").value.trim() || null
        };

        try {

            const url = estaEditando
                ? `/api/projetos/${idProjeto}`
                : "/api/projetos";

            const metodo = estaEditando ? "PUT" : "POST";

            const resultado = await requisicaoAPI(url, {
                method: metodo,
                body: JSON.stringify(dados)
            });

            // Identificar o projeto para enviar as imagens
const projetoId = estaEditando
    ? idProjeto
    : resultado.id_projeto;

// Enviar imagem de capa, se selecionada
if (campoCapa.files.length > 0) {

    await enviarArquivo(
        `/api/projetos/${projetoId}/imagem-capa`,
        campoCapa.files[0]
    );
}

// Enviar imagens da galeria
for (const arquivo of campoGaleria.files) {

    await enviarArquivo(
        `/api/projetos/${projetoId}/imagens`,
        arquivo,
        {
            descricao: "",
            ordem: "0"
        }
    );
}

            formulario.reset();
            limparEdicao();

            await carregarProjetos();

            await abrirModal(
                "sucesso",
                "Operação realizada!",
                resultado.mensagem ||
                (estaEditando
                    ? "Projeto atualizado com sucesso!"
                    : "Projeto cadastrado com sucesso!")
            );

        } catch (erro) {

            await abrirModal(
                "erro",
                "Não foi possível concluir",
                erro.message
            );

        } finally {

            operacaoEmAndamento = false;

            botaoSalvar.disabled = false;
           botaoSalvar.textContent =
    document.getElementById("id_projeto").value
        ? "Salvar alterações"
        : "Salvar projeto";
        }
    });

    // ==========================================
    // CANCELAR EDIÇÃO
    // ==========================================

    function limparEdicao() {

        document.getElementById("id_projeto").value = "";

        tituloFormulario.textContent = "Cadastrar novo projeto";

        botaoSalvar.textContent = "Salvar projeto";

        botaoCancelar.hidden = true;

        galeriaExistente.replaceChildren();
previewCapa.replaceChildren();
previewGaleria.replaceChildren();

campoCapa.value = "";
campoGaleria.value = "";
    }

    botaoCancelar.addEventListener("click", () => {

        if (operacaoEmAndamento) return;

        formulario.reset();
        limparEdicao();
    });

    // ==========================================
    // EXCLUSÃO DE PROJETOS
    // ==========================================

    async function excluirProjeto(idProjeto, botaoExcluir) {

        if (operacaoEmAndamento) return;

        const confirmar = await abrirModal(
            "confirmacao",
            "Excluir projeto?",
            "Tem certeza de que deseja excluir este projeto? Essa ação não poderá ser desfeita.",
            true
        );

        if (!confirmar) return;

        operacaoEmAndamento = true;

        alterarLoading(
            botaoExcluir,
            true,
            "Excluir",
            "Excluindo..."
        );

        try {

            const resultado = await requisicaoAPI(
                `/api/projetos/${idProjeto}`,
                {
                    method: "DELETE"
                }
            );

            await carregarProjetos();

            await abrirModal(
                "sucesso",
                "Projeto excluído!",
                resultado.mensagem || "O projeto foi excluído com sucesso."
            );

        } catch (erro) {

            await abrirModal(
                "erro",
                "Não foi possível excluir",
                erro.message
            );

            await carregarProjetos();

        } finally {

            operacaoEmAndamento = false;
        }
    }

    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================

    carregarProjetos();

});
