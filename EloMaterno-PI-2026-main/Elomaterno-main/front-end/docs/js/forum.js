import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  doc, getDoc, getDocs, collection, addDoc, serverTimestamp,
  query, where, orderBy, limit, startAfter,
  setDoc, deleteDoc, updateDoc, increment,
  getCountFromServer
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const postsList = document.getElementById("posts-list");
const novaBtn = document.querySelector(".botao-nova");
const modal = document.getElementById("modal-post");
const formPost = document.getElementById("form-post");
const inputTitulo = document.getElementById("titulo");
const inputConteudo = document.getElementById("conteudo");
const cancelarPost = document.getElementById("cancelar-post");
const modalTitle = document.getElementById("modal-title");

let usuarioLogado = null;
let editandoId = null;
let postParaExcluir = null;

// ==========================================
// FUNÇÕES ÚTEIS
// ==========================================
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(s) {
  return escapeHtml(s);
}

async function getUserData(uid) {
  const psicoQuery = await getDocs(query(collection(db, "psicologos"), where("uid", "==", uid)));
  if (psicoQuery.size > 0) return psicoQuery.docs[0].data();

  const advQuery = await getDocs(query(collection(db, "advogados"), where("uid", "==", uid)));
  if (advQuery.size > 0) return advQuery.docs[0].data();

  const usuSnap = await getDoc(doc(db, "usuarios", uid));
  if (usuSnap.exists()) return usuSnap.data();

  return null;
}

// ==========================================
// CRIAR/EDITAR POSTAGEM
// ==========================================
async function criarPost(titulo, conteudo) {
  const user = auth.currentUser;
  if (!user) {
    alert("Você precisa estar logada para postar.");
    return;
  }

  const anonimo = document.getElementById("anonimo-checkbox").checked;
  let autorId, autorNome, autorFoto;

  if (anonimo) {
    autorId = "anonimo";
    autorNome = "Anônimo";
    autorFoto = "./img/account_icon.png";
  } else {
    const dadosUsuario = await getUserData(user.uid);
    autorId = user.uid;
    autorNome = dadosUsuario?.nome || "Usuária";
    autorFoto = dadosUsuario?.fotoURL || dadosUsuario?.avatar || "./img/account_icon.png";
  }

  await addDoc(collection(db, "posts"), {
    autorId,
    autorNome,
    autorFoto,
    titulo,
    conteudo,
    likes: 0,
    data: serverTimestamp()
  });
}

if (novaBtn) {
  novaBtn.addEventListener("click", () => {
    editandoId = null;
    modalTitle.textContent = "Nova Publicação";
    inputTitulo.value = "";
    inputConteudo.value = "";
    modal.style.display = "flex";
  });
}

if (cancelarPost) {
  cancelarPost.addEventListener("click", () => {
    modal.style.display = "none";
  });
}

if (formPost) {
  formPost.addEventListener("submit", async (e) => {
    e.preventDefault();
    const titulo = inputTitulo.value.trim();
    const conteudo = inputConteudo.value.trim();
    if (!titulo || !conteudo) return;

    if (editandoId) {
      await updateDoc(doc(db, "posts", editandoId), { titulo, conteudo });
    } else {
      await criarPost(titulo, conteudo);
    }
    modal.style.display = "none";
    window.location.reload(); 
  });
}

// ==========================================
// AUTENTICAÇÃO E CARREGAMENTO DE POSTS
// ==========================================
let carregando = false;
let terminou = false;
let lastVisible = null;
const pageSize = 10;
const postsRef = collection(db, "posts");

