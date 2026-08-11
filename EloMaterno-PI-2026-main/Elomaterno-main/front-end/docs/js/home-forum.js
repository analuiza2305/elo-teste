import { db, auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { collection, query, orderBy, limit, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const forumPreview = document.getElementById("forum-preview");

// Função original mantida para buscar a foto e nome do autor
async function getUserData(uid) {
  let snap = await getDoc(doc(db, "usuarios", uid));
  if (snap.exists()) return snap.data();

  snap = await getDoc(doc(db, "advogado", uid));
  if (snap.exists()) return snap.data();

  snap = await getDoc(doc(db, "psicologos", uid));
  if (snap.exists()) return snap.data();

  return null;
}

async function carregarUltimosPosts(usuarioAtual) {
  try {
    const q = query(collection(db, "posts"), orderBy("data", "desc"), limit(2));
    const snapshot = await getDocs(q);
    forumPreview.innerHTML = "";

    for (const docSnap of snapshot.docs) {
      const p = docSnap.data();
      const postId = docSnap.id;
      const dataFormatada = p.data?.toDate?.().toLocaleDateString("pt-BR") || "Agora";

      let autorFoto = p.autorFoto || "./img/account_icon.png";
      let autorNome = p.autorNome || "Usuário";
      
      if (p.autorId) {
        try {
          const data = await getUserData(p.autorId);
          if (data) {
            autorFoto = data.avatar || data.fotoURL || autorFoto;
            autorNome = data.nome || autorNome;
          }
        } catch (err) {
          console.error("Erro ao buscar avatar do autor:", err);
        }
      }

      // Verifica se o post foi respondido
      const statusResposta = p.respondido 
          ? `<span class="badge-respondido"><i class="fa-solid fa-check-circle"></i> Respondido por especialista</span>` 
          : `<span class="badge-aguardando"><i class="fa-regular fa-clock"></i> Aguardando especialista</span>`;

      // LÓGICA DE CURTIDAS (Verifica se a mãe logada já curtiu este post antes)
      const curtidas = p.curtidas || [];
      const jaCurtiu = usuarioAtual && curtidas.includes(usuarioAtual.uid);
      
      // Se já curtiu, adiciona a classe 'liked' e muda o ícone para o coração sólido (fa-solid)
      const likeClass = jaCurtiu ? "fc-like liked" : "fc-like";
      const iconeCoracao = jaCurtiu ? "fa-solid fa-heart" : "fa-regular fa-heart";

      forumPreview.innerHTML += `
        <a href="comentResp.html?postId=${postId}" class="forum-card-novo com-brilho">
          
          <div class="fc-header">
            <img src="${autorFoto}" alt="Avatar de ${autorNome}" class="fc-avatar">
            <div class="fc-user-info">
              <strong class="fc-nome">${autorNome}</strong>
              <span class="fc-dot">•</span>
              <span class="fc-data">${dataFormatada}</span>
            </div>
          </div>

          <div class="fc-body">
            <h4 class="fc-titulo">${escapeHtml(p.titulo)}</h4>
            <p class="fc-texto">${escapeHtml(p.conteudo).slice(0, 110)}...</p>
          </div>

          <div class="fc-footer">
            <!-- Adicionamos o atributo data-post-id para saber qual post a mãe curtiu -->
            <div class="${likeClass}" data-post-id="${postId}">
              <i class="${iconeCoracao}"></i>
              <span>Curtir</span>
            </div>
            ${statusResposta}
          </div>

        </a>
      `;
    }
  } catch (err) {
    console.error("Erro ao carregar posts do fórum:", err);
    forumPreview.innerHTML = "<p>Não foi possível carregar os posts.</p>";
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// -------------------------------------------------------------
// EVENTO DE CLIQUE PARA CURTIR (E NÃO ABRIR O LINK DO CARD)
// -------------------------------------------------------------
forumPreview.addEventListener("click", async (e) => {
  // Procura se o elemento clicado (ou o pai dele) é o botão de curtir
  const btnCurtir = e.target.closest(".fc-like");
  
  if (btnCurtir) {
    e.preventDefault(); // Impede que o link <a href="..."> abra a página do post
    
    const user = auth.currentUser;
    if (!user) {
      alert("Você precisa estar conectada para curtir!");
      return;
    }

    const postId = btnCurtir.getAttribute("data-post-id");
    const postRef = doc(db, "posts", postId);
    const icone = btnCurtir.querySelector("i");
    const isLiked = btnCurtir.classList.contains("liked");

    try {
      if (isLiked) {
        // Se já estava curtido, nós REMOVEMOS a curtida (efeito visual imediato)
        btnCurtir.classList.remove("liked");
        icone.classList.remove("fa-solid");
        icone.classList.add("fa-regular");
        
        // Atualiza no banco de dados (remove o ID da mãe do array de curtidas)
        await updateDoc(postRef, {
          curtidas: arrayRemove(user.uid)
        });
      } else {
        // Se não estava curtido, nós ADICIONAMOS a curtida (efeito visual imediato)
        btnCurtir.classList.add("liked");
        icone.classList.remove("fa-regular");
        icone.classList.add("fa-solid");
        
        // Atualiza no banco de dados (adiciona o ID da mãe no array de curtidas)
        await updateDoc(postRef, {
          curtidas: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error("Erro ao curtir:", error);
    }
  }
});

// Ao invés de carregar direto, esperamos o Firebase confirmar quem é a mãe logada
// Isso garante que o coração venha vermelho caso ela já tenha curtido antes!
onAuthStateChanged(auth, (user) => {
    carregarUltimosPosts(user);
});