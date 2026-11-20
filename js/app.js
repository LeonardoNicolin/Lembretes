// ========================================
// CONFIGURAÇÃO
// ========================================

const API_URL = "https://localhost:7063";

let paginaAtual = 1;

// Estado da ordenação (clique no cabeçalho da coluna)
let ordemAtual = "DataCadastro";
let direcaoAtual = "DESC";

// A API trata datas "vazias" de forma peculiar (os valores padrão de
// DataCadastroFinal e DataAtualizacaoInicial fariam a consulta retornar nada).
// Por isso, quando o usuário não preenche um filtro de data, enviamos
// estes limites que a API ignora/aceita sem restringir o resultado.
const DATA_MINIMA = "0001-01-01";
const DATA_MAXIMA = "9999-12-30";


// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const formulario = document.getElementById("formulario");
const formLembrete = document.getElementById("formLembrete");

const lembreteId = document.getElementById("lembreteId");
const descricao = document.getElementById("descricao");
const erroDescricao = document.getElementById("erroDescricao");
const contadorDescricao = document.getElementById("contadorDescricao");

const listaLembretes = document.getElementById("listaLembretes");
const mensagemVazia = document.getElementById("mensagemVazia");
const tabelaContainer = document.getElementById("tabelaContainer");

const filtroDescricao = document.getElementById("filtroDescricao");
const filtroCadastroInicial = document.getElementById("filtroCadastroInicial");
const filtroCadastroFinal = document.getElementById("filtroCadastroFinal");
const filtroAtualizacaoInicial = document.getElementById("filtroAtualizacaoInicial");
const filtroAtualizacaoFinal = document.getElementById("filtroAtualizacaoFinal");
const tamanhoPagina = document.getElementById("tamanhoPagina");

const totalRegistros = document.getElementById("totalRegistros");
const paginaAtualElemento = document.getElementById("paginaAtual");

const btnImprimir = document.getElementById("btnImprimir");
const btnNovo = document.getElementById("btnNovo");
const btnCancelar = document.getElementById("btnCancelar");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnLimpar = document.getElementById("btnLimpar");

const btnAnterior = document.getElementById("btnAnterior");
const btnProximo = document.getElementById("btnProximo");

const tituloFormulario = document.getElementById("tituloFormulario");

const cabecalhosOrdenaveis = document.querySelectorAll("th.sortable");


// ========================================
// INICIALIZAÇÃO
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    atualizarIndicadoresOrdenacao();
    filtrarLembretes();
});

// ========================================
// PARÂMETROS DE FILTRO (usados em filtro e impressão)
// ========================================
function montarParametros() {
    const params = new URLSearchParams();

    params.append("NumeroPagina", paginaAtual);
    params.append("TamanhoPagina", tamanhoPagina.value);
    params.append("Descricao", filtroDescricao.value.trim());

    params.append("Ordem", ordemAtual);
    params.append("Direcao", direcaoAtual);

    params.append("DataCadastroInicial", filtroCadastroInicial.value || DATA_MINIMA);
    params.append("DataCadastroFinal", filtroCadastroFinal.value || DATA_MAXIMA);
    params.append("DataAtualizacaoInicial", filtroAtualizacaoInicial.value || DATA_MINIMA);
    params.append("DataAtualizacaoFinal", filtroAtualizacaoFinal.value || DATA_MAXIMA);

    return params;
}

// Valida se os intervalos de data fazem sentido antes de chamar a API
function validarFiltros() {
    if (filtroCadastroInicial.value && filtroCadastroFinal.value &&
        filtroCadastroInicial.value > filtroCadastroFinal.value) {
        mostrarToast("A data de cadastro inicial não pode ser maior que a final.", "aviso");
        return false;
    }

    if (filtroAtualizacaoInicial.value && filtroAtualizacaoFinal.value &&
        filtroAtualizacaoInicial.value > filtroAtualizacaoFinal.value) {
        mostrarToast("A data de atualização inicial não pode ser maior que a final.", "aviso");
        return false;
    }

    return true;
}