async function carregarPosts(inicial = false) {
  if (carregando || terminou) return;
  carregando = true;

  let q;
  if (inicial) {
    if (postsList) postsList.innerHTML = `<div class="loader"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
    q = query(postsRef, orderBy("data", "desc"), limit(pageSize));
  } else {
    q = query(postsRef, orderBy("data", "desc"), startAfter(lastVisible), limit(pageSize));
  }

  try {
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      terminou = true;
      if (inicial && postsList) postsList.innerHTML = "<p class='no-posts'>Nenhuma publicação encontrada.</p>";
      carregando = false;
      return;
    }

    lastVisible = snapshot.docs[snapshot.docs.length - 1];
    const docs = snapshot.docs;
    const userCache = new Map();
    const likeCache = new Map();

    const autorIds = [...new Set(docs.map(d => d.data().autorId).filter(id => id && id !== "anonimo"))];

    // Busca as fotos e nomes dos autores
    await Promise.all(autorIds.map(async (uid) => {
      try {
        const data = await getUserData(uid);
        if (data) {
          const nome = data.nome || "Usuária";
          let foto = data.fotoURL || data.avatar || (data.tipo === 'advogado' ? "./img/advogadossavatar/11.png" : "./img/account_icon.png");
          userCache.set(uid, { nome, foto });
        } else {
          userCache.set(uid, { nome: "Usuária", foto: "./img/account_icon.png" });
        }
      } catch (err) {
        userCache.set(uid, { nome: "Usuária", foto: "./img/account_icon.png" });
      }
    }));

    // Verifica se a usuária logada curtiu os posts
    if (usuarioLogado) {
      await Promise.all(docs.map(async (docSnap) => {
        try {
          const likeRef = doc(db, "posts", docSnap.id, "likes", usuarioLogado.uid);
          const likeSnap = await getDoc(likeRef);
          likeCache.set(docSnap.id, likeSnap.exists());
        } catch (err) {
          likeCache.set(docSnap.id, false);
        }
      }));
    }

    // Monta o visual de cada card corrigido com o join() no lugar certo
    const novosCards = (await Promise.all(docs.map(async (docSnap) => {
      const p = docSnap.data();
      const postId = docSnap.id;
      let nomeAutor = p.autorNome || "Usuária";
      let fotoAutor = p.autorFoto || "./img/account_icon.png";

      if (p.autorId && userCache.has(p.autorId)) {
        const cached = userCache.get(p.autorId);
        nomeAutor = cached.nome || nomeAutor;
        fotoAutor = cached.foto || fotoAutor;
      }
      if (p.autorId === "anonimo") {
        nomeAutor = "Anônimo";
        fotoAutor = "./img/account_icon.png";
      }

      // Conta quantos comentários/respostas o post tem no banco de dados
      let totalComentarios = 0;
      try {
        const comentariosRef = collection(db, "posts", postId, "comentarios");
        const snapshotCount = await getCountFromServer(comentariosRef);
        totalComentarios = snapshotCount.data().count;
      } catch (e) {
        totalComentarios = 0;
      }

      const dataFormatada = p.data?.toDate().toLocaleString("pt-BR") || "Agora";
      const linkPerfil = (p.autorId === "anonimo") ? "#" : ((usuarioLogado && usuarioLogado.uid === p.autorId) ? "perfil.html" : `perfilPessoa.html?uid=${p.autorId}`);
      const curtido = likeCache.get(postId) === true;
      const likeIconSrc = curtido ? "./img/like_curtido.png" : "./img/like_icon.png";

      // Selo dinâmico baseado no campo respondido do Firebase
      const badgeHTML = p.respondido 
        ? `<div class="badge-respondido"><i class="fa-solid fa-check"></i> Respondido por um especialista</div>`
        : `<div class="badge-aguardando"><i class="fa-regular fa-clock"></i> Aguardando especialista</div>`;

      return `
        <div class="forum-card-novo post-card" data-id="${postId}">
          
          <div class="fc-header">
            ${p.autorId === "anonimo" ? `<img src="${escapeAttr(fotoAutor)}" class="fc-avatar">` : `<a href="${linkPerfil}"><img src="${escapeAttr(fotoAutor)}" class="fc-avatar"></a>`}
            <div class="fc-user-info">
              <span class="fc-nome">${p.autorId === "anonimo" ? "Anônimo" : `<a href="${linkPerfil}">${escapeHtml(nomeAutor)}</a>`}</span>
              <span class="fc-dot">•</span>
              <span class="fc-data">${dataFormatada}</span>
            </div>
          </div>
          
          <div class="fc-body">
            <h3 class="fc-titulo">${escapeHtml(p.titulo)}</h3>
            <p class="fc-texto">${escapeHtml(p.conteudo)}</p>
          </div>
          
          <div class="fc-footer">
            <div style="display: flex; gap: 16px; align-items: center;">
              
              <!-- Curtidas -->
              <div class="fc-like like-wrap" data-id="${postId}" style="cursor: pointer;">
                <img src="${likeIconSrc}" alt="Curtir" class="like-icon" style="width: 20px; height: 20px;">
                <span class="like-count" style="margin-left: 2px;">${p.likes || 0}</span>
              </div>
              
              <!-- Comentários reais contados do banco -->
              <div class="fc-like" style="cursor: pointer;">
                <img src="./img/consult_icon.png" alt="Comentários" class="comment-icon" style="width: 20px; height: 20px;">
                <span class="comment-count">${totalComentarios}</span>
              </div>
              
              ${usuarioLogado && usuarioLogado.uid === p.autorId ? `<button class="delete-btn action-btn" data-id="${postId}">Excluir</button>` : ""}
            </div>

            ${badgeHTML}
          </div>
        </div>`;
    }))).join("");

    if (inicial && postsList) postsList.innerHTML = novosCards;
    else if (postsList) postsList.insertAdjacentHTML("beforeend", novosCards);

  } catch (err) {
    console.error(err);
    if (inicial && postsList) postsList.innerHTML = "<p class='no-posts'>Erro ao carregar publicações.</p>";
  } finally {
    carregando = false;
  }
}

onAuthStateChanged(auth, async (user) => {
  usuarioLogado = user;

  if (user) {
    const nameSpan = document.getElementById("header-user-name");
    if (nameSpan) {
      if (user.displayName) {
        const nomes = user.displayName.trim().split(" ");
        nameSpan.innerText = nomes.length > 1 ? nomes[0] + " " + nomes[nomes.length - 1] : nomes[0];
      }
      try {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        if (snap.exists() && snap.data().nome) {
          const nomesDb = snap.data().nome.trim().split(" ");
          nameSpan.innerText = nomesDb.length > 1 ? nomesDb[0] + " " + nomesDb[nomesDb.length - 1] : nomesDb[0];
        }
      } catch (err) { console.error("Erro perfil:", err); }
    }
    
    carregarPosts(true);

  } else {
    window.location.href = "logMae.html";
  }
});

window.addEventListener("scroll", () => {
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 400;
  if (nearBottom && !carregando && !terminou) carregarPosts(false);
});

// ==========================================
// INTERAÇÕES DOS POSTS (CURTIR, DELETAR, ETC)
// ==========================================
if (postsList) {
  postsList.addEventListener("click", async (e) => {
    const card = e.target.closest(".post-card");
    if (!card) return;

    if (e.target.closest(".delete-btn")) {
      postParaExcluir = e.target.dataset.id;
      const modalConfirma = document.getElementById("modal-confirm");
      if (modalConfirma) modalConfirma.style.display = "flex";
      return;
    }

    if (e.target.closest(".like-icon") || e.target.closest(".like-wrap")) {
      e.preventDefault();
      e.stopPropagation();
      if (!usuarioLogado) { alert("Você precisa estar logada para curtir."); return; }

      const wrap = e.target.closest(".like-wrap");
      const postId = wrap.getAttribute("data-id");
      const countEl = wrap.querySelector(".like-count");
      const likeIcon = wrap.querySelector(".like-icon");
      const current = parseInt(countEl.textContent, 10) || 0;
      const wasLiked = likeIcon.src.includes("like_curtido.png");

      if (wasLiked) {
        countEl.textContent = Math.max(0, current - 1);
        likeIcon.src = "./img/like_icon.png";
      } else {
        countEl.textContent = current + 1;
        likeIcon.src = "./img/like_curtido.png";
      }

      const likeRef = doc(db, "posts", postId, "likes", usuarioLogado.uid);
      try {
        const likeSnap = await getDoc(likeRef);
        if (likeSnap.exists()) {
          await deleteDoc(likeRef);
          await updateDoc(doc(db, "posts", postId), { likes: increment(-1) });
        } else {
          await setDoc(likeRef, { curtido: true });
          await updateDoc(doc(db, "posts", postId), { likes: increment(1) });
        }
      } catch (err) {
        console.error(err);
      }
      return;
    }

    if (!e.target.closest(".like-wrap") && !e.target.closest(".edit-btn") && !e.target.closest(".delete-btn")) {
      const postId = card.getAttribute("data-id");
      window.location.href = `comentResp.html?postId=${postId}`;
    }
  });
}

const modalConfirm = document.getElementById("modal-confirm");
const btnCancelarConfirm = document.getElementById("cancelar-confirm");
const btnConfirmarExcluir = document.getElementById("confirmar-excluir");

if (btnCancelarConfirm) {
  btnCancelarConfirm.addEventListener("click", () => {
    postParaExcluir = null;
    modalConfirm.style.display = "none";
  });
}

if (btnConfirmarExcluir) {
  btnConfirmarExcluir.addEventListener("click", async () => {
    if (postParaExcluir) {
      await deleteDoc(doc(db, "posts", postParaExcluir));
      postParaExcluir = null;
      window.location.reload();
    }
    modalConfirm.style.display = "none";
  });
}

// ==========================================
// FILTRO DE PESQUISA
// ==========================================
const inputSearch = document.querySelector(".forum-search-moderno input");
function filtrarPosts() {
  const termo = inputSearch.value.toLowerCase();
  document.querySelectorAll(".post-card").forEach((card) => {
    const titulo = card.querySelector(".fc-titulo")?.textContent.toLowerCase() || "";
    const autor = card.querySelector(".fc-nome")?.textContent.toLowerCase() || "";
    
    const visivel = titulo.includes(termo) || autor.includes(termo);
    card.style.display = visivel ? "flex" : "none";
  });
}

if (inputSearch) {
  inputSearch.addEventListener("keyup", filtrarPosts);
}

// ==========================================
// FUNÇÕES DO MENU DO CABEÇALHO
// ==========================================
const btnSair = document.getElementById("btn-sair-conta");
if (btnSair) {
  btnSair.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "logMae.html";
    } catch (error) { console.error("Erro ao sair:", error); }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("user-dropdown-toggle");
  const dropdownMenu = document.getElementById("user-dropdown-menu");
  if (toggleBtn && dropdownMenu) {
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle("hidden");
      toggleBtn.classList.toggle("aberto");
    });
    document.addEventListener("click", (e) => {
      if (!toggleBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.add("hidden");
        toggleBtn.classList.remove("aberto");
      }
    });
  }
});