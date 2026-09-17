// ARRAY DE PRODUTOS
const produtos = [
    {id:1, nome:"Combinado Especial", descricao:"30 peças variadas", preco:89.90, categoria:"combinados"},
    {id:2, nome:"Combinado Salmão", descricao:"24 peças de salmão", preco:69.50, categoria:"combinados"},
    {id:3, nome:"Combinado Mix", descricao:"40 peças variadas", preco:45.00, categoria:"combinados"}
];

const listaDeProdutos = document.getElementById("listaDeProdutos");
const campoBusca = document.getElementById("BuscarItem");
const botoesCategoria = document.querySelectorAll(".opcoesDoCardapio button");

//qual categoria e qual texto de busca estão ativos
let categoriaAtual = "combinados";
let textoBuscaAtual = "";

function adicionarAoCarrinho(produto) {
    const carrinho = pegarCarrinho();
    const itemExistente = carrinho.find(function(item) {
        return item.id === produto.id;
    });
    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        carrinho.push({ id: produto.id, nome: produto.nome, preco: produto.preco, quantidade: 1 });
    }
    salvarCarrinho(carrinho);
}

// DESENHA OS CARDS NA TELA
function desenharProdutos(lista) {
    listaDeProdutos.innerHTML = ""; // limpa antes de redesenhar

    lista.forEach(function(produto){
        const card = document.createElement("div");
        card.innerHTML = `
            <h3>${produto.nome}</h3>
            <p class="descricaoProduto">${produto.descricao}</p>
            <div class="linhaPrecoBotao">
                <p class="precoProduto">R$ ${produto.preco.toFixed(2)}</p>
                <button data-id="${produto.id}">+</button>
            </div>
        `;
        const botao = card.querySelector("button");
        botao.addEventListener("click", function () {
            adicionarAoCarrinho(produto);
        });
        listaDeProdutos.appendChild(card);
    });
}

// FILTRA os produtos combinando categoria E texto de busca ao mesmo tempo
function aplicarFiltros() {
    const produtosFiltrados = produtos.filter(function(produto) {
        const bateCategoria = produto.categoria === categoriaAtual;
        const bateTexto = produto.nome.toLowerCase().includes(textoBuscaAtual.toLowerCase());
        return bateCategoria && bateTexto;
    });

    desenharProdutos(produtosFiltrados);
}

//quando a pessoa digita no campo de busca
campoBusca.addEventListener("input", function () {
    textoBuscaAtual = campoBusca.value;
    aplicarFiltros();
});

//quando clica num botão de categoria
botoesCategoria.forEach(function (botao) {
    botao.addEventListener("click", function () {
        botoesCategoria.forEach(function (b) {
            b.classList.remove("ativo");
        });
        botao.classList.add("ativo");

        categoriaAtual = botao.textContent.toLowerCase();
        aplicarFiltros();
    });
});

aplicarFiltros();