// Mensagem amigável conforme o tipo de falha
function mensagemDeErro(error, acao) {
    if (error instanceof TypeError) {
        // fetch lança TypeError quando não consegue falar com a API (offline, CORS, certificado)
        return `Não foi possível se comunicar com a API (${API_URL}). Verifique se ela está em execução.`;
    }

    return `Erro ao ${acao}. ${error.message}`;
}

async function lerErroDaResposta(response, padrao) {
    let detalhe = "";

    try {
        detalhe = (await response.text()).trim();
    } catch { /* ignora */ }

    return `${padrao} (HTTP ${response.status}${detalhe ? ": " + detalhe : ""})`;
}

// ========================================
// GET /lembretes/filtro
// ========================================
async function filtrarLembretes(avisarSeVazio = false) {
    tabelaContainer.classList.add("carregando");

    try {
        console.log("filtro-> params", montarParametros().toString());

        const response = await fetch(
            `${API_URL}/lembretes/filtro?${montarParametros()}`
        );

        if (!response.ok) {
            throw new Error(await lerErroDaResposta(response, "Erro ao filtrar lembretes."));
        }

        const resultado = await response.json();

        // Se excluiu o último item da página, volta uma página
        if (resultado.lembretes.length === 0 && paginaAtual > 1 && resultado.total > 0) {
            paginaAtual--;
            return await filtrarLembretes(avisarSeVazio);
        }

        renderizarLembretes(resultado.lembretes);

        const totalPaginas = Math.max(1, Math.ceil(resultado.total / resultado.tamanhoPagina));

        totalRegistros.textContent =
            `${resultado.total} ${resultado.total === 1 ? "registro" : "registros"}`;

        paginaAtualElemento.textContent =
            `Página ${resultado.numeroPagina} de ${totalPaginas}`;

        btnAnterior.disabled =
            paginaAtual <= 1;

        btnProximo.disabled =
            paginaAtual >= totalPaginas;

        if (avisarSeVazio && resultado.total === 0) {
            mostrarToast("Nenhum lembrete encontrado com esses filtros.", "aviso");
        }

    } catch (error) {

        console.error(error);

        mostrarToast(mensagemDeErro(error, "realizar o filtro"), "erro");

    } finally {
        tabelaContainer.classList.remove("carregando");
    }
}

// ========================================
// GET /lembretes/imprimir
// ========================================
async function imprimirLembretes() {
    try {
        const response = await fetch(
            `${API_URL}/lembretes/imprimir?${montarParametros()}`
        );

        if (!response.ok) {
            throw new Error(await lerErroDaResposta(response, "Erro ao gerar o relatório."));
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "relatorio-lembretes.pdf";

        document.body.appendChild(a)
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(url), 10000)

        mostrarToast("Relatório gerado com sucesso!", "sucesso");

    } catch (error) {

        console.error(error);

        mostrarToast(mensagemDeErro(error, "gerar o relatório"), "erro");
    }
}

// ========================================
// POST /lembretes
// ========================================

async function criarLembrete() {
    try {

        const dados = { 
            descricao: descricao.value.trim()
        };

        const response = await fetch(
            `${API_URL}/lembretes`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(dados)
            }
        );

        if (!response.ok) {
            throw new Error(await lerErroDaResposta(response, "Erro ao criar lembrete."));
        }

        mostrarToast("Lembrete criado com sucesso!", "sucesso");

        fecharFormulario();

        // volta para a primeira página, onde o novo registro aparece (ordem padrão)
        paginaAtual = 1;
        await filtrarLembretes();

    } catch (error) {

        console.error(error);

        mostrarToast(mensagemDeErro(error, "criar o lembrete"), "erro");
    }
}


