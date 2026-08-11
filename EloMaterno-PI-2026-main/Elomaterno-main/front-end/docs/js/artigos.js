import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const wrapper = document.querySelector(".articles-wrapper");
const botoes = document.querySelectorAll(".categoria");

async function carregarArtigos() {
  const snap = await getDocs(collection(db, "artigos"));
  const artigos = [];
  
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const dataPost = data.datahorapost?.toDate ? data.datahorapost.toDate() : null;

    artigos.push({
      id: docSnap.id,
      ...data,
      datahorapost: dataPost
    });
  });

  console.log("Artigos carregados:", artigos);
  renderArtigos(artigos);
}

function renderArtigos(artigos) {
  // Limpa o loader da tela
  wrapper.innerHTML = "";

  // Cria UMA ÚNICA grade para todos os artigos (Fica perfeito para o botão "Todos")
  const grid = document.createElement("div");
  grid.className = "articles-grid";

  artigos.forEach(art => {
    const card = document.createElement("article");
    
    // Converte a categoria para minúsculo para bater com o CSS (ex: cat-legislativos)
    const nomeCategoria = art.categoria || "Geral";
    const categoriaClass = "cat-" + nomeCategoria.toLowerCase();
    
    card.className = `article-card ${categoriaClass}`;
    
    // Imagem e Descrição
    const imgSrc = art.img || "./img/placeholder.png";
    const descricao = art.descricao || "";

    // Formatação da Data e Autor
    let dataFormatada = "";
    if (art.datahorapost instanceof Date) {
      const d = art.datahorapost;
      const dataStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      dataFormatada = `${dataStr} - ${art.postadoPor || "Equipe"}`;
    }

    // HTML do card EXATAMENTE como o novo CSS exige
    card.innerHTML = `
      <span class="categoria-tag">${nomeCategoria}</span>
      <img src="${imgSrc}" alt="Imagem do artigo" class="article-img">
      <div class="article-body">
        <h3>${art.titulo || "Sem título"}</h3>
        <span class="evento-meta">${dataFormatada}</span>
        <p>${descricao}</p>
      </div>
      <span class="btn-ler">Ler Artigo</span>
    `;

    // Ação de clique no card inteiro
    card.addEventListener("click", () => {
      window.location.href = `./artigo_ind.html?id=${art.id}`;
    });

    // Adiciona o card na nossa grade única
    grid.appendChild(card);
  });

  // Coloca a grade na tela
  wrapper.appendChild(grid);
  
  // Agora que os cards existem, ativamos a lógica dos botões
  aplicarFiltro();
}

function aplicarFiltro() {
  const cardsArtigos = document.querySelectorAll('.article-card');

  botoes.forEach(botao => {
    botao.addEventListener("click", (e) => {
      // 1. Muda a cor do botão clicado
      botoes.forEach(b => b.classList.remove("ativa"));
      e.target.classList.add("ativa");

      // 2. Descobre qual aba foi clicada
      const categoriaSelecionada = e.target.dataset.categoria;

      // 3. Mostra ou esconde os cards
      cardsArtigos.forEach(card => {
        if (categoriaSelecionada === 'todos') {
          card.style.display = 'flex'; // Mostra todos
        } else {
          if (card.classList.contains(`cat-${categoriaSelecionada}`)) {
            card.style.display = 'flex'; // Mostra os da categoria
          } else {
            card.style.display = 'none'; // Esconde os outros
          }
        }
      });
    });
  });
}

carregarArtigos();