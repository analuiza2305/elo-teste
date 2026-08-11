import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const container = document.getElementById("artigos-home");

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeImg(src) {
  if (!src) return "./img/art1_img.png";
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  return src.replace(/^\.\//, "./");
}

async function carregarUltimosArtigos() {
  try {
    // Aumentamos o limite para 6 para fazer sentido o carrossel (deslizar para o lado)
    const q = query(collection(db, "artigos"), orderBy("datahorapost", "desc"), limit(6));
    const snap = await getDocs(q);
    container.innerHTML = "";

    if (snap.empty) {
      container.innerHTML = "<p>Nenhum artigo publicado ainda.</p>";
      return;
    }

    snap.forEach((docSnap) => {
      const a = docSnap.data();
      const href = `artigo_ind.html?id=${docSnap.id}`;
      const titulo = a.titulo || "Artigo";
      const img = normalizeImg(a.img || "");
      
      // Novos campos baseados no design (com fallbacks caso não existam no banco)
      const categoria = a.categoria || "Maternidade";
      const tempo = a.tempoLeitura || "5 min";
      const resumo = a.resumo ? escapeHtml(a.resumo).slice(0, 75) + "..." : "Dicas e reflexões essenciais para tornar a sua jornada mais leve.";
      const autor = a.autorNome || "Equipe EloMaterno";

      const mini = document.createElement("a");
      mini.className = "artigo-card-novo com-brilho";
      mini.href = href;
      
      mini.innerHTML = `
        <div class="ac-img-wrapper">
            <img src="${img}" alt="${escapeHtml(titulo)}" class="ac-cover">
            <span class="ac-tag">${categoria}</span>
            <div class="ac-bookmark"><i class="fa-regular fa-bookmark"></i></div>
        </div>
        <div class="ac-body">
            <span class="ac-time"><i class="fa-regular fa-clock"></i> ${tempo} de leitura</span>
            <h4 class="ac-title">${escapeHtml(titulo)}</h4>
            <p class="ac-excerpt">${resumo}</p>
            <div class="ac-footer">
                <span class="ac-author">${autor}</span>
                <span class="ac-ler">Ler <i class="fa-solid fa-arrow-right"></i></span>
            </div>
        </div>
      `;
      container.appendChild(mini);
    });
  } catch (e) {
    console.error("Erro ao carregar artigos:", e);
    container.innerHTML = "<p>Erro ao carregar artigos.</p>";
  }
}

carregarUltimosArtigos();