// ========================================
// GET /lembretes/{id}
// ========================================
async function buscarLembrete(id) {

    try {

        const response = await fetch(
            `${API_URL}/lembretes/${id}`
        );

        if (!response.ok) {
            throw new Error(await lerErroDaResposta(response, "Lembrete não encontrado."));
        }

        const lembrete = await response.json();

        lembreteId.value = lembrete.id;
        descricao.value = lembrete.descricao;
        atualizarContador();
        limparErroDescricao();

        tituloFormulario.textContent = "Editar lembrete";

        formulario.classList.remove("hidden");
        formulario.scrollIntoView({ behavior: "smooth", block: "start" });
        descricao.focus();

    } catch (error) {

        console.error(error);

        mostrarToast(mensagemDeErro(error, "buscar o lembrete"), "erro");
    }
}


// ========================================
// PUT /lembretes/{id}
// ========================================

async function atualizarLembrete() {

    try {

        const dados = {
            descricao: descricao.value.trim()
        };

        const response = await fetch(
            `${API_URL}/lembretes/${lembreteId.value}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(dados)
            }
        );

        if (!response.ok) {
            throw new Error(await lerErroDaResposta(response, "Erro ao atualizar."));
        }

        mostrarToast(
            "Lembrete atualizado com sucesso!", "sucesso"
        );

        fecharFormulario();

        await filtrarLembretes();

    } catch (error) {

        console.error(error);

        mostrarToast(mensagemDeErro(error, "atualizar o lembrete"), "erro");
    }
}


// ========================================
// DELETE /lembretes/{id}
// ========================================
async function excluirLembrete(id) {

    const confirmou = confirm(
        "Deseja realmente excluir este lembrete?"
    );

    if (!confirmou) {
        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/lembretes/${id}`,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {
            throw new Error(await lerErroDaResposta(response, "Erro ao excluir."));
        }

        mostrarToast(
            "Lembrete excluído com sucesso!", "sucesso"
        );

        await filtrarLembretes();

    } catch (error) {

        console.error(error);

        mostrarToast(mensagemDeErro(error, "excluir o lembrete"), "erro");
    }
}


// ========================================
// RENDERIZAÇÃO
// ========================================
function renderizarLembretes(lembretes) {
    listaLembretes.innerHTML = "";

    if (!lembretes || lembretes.length === 0) {
        mensagemVazia.classList.remove("hidden");

        return;
    }

    mensagemVazia.classList.add("hidden");

    lembretes.forEach(lembrete => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>
                ${escaparHtml(lembrete.descricao)}
            </td>

            <td>
                ${formatarData(lembrete.dataCadastro)}
            </td>

            <td>
                ${formatarData(lembrete.dataAtualizacao)}
            </td>

            <td>
                <span class="status ${
                    lembrete.isAtivo
                        ? "status-ativo"
                        : "status-inativo"
                }">
                    ${
                        lembrete.isAtivo
                            ? "Ativo"
                            : "Inativo"
                    }
                </span>
            </td>

            <td>
                <div class="actions">

                    <button
                        class="btn btn-edit"
                        onclick="buscarLembrete('${lembrete.id}')">
                        Editar
                    </button>

                    <button
                        class="btn btn-danger"
                        onclick="excluirLembrete('${lembrete.id}')">
                        Excluir
                    </button>

                </div>
            </td>
        `;

        listaLembretes.appendChild(tr);
    });
}


// ========================================
// FORMULÁRIO
// ========================================
btnImprimir.addEventListener("click", () => {
    console.log('click-> imprimir lembretes');

    if (!validarFiltros()) {
        return;
    }

    imprimirLembretes();
});

btnNovo.addEventListener("click", () => {
    abrirFormularioNovo();
});


btnCancelar.addEventListener("click", () => {
    fecharFormulario();
});

formLembrete.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!descricao.value.trim()) {
        mostrarErroDescricao();
        mostrarToast("Informe uma descrição.", "aviso");

        return;
    }

    limparErroDescricao();

    if (lembreteId.value) {
        await atualizarLembrete();
    } else {
        await criarLembrete();
    }
});

descricao.addEventListener("input", () => {
    atualizarContador();

    if (descricao.value.trim()) {
        limparErroDescricao();
    }
});


function abrirFormularioNovo() {
    lembreteId.value = "";
    descricao.value = "";
    atualizarContador();
    limparErroDescricao();

    tituloFormulario.textContent = "Novo lembrete";

    formulario.classList.remove("hidden");
    descricao.focus();
}

function fecharFormulario() {
    formulario.classList.add("hidden");
    formLembrete.reset();
    lembreteId.value = "";
    atualizarContador();
    limparErroDescricao();
}

function mostrarErroDescricao() {
    erroDescricao.classList.remove("hidden");
    descricao.classList.add("invalido");
    descricao.focus();
}

function limparErroDescricao() {
    erroDescricao.classList.add("hidden");
    descricao.classList.remove("invalido");
}

function atualizarContador() {
    contadorDescricao.textContent = `${descricao.value.length}/${descricao.maxLength}`;
}

// ========================================
// FILTRO
// ========================================
function aplicarFiltro() {
    if (!validarFiltros()) {
        return;
    }

    paginaAtual = 1;
    filtrarLembretes(true);
}

btnFiltrar.addEventListener("click", () => {
    aplicarFiltro();
});

btnLimpar.addEventListener("click", () => {
    filtroDescricao.value = "";
    filtroCadastroInicial.value = "";
    filtroCadastroFinal.value = "";
    filtroAtualizacaoInicial.value = "";
    filtroAtualizacaoFinal.value = "";

    paginaAtual = 1;
    filtrarLembretes();
});

[
    filtroDescricao,
    filtroCadastroInicial,
    filtroCadastroFinal,
    filtroAtualizacaoInicial,
    filtroAtualizacaoFinal
].forEach(campo => {
    campo.addEventListener("keyup", event => {
        if (event.key === "Enter") {
            aplicarFiltro();
        }
    });
});

// Alterar a quantidade por página recarrega a listagem
tamanhoPagina.addEventListener("change", () => {
    paginaAtual = 1;
    filtrarLembretes();
});

// ========================================
// ORDENAÇÃO (clique no título da coluna)
// ========================================
function ordenarPor(campo) {
    if (ordemAtual === campo) {
        direcaoAtual = direcaoAtual === "ASC" ? "DESC" : "ASC";
    } else {
        ordemAtual = campo;
        direcaoAtual = "ASC";
    }

    paginaAtual = 1;
    atualizarIndicadoresOrdenacao();
    filtrarLembretes();
}

function atualizarIndicadoresOrdenacao() {
    cabecalhosOrdenaveis.forEach(th => {
        if (th.dataset.ordem === ordemAtual) {
            th.setAttribute("aria-sort", direcaoAtual === "ASC" ? "ascending" : "descending");
        } else {
            th.setAttribute("aria-sort", "none");
        }
    });
}

cabecalhosOrdenaveis.forEach(th => {
    th.addEventListener("click", () => ordenarPor(th.dataset.ordem));

    // acessibilidade: permite ordenar pelo teclado
    th.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            ordenarPor(th.dataset.ordem);
        }
    });
});

// ========================================
// PAGINAÇÃO
// ========================================
btnAnterior.addEventListener("click", () => {
    if (paginaAtual > 1) {
        paginaAtual--;
        filtrarLembretes();
    }
});

btnProximo.addEventListener("click", () => {
    paginaAtual++;
    filtrarLembretes();
});


// ========================================
// UTILITÁRIOS
// ========================================
function formatarData(data) {

    if (!data) {
        return "-";
    }

    return new Date(data).toLocaleString(
        "pt-BR"
    );
}

// Evita que texto digitado vire HTML na tabela (XSS)
function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";

    return div.innerHTML;
}

let temporizadorToast;

// tipo: "info" (padrão), "sucesso", "erro" ou "aviso"
function mostrarToast(mensagem, tipo = "info") {
    const toast = document.getElementById("toast");

    toast.textContent = mensagem;

    toast.className = "toast" + (tipo !== "info" ? ` toast-${tipo}` : "");

    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => { toast.classList.add("hidden"); }, tipo === "erro" ? 6000 : 3500);
}
