import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  Timestamp,
  onSnapshot,
  orderBy,
  serverTimestamp,
  updateDoc,
  setDoc,
  increment,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

/* ============================================================
   ELEMENTOS GERAIS
   ============================================================ */
const heroBoasVindas = document.getElementById("heroBoasVindas");
const logoutBtn = document.getElementById("logoutBtn");
const menuLogoutBtn = document.getElementById("menuLogoutBtn");
const headerAvatar = document.getElementById("headerAvatar");
const sidebarAvatar = document.getElementById("sidebarAvatar");
const sidebarNomeEmpresa = document.getElementById("sidebarNomeEmpresa");

/* Nome exibido publicamente: prioriza o Nome Fantasia; usa a Razão Social
   apenas como fallback para empresas que ainda não cadastraram um. */
function nomeExibicao(dados) {
  const fantasia = (dados?.nomeFantasia || "").trim();
  if (fantasia) return fantasia;
  return dados?.nomeEmpresa || "Parceiro";
}

const addPostBtnArtigosBtns = () => document.querySelectorAll(".add-post-btn-artigos");
const articlesGridArtigos = document.getElementById("articlesGridArtigos");

const modal = document.getElementById("postModal");
const closeModal = document.getElementById("closeModal");
const postForm = document.getElementById("postForm");
const postMsg = document.getElementById("postMsg");

const addEventBtns = () => document.querySelectorAll(".add-event-btn");
const eventModal = document.getElementById("eventModal");
const closeEventModal = document.getElementById("closeEventModal");
const eventForm = document.getElementById("eventForm");
const eventMsg = document.getElementById("eventMsg");

let nomeEmpresaAtual = "";
let uidAtual = null;
let dadosParceiroAtual = null;
let itemParaExcluir = null;
let tipoParaExcluir = "";

/* Fecha qualquer modal ao clicar fora do conteúdo (backdrop) ou pressionar Esc */
document.addEventListener("click", (e) => {
  if (e.target.classList && e.target.classList.contains("modal") && !e.target.classList.contains("hidden")) {
    e.target.classList.add("hidden");
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal:not(.hidden)").forEach((m) => m.classList.add("hidden"));
  }
});

/* Modal de confirmação de exclusão (criado dinamicamente, como no original) */
const confirmModal = document.createElement("div");
confirmModal.className = "modal hidden";
confirmModal.innerHTML = `
  <div class="modal-content" style="max-width:400px;text-align:center;">
    <h3>Tem certeza que deseja excluir?</h3>
    <p>Essa ação não pode ser desfeita.</p>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:15px;">
      <button id="confirmDelete" style="background:#d9534f;">Excluir</button>
      <button id="cancelDelete" style="background:#aaa;">Cancelar</button>
    </div>
  </div>
`;
document.body.appendChild(confirmModal);
const confirmDeleteBtn = confirmModal.querySelector("#confirmDelete");
const cancelDeleteBtn = confirmModal.querySelector("#cancelDelete");

function sanitize(str) {
  return (str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function tempoRelativo(data) {
  if (!data) return "";
  const agora = new Date();
  const diffMs = agora - data;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `há ${diffD} dia${diffD > 1 ? "s" : ""}`;
  return data.toLocaleDateString("pt-BR");
}

const TIPO_LABEL = {
  psicologo: "Psicólogo",
  apoio: "Apoio",
  oficinas: "Oficinas",
  juridico: "Jurídico",
};

const CATEGORIA_COR = {
  legislativos: "#e63946",
  educacionais: "#1d3557",
  dicas: "#2a9d8f",
  posts: "#6a4c93",
};

/* ============================================================
   NAVEGAÇÃO ENTRE SEÇÕES
   ============================================================ */
function goToSection(targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;

  document.querySelectorAll(".menu-btn").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-target") === targetId);
  });
  document.querySelectorAll(".content").forEach((c) => c.classList.add("hidden"));
  target.classList.remove("hidden");

  document.getElementById("headerUserMenu")?.classList.add("hidden");

  if (targetId === "artigos") carregarArtigosNaAbaArtigos(nomeEmpresaAtual);
  if (targetId === "notificacoes") abrirNotificacoes();
  if (targetId === "relatorios") carregarRelatorios();
  if (targetId === "configuracoes") carregarConfiguracoes();
  if (targetId === "perfil") carregarPerfil();
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-target]").forEach((el) => {
    el.addEventListener("click", () => goToSection(el.getAttribute("data-target")));
  });
});

/* Dropdown "Olá, Parceiro" */
document.getElementById("headerUserMenuToggle")?.addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("headerUserMenu")?.classList.toggle("hidden");
});
document.addEventListener("click", () => {
  document.getElementById("headerUserMenu")?.classList.add("hidden");
});

/* ============================================================
   AUTENTICAÇÃO / DADOS DO PARCEIRO
   ============================================================ */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "logParc.html";
    return;
  }
  uidAtual = user.uid;

  try {
    const docRef = doc(db, "parceiros", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      dadosParceiroAtual = docSnap.data();
      nomeEmpresaAtual = dadosParceiroAtual.nomeEmpresa || "Parceiro";
      if (heroBoasVindas) {
        heroBoasVindas.innerHTML = `Olá, ${sanitize(nomeExibicao(dadosParceiroAtual))}! <img src="./img/selinho-ver.svg" class="verificado-icon">`;
      }
      if (dadosParceiroAtual.fotoURL && headerAvatar) headerAvatar.src = dadosParceiroAtual.fotoURL;
      if (dadosParceiroAtual.fotoURL && sidebarAvatar) sidebarAvatar.src = dadosParceiroAtual.fotoURL;
      if (sidebarNomeEmpresa) sidebarNomeEmpresa.textContent = sanitize(nomeExibicao(dadosParceiroAtual));

      carregarArtigosNaAbaArtigos(nomeEmpresaAtual);
      await carregarEventosParceiro(nomeEmpresaAtual);
      await carregarDashboardStats();
      await carregarAtividadeEArtigosRecentes();
      atualizarIndicadorNotificacoes();
    } else {
      if (heroBoasVindas) heroBoasVindas.textContent = "Olá, parceiro!";
    }
  } catch (error) {
    console.error("Erro ao buscar dados da empresa:", error);
    if (heroBoasVindas) heroBoasVindas.textContent = "Olá!";
  }
});

[logoutBtn, menuLogoutBtn].forEach((btn) => {
  btn?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "logParc.html";
  });
});

/* ============================================================
   DASHBOARD — CARDS DE ESTATÍSTICA
   ============================================================ */
async function carregarDashboardStats() {
  try {
    const artigosSnap = await getDocs(query(collection(db, "artigos"), where("postadoPor", "==", nomeEmpresaAtual)));
    const totalArtigos = artigosSnap.size;
    const totalPosts = artigosSnap.docs.filter((d) => d.data().categoria === "posts").length;

    const eventosSnap = await getDocs(query(collection(db, "eventos"), where("enviadoPor", "==", nomeEmpresaAtual)));
    const totalEventos = eventosSnap.size;

    const usuariosSnap = await getDocs(query(collection(db, "usuarios"), where("tipo", "==", "mae")));
    const totalMaes = usuariosSnap.size;

    setText("statPosts", totalPosts);
    setText("statEventos", totalEventos);
    setText("statMaes", totalMaes);
    setText("statArtigos", totalArtigos);
  } catch (err) {
    console.error("Erro ao carregar estatísticas do dashboard:", err);
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ============================================================
   ATIVIDADE (comentários recebidos nos posts do fórum do parceiro)
   ============================================================ */
async function buscarAtividadeDoParceiro(limite = 30) {
  if (!uidAtual) return [];
  const autorId = "parc_" + uidAtual;

  const postsSnap = await getDocs(query(collection(db, "posts"), where("autorId", "==", autorId)));
  const atividades = [];

  for (const postDoc of postsSnap.docs) {
    const post = postDoc.data();
    const comentariosSnap = await getDocs(collection(db, "posts", postDoc.id, "comentarios"));
    comentariosSnap.forEach((c) => {
      const com = c.data();
      atividades.push({
        autorNome: com.autorNome || "Usuário",
        postTitulo: post.titulo || "seu post",
        conteudo: com.conteudo || "",
        data: com.data?.toDate ? com.data.toDate() : new Date(),
      });
    });
  }

  atividades.sort((a, b) => b.data - a.data);
  return atividades.slice(0, limite);
}

async function carregarAtividadeEArtigosRecentes() {
  const lista = document.getElementById("atividadeRecenteList");
  const sidebarLista = document.getElementById("sidebarAtividadeList");

  if (lista || sidebarLista) {
    try {
      const atividades = await buscarAtividadeDoParceiro(6);

      if (lista) {
        if (atividades.length === 0) {
          lista.innerHTML = `<p class="empty-hint">Nenhuma atividade recente ainda.</p>`;
        } else {
          lista.innerHTML = atividades.map((a) => `
            <div class="dash-item">
              <div class="dash-item-icon"><i class="fa-regular fa-comment"></i></div>
              <div class="dash-item-body">
                <span class="dash-item-title">${sanitize(a.autorNome)}</span> comentou em
                <span class="dash-item-title">${sanitize(a.postTitulo)}</span>
                <div class="dash-item-sub">${tempoRelativo(a.data)}</div>
              </div>
            </div>
          `).join("");
        }
      }

      if (sidebarLista) {
        const topAtividades = atividades.slice(0, 3);
        if (topAtividades.length === 0) {
          sidebarLista.innerHTML = `<p class="empty-hint">Nenhuma atividade ainda.</p>`;
        } else {
          sidebarLista.innerHTML = `<ul>${topAtividades.map((a) => `
            <li><strong>${sanitize(a.autorNome)}</strong> comentou em <strong>${sanitize(a.postTitulo)}</strong> · ${tempoRelativo(a.data)}</li>
          `).join("")}</ul>`;
        }
      }
    } catch (err) {
      console.error("Erro ao carregar atividade recente:", err);
      if (lista) lista.innerHTML = `<p class="empty-hint">Não foi possível carregar a atividade recente.</p>`;
      if (sidebarLista) sidebarLista.innerHTML = `<p class="empty-hint">Não foi possível carregar.</p>`;
    }
  }

  const artigosLista = document.getElementById("artigosRecentesList");
  if (artigosLista) {
    try {
      const snap = await getDocs(query(collection(db, "artigos"), where("postadoPor", "==", nomeEmpresaAtual)));
      const artigos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      artigos.sort((a, b) => toDate(b.datahorapost) - toDate(a.datahorapost));
      const topArtigos = artigos.slice(0, 3);

      if (topArtigos.length === 0) {
        artigosLista.innerHTML = `<p class="empty-hint">Você ainda não publicou artigos.</p>`;
      } else {
        artigosLista.innerHTML = topArtigos.map((a) => `
          <div class="dash-item">
            <img class="dash-item-thumb" src="${sanitize(a.img || './img/artigo_icon.png')}" alt="">
            <div class="dash-item-body">
              <div class="dash-item-title">${sanitize(a.titulo)}</div>
              <div class="dash-item-sub">${toDate(a.datahorapost).toLocaleDateString("pt-BR")}</div>
            </div>
          </div>
        `).join("");
      }
    } catch (err) {
      console.error("Erro ao carregar artigos recentes:", err);
    }
  }
}

function toDate(v) {
  if (!v) return new Date(0);
  if (v.toDate) return v.toDate();
  return new Date(v);
}

/* ============================================================
   NOTIFICAÇÕES
   ============================================================ */
function chaveUltimaVisita() {
  return `parc_notif_seen_${uidAtual}`;
}

function getUltimaVisitaNotificacoes() {
  const v = localStorage.getItem(chaveUltimaVisita());
  return v ? new Date(v) : new Date(0);
}

async function atualizarIndicadorNotificacoes() {
  const dot = document.getElementById("notifDot");
  if (!dot) return;
  try {
    const atividades = await buscarAtividadeDoParceiro(10);
    const ultimaVisita = getUltimaVisitaNotificacoes();
    const temNaoLida = atividades.some((a) => a.data > ultimaVisita);
    dot.classList.toggle("hidden", !temNaoLida);
  } catch (err) {
    console.error("Erro ao verificar notificações:", err);
  }
}

let notificacoesCache = [];
let filtroNotifAtual = "todos";

async function abrirNotificacoes() {
  const lista = document.getElementById("notifList");
  if (!lista) return;
  lista.innerHTML = `<div class="loader"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;

  try {
    notificacoesCache = await buscarAtividadeDoParceiro(40);
    renderNotificacoes();
  } catch (err) {
    console.error("Erro ao carregar notificações:", err);
    lista.innerHTML = `<p class="empty-hint">Não foi possível carregar as notificações.</p>`;
  }

  localStorage.setItem(chaveUltimaVisita(), new Date().toISOString());
  document.getElementById("notifDot")?.classList.add("hidden");
}

function renderNotificacoes() {
  const lista = document.getElementById("notifList");
  if (!lista) return;
  const ultimaVisita = getUltimaVisitaNotificacoes();

  let itens = notificacoesCache;
  if (filtroNotifAtual === "nao-lidos") {
    itens = itens.filter((a) => a.data > ultimaVisita);
  }

  if (itens.length === 0) {
    lista.innerHTML = `<p class="empty-hint" style="padding:20px;">Nenhuma notificação por aqui.</p>`;
    return;
  }

  lista.innerHTML = itens.map((a) => {
    const naoLida = a.data > ultimaVisita;
    return `
      <div class="notif-item ${naoLida ? "unread" : ""}">
        <div class="notif-avatar"><i class="fa-regular fa-comment"></i></div>
        <div>
          <div class="notif-title">Novo comentário em: "${sanitize(a.postTitulo)}"</div>
          <div class="notif-sub">${sanitize(a.autorNome)} comentou no seu artigo</div>
        </div>
      </div>
    `;
  }).join("");
}

document.querySelectorAll('#notifFiltros [data-notif-filter]').forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll('#notifFiltros [data-notif-filter]').forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    filtroNotifAtual = btn.getAttribute("data-notif-filter");
    renderNotificacoes();
  });
});

/* ============================================================
   ARTIGOS — criação, listagem, filtros e busca
   ============================================================ */
addPostBtnArtigosBtns().forEach((btn) => btn.addEventListener("click", () => modal.classList.remove("hidden")));
closeModal?.addEventListener("click", () => modal.classList.add("hidden"));

postForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const artigo = {
    titulo: document.getElementById("artigoTitulo").value.trim(),
    descricao: document.getElementById("artigoDescricao").value.trim(),
    resumo: document.getElementById("resumo").value.trim(),
    img: document.getElementById("img").value.trim(),
    link: document.getElementById("link").value.trim(),
    categoria: document.getElementById("categoria").value,
    postadoPor: nomeEmpresaAtual,
    datahorapost: new Date(),
    custoMoedas: Number(document.getElementById("artigoCustoMoedas")?.value) || 0,
    parceiroId: uidAtual,
  };

  try {
    await addDoc(collection(db, "artigos"), artigo);
    postMsg.style.color = "green";
    postMsg.textContent = "Post criado com sucesso!";
    postForm.reset();
    modal.classList.add("hidden");
    carregarArtigosNaAbaArtigos(nomeEmpresaAtual);
    carregarDashboardStats();
    carregarAtividadeEArtigosRecentes();
  } catch (err) {
    console.error("Erro ao criar post:", err);
    postMsg.style.color = "red";
    postMsg.textContent = "Erro ao criar post.";
  }
});

async function carregarArtigosNaAbaArtigos(nomeEmpresa) {
  if (!articlesGridArtigos || !nomeEmpresa) return;
  const q = query(
    collection(db, "artigos"),
    where("postadoPor", "==", nomeEmpresa)
  );
  const snapshot = await getDocs(q);

  articlesGridArtigos.innerHTML = "";

  if (snapshot.empty) {
    articlesGridArtigos.innerHTML = `<p class="empty-hint">Você ainda não publicou nenhum artigo.</p>`;
    return;
  }

  snapshot.forEach((d) => {
    const art = d.data();
    const cor = CATEGORIA_COR[art.categoria] || "#7a5fe8";
    const dataFormatada = toDate(art.datahorapost).toLocaleDateString("pt-BR");

    const card = document.createElement("div");
    card.className = "article-card";
    card.setAttribute("data-categoria", art.categoria);

    card.innerHTML = `
      <div class="delete-btn"><i class="fa-solid fa-trash"></i></div>
      <div class="card-topbar" style="background:${cor}"></div>
      ${art.img ? `<img src="${sanitize(art.img)}" class="article-img" alt="${sanitize(art.titulo)}">` : `<div class="article-thumb"><i class="fa-regular fa-image"></i></div>`}
      <div class="article-body">
        <h3>${sanitize(art.titulo)}</h3>
        <p>${sanitize(art.descricao)}</p>
        <span class="categoria-tag">${sanitize(art.categoria)}</span>
        <div class="article-card-footer">
          <span class="article-card-date">${dataFormatada}</span>
          <button class="article-card-ver">Ver →</button>
        </div>
      </div>
    `;

    card.querySelector(".delete-btn").addEventListener("click", () => {
      itemParaExcluir = d.id;
      tipoParaExcluir = "artigo";
      confirmModal.classList.remove("hidden");
    });

    if (art.link) {
      card.querySelector(".article-card-ver").addEventListener("click", () => window.open(art.link, "_blank"));
    }

    articlesGridArtigos.appendChild(card);
  });

  configurarFiltrosArtigos();
  aplicarBuscaArtigos();
}

function configurarFiltrosArtigos() {
  const botoes = document.querySelectorAll(".filtro-btn");
  botoes.forEach((btn) => {
    btn.onclick = () => {
      botoes.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      aplicarBuscaArtigos();
    };
  });
}

function aplicarBuscaArtigos() {
  const categoriaAtiva = document.querySelector(".filtro-btn.active")?.getAttribute("data-cat") || "todas";
  const termo = (document.getElementById("artigos-search-input")?.value || "").toLowerCase();

  document.querySelectorAll("#articlesGridArtigos .article-card").forEach((card) => {
    const cardCat = card.getAttribute("data-categoria");
    const titulo = card.querySelector("h3")?.textContent.toLowerCase() || "";
    const bateCategoria = categoriaAtiva === "todas" || categoriaAtiva === cardCat;
    const bateTermo = !termo || titulo.includes(termo);
    card.style.display = bateCategoria && bateTermo ? "flex" : "none";
  });
}

document.getElementById("artigos-search-input")?.addEventListener("input", aplicarBuscaArtigos);

/* ============================================================
   EVENTOS / CALENDÁRIO
   ============================================================ */
addEventBtns().forEach((btn) => btn.addEventListener("click", () => eventModal.classList.remove("hidden")));
closeEventModal?.addEventListener("click", () => eventModal.classList.add("hidden"));

eventForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const evento = {
    titulo: document.getElementById("tituloEvento").value.trim(),
    descricao: document.getElementById("descricaoEvento").value.trim(),
    data: Timestamp.fromDate(new Date(document.getElementById("dataEvento").value)),
    local: document.getElementById("localEvento").value.trim(),
    capa: document.getElementById("capaEvento").value.trim(),
    tipo: document.getElementById("tipoEvento").value,
    enviadoPor: nomeEmpresaAtual,
  };

  try {
    await addDoc(collection(db, "eventos"), evento);
    eventMsg.style.color = "green";
    eventMsg.textContent = "Evento criado com sucesso!";
    eventForm.reset();
    eventModal.classList.add("hidden");
    await carregarEventosParceiro(nomeEmpresaAtual);
    carregarDashboardStats();
  } catch (err) {
    console.error("Erro ao criar evento:", err);
    eventMsg.style.color = "red";
    eventMsg.textContent = "Erro ao criar evento.";
  }
});

let eventosParceiro = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let diaSelecionado = null;

async function carregarEventosParceiro(nomeEmpresa) {
  if (!nomeEmpresa) return;
  const q = query(collection(db, "eventos"), where("enviadoPor", "==", nomeEmpresa));
  const snap = await getDocs(q);

  const eventos = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    eventos.push({
      id: docSnap.id,
      ...data,
      data: data.data?.toDate ? data.data.toDate() : new Date(data.data),
    });
  });

  eventosParceiro = eventos;
  inicializarSelects();
  renderCalendar();
  renderProximosEventosDashboard();
}

function inicializarSelects() {
  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");
  if (!monthSelect || !yearSelect) return;

  const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  if (monthSelect.options.length === 0) {
    months.forEach((m, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = m;
      monthSelect.appendChild(opt);
    });
    const year = new Date().getFullYear();
    for (let y = year - 2; y <= year + 3; y++) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    }
  }
  atualizarSelects();
}

function atualizarSelects() {
  const monthSelect = document.getElementById("month-select");
  const yearSelect = document.getElementById("year-select");
  if (!monthSelect || !yearSelect) return;
  monthSelect.value = currentMonth;
  yearSelect.value = currentYear;
  renderCalendar();
}

window.prevMonth = function () {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  atualizarSelects();
};
window.nextMonth = function () {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  atualizarSelects();
};
window.onMonthChange = function () {
  currentMonth = parseInt(document.getElementById("month-select").value);
  renderCalendar();
};
window.onYearChange = function () {
  currentYear = parseInt(document.getElementById("year-select").value);
  renderCalendar();
};

function renderCalendar() {
  const calendarDates = document.getElementById("calendarDates");
  if (!calendarDates) return;

  const today = new Date();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  calendarDates.innerHTML = "";

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.classList.add("empty");
    calendarDates.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateDiv = document.createElement("div");
    dateDiv.classList.add("date");

    const current = new Date(currentYear, currentMonth, d);
    if (current.toDateString() === today.toDateString()) dateDiv.classList.add("today");
    if (current < today && current.toDateString() !== today.toDateString()) dateDiv.classList.add("past");

    const eventosDia = eventosParceiro.filter(
      (ev) => ev.data.getDate() === d && ev.data.getMonth() === currentMonth && ev.data.getFullYear() === currentYear
    );

    dateDiv.textContent = d;

    if (eventosDia.length > 0) {
      dateDiv.classList.add("has-event");
      dateDiv.title = eventosDia.map((ev) => ev.titulo).join(", ");
      const dot = document.createElement("span");
      dot.className = `event-dot tipo-${eventosDia[0].tipo || "apoio"}`;
      dateDiv.appendChild(dot);

      dateDiv.addEventListener("click", () => {
        diaSelecionado = current;
        renderEventosDoDia(eventosDia, current);
      });
    }

    calendarDates.appendChild(dateDiv);
  }
}

function renderEventosDoDia(eventos, dataRef) {
  const titulo = document.getElementById("eventosDoDiaTitulo");
  const lista = document.getElementById("eventosDoDiaList");
  if (!lista) return;

  if (titulo) {
    titulo.textContent = `Eventos do dia — ${dataRef.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}`;
  }

  const ordenados = [...eventos].sort((a, b) => a.data - b.data);

  lista.innerHTML = ordenados.map((ev) => `
    <div class="event evento-card" style="border-left-color:${corDoTipo(ev.tipo)}">
      <div class="evento-card-header">
        <strong>${ev.data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</strong>
        <div class="evento-card-actions">
          <span class="evento-tipo-tag tipo-${ev.tipo || "apoio"}">${TIPO_LABEL[ev.tipo] || "Evento"}</span>
          <div class="delete-btn"><i class="fa-solid fa-trash"></i></div>
        </div>
      </div>
      <p style="margin:4px 0 2px;font-weight:600;">${sanitize(ev.titulo)}</p>
      <p style="margin:0;color:#777;">${sanitize(ev.local)}</p>
    </div>
  `).join("");

  lista.querySelectorAll(".delete-btn").forEach((btn, i) => {
    btn.addEventListener("click", () => {
      itemParaExcluir = ordenados[i].id;
      tipoParaExcluir = "evento";
      confirmModal.classList.remove("hidden");
    });
  });
}

function corDoTipo(tipo) {
  return { psicologo: "#2d2d7a", apoio: "#e0524f", oficinas: "#4caf6b", juridico: "#37c1d1" }[tipo] || "#7a5fe8";
}

function renderProximosEventosDashboard() {
  const lista = document.getElementById("proximosEventosList");
  if (!lista) return;

  const agora = new Date();
  const proximos = eventosParceiro.filter((ev) => ev.data >= agora).sort((a, b) => a.data - b.data).slice(0, 3);

  if (proximos.length === 0) {
    lista.innerHTML = `<p class="empty-hint">Nenhum evento futuro cadastrado.</p>`;
    return;
  }

  lista.innerHTML = proximos.map((ev) => `
    <div class="dash-item">
      <div class="dash-item-icon"><i class="fa-regular fa-calendar"></i></div>
      <div class="dash-item-body">
        <div class="dash-item-title">${sanitize(ev.titulo)}</div>
        <div class="dash-item-sub">${ev.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} • ${sanitize(ev.local)}</div>
      </div>
    </div>
  `).join("");
}

/* ============================================================
   CONFIRMAÇÃO DE EXCLUSÃO (artigos/eventos)
   ============================================================ */
confirmDeleteBtn.addEventListener("click", async () => {
  if (!itemParaExcluir) return;
  try {
    if (tipoParaExcluir === "artigo") {
      await deleteDoc(doc(db, "artigos", itemParaExcluir));
      carregarArtigosNaAbaArtigos(nomeEmpresaAtual);
      carregarDashboardStats();
      carregarAtividadeEArtigosRecentes();
    } else if (tipoParaExcluir === "evento") {
      await deleteDoc(doc(db, "eventos", itemParaExcluir));
      await carregarEventosParceiro(nomeEmpresaAtual);
      carregarDashboardStats();
      document.getElementById("eventosDoDiaList").innerHTML = `<p class="empty-hint">Selecione um dia com evento para ver os detalhes.</p>`;
    }
  } catch (err) {
    console.error("Erro ao excluir:", err);
  } finally {
    confirmModal.classList.add("hidden");
    itemParaExcluir = null;
    tipoParaExcluir = "";
  }
});

cancelDeleteBtn.addEventListener("click", () => {
  confirmModal.classList.add("hidden");
  itemParaExcluir = null;
});

/* ============================================================
   RELATÓRIOS
   ============================================================ */
let chartsInstanciados = {};

async function carregarRelatorios() {
  try {
    const artigosSnap = await getDocs(query(collection(db, "artigos"), where("postadoPor", "==", nomeEmpresaAtual)));
    const artigos = artigosSnap.docs.map((d) => d.data());

    setText("repArtigos", artigos.length);
    setText("repEventos", eventosParceiro.length);

    const postsSnap = await getDocs(query(collection(db, "posts"), where("autorId", "==", "parc_" + uidAtual)));
    let totalLikes = 0;
    let totalComentarios = 0;
    const comentaristasUnicos = new Set();

    for (const postDoc of postsSnap.docs) {
      const post = postDoc.data();
      totalLikes += post.likes || 0;
      const comentariosSnap = await getDocs(collection(db, "posts", postDoc.id, "comentarios"));
      totalComentarios += comentariosSnap.size;
      comentariosSnap.forEach((c) => {
        const autorId = c.data().autorId;
        if (autorId) comentaristasUnicos.add(autorId);
      });
    }

    setText("repParticipantes", totalLikes + totalComentarios);
    setText("repNovosMembros", comentaristasUnicos.size);

    renderChartArtigosPorMes(artigos);
    renderChartEventosPorMes(eventosParceiro);
    renderChartParticipacaoForum(postsSnap.size, totalComentarios, totalLikes);
  } catch (err) {
    console.error("Erro ao carregar relatórios:", err);
  }
}

function ultimosNMeses(n) {
  const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const arr = [];
  const hoje = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    arr.push({ label: nomes[d.getMonth()], mes: d.getMonth(), ano: d.getFullYear() });
  }
  return arr;
}

function renderChartArtigosPorMes(artigos) {
  const canvas = document.getElementById("chartArtigos");
  if (!canvas || !window.Chart) return;
  const meses = ultimosNMeses(6);
  const dados = meses.map((m) => artigos.filter((a) => {
    const d = toDate(a.datahorapost);
    return d.getMonth() === m.mes && d.getFullYear() === m.ano;
  }).length);

  chartsInstanciados.artigos?.destroy();
  chartsInstanciados.artigos = new Chart(canvas, {
    type: "line",
    data: {
      labels: meses.map((m) => m.label),
      datasets: [{ data: dados, borderColor: "#7a5fe8", backgroundColor: "rgba(122,95,232,0.15)", fill: true, tension: 0.35 }],
    },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
  });
}

function renderChartEventosPorMes(eventos) {
  const canvas = document.getElementById("chartEventos");
  if (!canvas || !window.Chart) return;
  const meses = ultimosNMeses(6);
  const dados = meses.map((m) => eventos.filter((ev) => ev.data.getMonth() === m.mes && ev.data.getFullYear() === m.ano).length);

  chartsInstanciados.eventos?.destroy();
  chartsInstanciados.eventos = new Chart(canvas, {
    type: "bar",
    data: { labels: meses.map((m) => m.label), datasets: [{ data: dados, backgroundColor: "#f1b93f", borderRadius: 6 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
  });
}

function renderChartParticipacaoForum(discussoes, comentarios, curtidas) {
  const canvas = document.getElementById("chartForum");
  if (!canvas || !window.Chart) return;

  chartsInstanciados.forum?.destroy();
  const total = discussoes + comentarios + curtidas || 1;
  chartsInstanciados.forum = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Discussões", "Comentários", "Curtidas"],
      datasets: [{ data: [discussoes, comentarios, curtidas], backgroundColor: ["#7a5fe8", "#bfa8f5", "#e6ddfb"] }],
    },
    options: { maintainAspectRatio: false, plugins: { legend: { position: "right" } } },
  });
}

document.getElementById("exportarRelatorioBtn")?.addEventListener("click", () => {
  const linhas = [
    ["Métrica", "Valor"],
    ["Artigos publicados", document.getElementById("repArtigos")?.textContent || "0"],
    ["Eventos realizados", document.getElementById("repEventos")?.textContent || "0"],
    ["Participantes alcançados", document.getElementById("repParticipantes")?.textContent || "0"],
    ["Novos membros", document.getElementById("repNovosMembros")?.textContent || "0"],
  ];
  const csv = linhas.map((l) => l.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `relatorio_${nomeEmpresaAtual || "parceiro"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

/* ============================================================
   CONFIGURAÇÕES
   ============================================================ */
function carregarConfiguracoes() {
  if (!dadosParceiroAtual) return;
  setValue("cfgNomeEmpresa", dadosParceiroAtual.nomeEmpresa || "");
  setValue("cfgNomeFantasia", dadosParceiroAtual.nomeFantasia || "");
  setValue("cfgEmail", dadosParceiroAtual.email || "");
  setValue("cfgTelefone", dadosParceiroAtual.telefone || "");
  setValue("cfgCidade", dadosParceiroAtual.cidade || "");

  const foto = dadosParceiroAtual.fotoURL || "./img/logo_icon.png";
  const preview = document.getElementById("cfgFotoPreview");
  if (preview) preview.src = foto;

  const ultimaAlteracao = document.getElementById("segUltimaAlteracaoSenha");
  if (ultimaAlteracao) ultimaAlteracao.textContent = "Última alteração: não disponível";
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

document.getElementById("formConfigConta")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("cfgSalvarMsg");
  try {
    const dadosAtualizados = {
      nomeEmpresa: document.getElementById("cfgNomeEmpresa").value.trim(),
      nomeFantasia: document.getElementById("cfgNomeFantasia").value.trim(),
      email: document.getElementById("cfgEmail").value.trim(),
      telefone: document.getElementById("cfgTelefone").value.trim(),
      cidade: document.getElementById("cfgCidade").value.trim(),
    };
    await updateDoc(doc(db, "parceiros", uidAtual), dadosAtualizados);
    if (dadosAtualizados.nomeFantasia) {
      try {
        await updateDoc(doc(db, "usuarios", uidAtual), { nome: dadosAtualizados.nomeFantasia });
      } catch (errUsuario) {
        console.error("Erro ao atualizar nome público:", errUsuario);
      }
    }
    dadosParceiroAtual = { ...dadosParceiroAtual, ...dadosAtualizados };
    nomeEmpresaAtual = dadosAtualizados.nomeEmpresa || nomeEmpresaAtual;
    if (heroBoasVindas) {
      heroBoasVindas.innerHTML = `Olá, ${sanitize(nomeExibicao(dadosParceiroAtual))}! <img src="./img/selinho-ver.svg" class="verificado-icon">`;
    }
    const perfilNome = document.getElementById("perfilNomeEmpresa");
    if (perfilNome) perfilNome.textContent = nomeExibicao(dadosParceiroAtual);

    if (msg) { msg.style.color = "green"; msg.textContent = "Alterações salvas com sucesso!"; }
  } catch (err) {
    console.error("Erro ao salvar configurações:", err);
    if (msg) { msg.style.color = "red"; msg.textContent = "Erro ao salvar alterações."; }
  }
});

document.getElementById("segAlterarSenhaBtn")?.addEventListener("click", async () => {
  try {
    await sendPasswordResetEmail(auth, dadosParceiroAtual?.email || auth.currentUser.email);
    alert("Enviamos um e-mail para redefinição de senha.");
  } catch (err) {
    console.error("Erro ao solicitar redefinição de senha:", err);
    alert("Não foi possível enviar o e-mail de redefinição.");
  }
});

document.getElementById("segSairContaBtn")?.addEventListener("click", async () => {
  if (!confirm("Deseja realmente sair da sua conta?")) return;
  try {
    await signOut(auth);
    window.location.href = "logParc.html";
  } catch (err) {
    console.error("Erro ao sair da conta:", err);
    alert("Não foi possível sair da conta. Tente novamente.");
  }
});

/* ============================================================
   EXCLUSÃO DE CONTA
   ============================================================ */
const excluirContaModal = document.getElementById("excluirContaModal");
const excluirContaSenhaInput = document.getElementById("excluirContaSenha");
const excluirContaMsg = document.getElementById("excluirContaMsg");

function abrirExcluirContaModal() {
  if (!excluirContaModal) return;
  if (excluirContaSenhaInput) excluirContaSenhaInput.value = "";
  if (excluirContaMsg) excluirContaMsg.textContent = "";
  excluirContaModal.classList.remove("hidden");
}
function fecharExcluirContaModal() {
  excluirContaModal?.classList.add("hidden");
}

document.getElementById("segExcluirContaBtn")?.addEventListener("click", abrirExcluirContaModal);
document.getElementById("closeExcluirContaModal")?.addEventListener("click", fecharExcluirContaModal);
document.getElementById("cancelarExcluirConta")?.addEventListener("click", fecharExcluirContaModal);

document.getElementById("confirmarExcluirConta")?.addEventListener("click", async () => {
  const senha = excluirContaSenhaInput?.value || "";
  if (!senha) {
    if (excluirContaMsg) { excluirContaMsg.style.color = "red"; excluirContaMsg.textContent = "Digite sua senha para confirmar."; }
    return;
  }
  try {
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, senha);
    await reauthenticateWithCredential(user, credential);

    try { await deleteDoc(doc(db, "parceiros", user.uid)); } catch (e) { console.warn("Erro ao remover dados de parceiro:", e); }
    try { await deleteDoc(doc(db, "usuarios", user.uid)); } catch (e) { console.warn("Erro ao remover dados de usuário:", e); }

    await deleteUser(user);

    fecharExcluirContaModal();
    alert("Sua conta foi excluída com sucesso.");
    window.location.href = "logParc.html";
  } catch (err) {
    console.error("Erro ao excluir conta:", err);
    if (excluirContaMsg) {
      excluirContaMsg.style.color = "red";
      excluirContaMsg.textContent = err.code === "auth/wrong-password"
        ? "Senha incorreta. Tente novamente."
        : "Não foi possível excluir a conta. Tente novamente.";
    }
  }
});

document.getElementById("cfgAlterarFotoBtn")?.addEventListener("click", async () => {
  const url = prompt("Cole a URL da nova foto/logo da empresa:");
  if (!url) return;
  try {
    await updateDoc(doc(db, "parceiros", uidAtual), { fotoURL: url });
    dadosParceiroAtual.fotoURL = url;
    document.getElementById("cfgFotoPreview").src = url;
    if (headerAvatar) headerAvatar.src = url;
    if (sidebarAvatar) sidebarAvatar.src = url;
  } catch (err) {
    console.error("Erro ao atualizar foto:", err);
  }
});

document.querySelectorAll(".config-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".config-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".config-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`configPanel-${tab.getAttribute("data-config-tab")}`)?.classList.add("active");
  });
});

/* ============================================================
   PERFIL / MINHA EMPRESA
   ============================================================ */
async function carregarPerfil() {
  if (!dadosParceiroAtual) return;

  setText("perfilNomeEmpresa", nomeExibicao(dadosParceiroAtual) || "Empresa parceira");
  setText("perfilCidade", dadosParceiroAtual.cidade || "Não informado");
  setText("perfilSite", dadosParceiroAtual.site || "Não informado");
  setText("perfilEmail", dadosParceiroAtual.email || "—");
  setText("perfilTelefone", dadosParceiroAtual.telefone || "—");
  const logo = document.getElementById("perfilLogo");
  if (logo) logo.src = dadosParceiroAtual.fotoURL || "./img/logo_icon.png";

  try {
    const artigosSnap = await getDocs(query(collection(db, "artigos"), where("postadoPor", "==", nomeEmpresaAtual)));
    const artigos = artigosSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const postsSnap = await getDocs(query(collection(db, "posts"), where("autorId", "==", "parc_" + uidAtual)));
    let totalLikes = 0;
    let totalComentarios = 0;
    for (const postDoc of postsSnap.docs) {
      totalLikes += postDoc.data().likes || 0;
      const comentariosSnap = await getDocs(collection(db, "posts", postDoc.id, "comentarios"));
      totalComentarios += comentariosSnap.size;
    }

    setText("perfilArtigosCount", artigos.length);
    setText("perfilEventosCount", eventosParceiro.length);
    setText("perfilUsuariasCount", totalLikes + totalComentarios);
    setText("perfilForumCount", postsSnap.size);

    artigos.sort((a, b) => toDate(b.datahorapost) - toDate(a.datahorapost));
    const listaArtigos = document.getElementById("perfilArtigosList");
    if (listaArtigos) {
      listaArtigos.innerHTML = artigos.slice(0, 3).map((a) => `
        <div class="dash-item">
          <img class="dash-item-thumb" src="${sanitize(a.img || './img/artigo_icon.png')}" alt="">
          <div class="dash-item-body">
            <span class="categoria-tag">${sanitize(a.categoria)}</span>
            <div class="dash-item-title">${sanitize(a.titulo)}</div>
            <div class="dash-item-sub">${toDate(a.datahorapost).toLocaleDateString("pt-BR")}</div>
          </div>
        </div>
      `).join("") || `<p class="empty-hint">Nenhum artigo publicado ainda.</p>`;
    }

    const atividades = await buscarAtividadeDoParceiro(4);
    const listaAtividade = document.getElementById("perfilAtividadeList");
    if (listaAtividade) {
      listaAtividade.innerHTML = atividades.map((a) => `
        <div class="dash-item">
          <div class="dash-item-icon"><i class="fa-regular fa-comment"></i></div>
          <div class="dash-item-body">
            <span class="dash-item-title">${sanitize(a.autorNome)}</span> comentou em
            <span class="dash-item-title">${sanitize(a.postTitulo)}</span>
            <div class="dash-item-sub">${tempoRelativo(a.data)}</div>
          </div>
        </div>
      `).join("") || `<p class="empty-hint">Nenhuma atividade recente.</p>`;
    }
  } catch (err) {
    console.error("Erro ao carregar perfil:", err);
  }
}

/* ============================================================
   PUBLICAR COMUNICADO (atalho reaproveita o modal de artigos)
   ============================================================ */
document.getElementById("qaComunicadoBtn")?.addEventListener("click", () => {
  modal.classList.remove("hidden");
  const categoriaSelect = document.getElementById("categoria");
  if (categoriaSelect) categoriaSelect.value = "posts";
});

/* ============================================================
   FÓRUM (mantido conforme original)
   ============================================================ */
function initForumParceiro() {
  const postsList = document.getElementById("posts-list");
  const novaBtn = document.getElementById("nova-post-btn");
  const novaBtnFixa = document.getElementById("nova-post-fixa");
  const modalForum = document.getElementById("modal-post");
  const formPost = document.getElementById("form-post");
  const cancelarPost = document.getElementById("cancelar-post");
  const closePostModal = document.getElementById("close-post-modal");
  const inputTitulo = modalForum ? modalForum.querySelector("#titulo") : null;
  const inputConteudo = modalForum ? modalForum.querySelector("#conteudo") : null;
  const anonimoCheck = modalForum ? modalForum.querySelector("#anonimo-checkbox") : null;
  const searchInput = document.getElementById("forum-search-input");

  if (!postsList || !modalForum || !formPost || !inputTitulo || !inputConteudo) return;

  let usuarioLogado = null;
  let dadosParceiro = null;

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    usuarioLogado = user;

    try {
      const parceiroSnap = await getDoc(doc(db, "parceiros", user.uid));
      dadosParceiro = parceiroSnap.exists() ? parceiroSnap.data() : null;
    } catch (err) {
      dadosParceiro = null;
    }

    const q = query(collection(db, "posts"), orderBy("data", "desc"));
    onSnapshot(q, async (snapshot) => {
      const cards = [];
      for (const docSnap of snapshot.docs) {
        const post = docSnap.data();
        const id = docSnap.id;
        const dataFormatada = post.data?.toDate ? post.data.toDate().toLocaleString("pt-BR") : "Agora";
        const isParceiro = post.autorId && post.autorId.startsWith("parc_");

        let comentariosCount = 0;
        try {
          const commentsSnap = await getDocs(collection(db, "posts", id, "comentarios"));
          comentariosCount = commentsSnap.size;
        } catch (err) {}

        const card = document.createElement("div");
        card.className = `post-card com-brilho ${isParceiro ? "parceiro" : ""}`;
        card.dataset.id = id;
        card.innerHTML = `
          <h3 class="post-title">${sanitize(post.titulo)}</h3>
          <div class="post-meta">
            <img src="${sanitize(post.autorFoto || "./img/account_icon.png")}" class="author-avatar" alt="avatar">
            <div>
              <span class="author-name">${sanitize(post.autorNome || "Usuário")}</span>
              <span class="post-date">${dataFormatada}</span>
            </div>
          </div>
          <p class="post-content">${sanitize(post.conteudo)}</p>
          <div class="like-wrap" data-id="${id}">
            <img src="./img/like_icon.png" alt="Curtir" class="like-icon">
            <span class="like-count">${post.likes || 0}</span>
          </div>
          <div class="post-actions">
            <div class="comments-info">
              <img src="./img/consult_icon.png" alt="Comentários" class="comment-icon">
              <span class="comment-count" data-id="${id}">${comentariosCount}</span>
            </div>
            ${usuarioLogado && usuarioLogado.uid === post.autorId ? `<button class="delete-btn action-btn" data-id="${id}">Excluir</button>` : ""}
          </div>
        `;
        cards.push(card);
      }
      postsList.innerHTML = "";
      cards.forEach((c) => postsList.appendChild(c));
    });
  });

  async function criarPost(titulo, conteudo) {
    if (!usuarioLogado) { alert("Você precisa estar logado para postar."); return; }
    let autorId, autorNome, autorFoto;
    if (anonimoCheck && anonimoCheck.checked) {
      autorId = "anonimo"; autorNome = "Anônimo"; autorFoto = "./img/account_icon.png";
    } else if (dadosParceiro) {
      autorId = "parc_" + usuarioLogado.uid;
      autorNome = dadosParceiro.nomeEmpresa || "Parceiro";
      autorFoto = "./img/logo_icon.png";
    } else {
      const usuarioSnap = await getDoc(doc(db, "usuarios", usuarioLogado.uid));
      const dadosUsuario = usuarioSnap.exists() ? usuarioSnap.data() : {};
      autorId = usuarioLogado.uid;
      autorNome = dadosUsuario.nome || "Usuário";
      autorFoto = dadosUsuario.avatar || "./img/account_icon.png";
    }

    await addDoc(collection(db, "posts"), {
      autorId, autorNome, autorFoto, titulo, conteudo, likes: 0, data: serverTimestamp(),
    });
    carregarDashboardStats();
  }

  [novaBtn, novaBtnFixa].forEach((btn) => btn?.addEventListener("click", () => {
    inputTitulo.value = ""; inputConteudo.value = ""; modalForum.classList.remove("hidden");
  }));
  cancelarPost?.addEventListener("click", () => modalForum.classList.add("hidden"));
  closePostModal?.addEventListener("click", () => modalForum.classList.add("hidden"));

  formPost.addEventListener("submit", async (e) => {
    e.preventDefault();
    const titulo = inputTitulo.value.trim();
    const conteudo = inputConteudo.value.trim();
    if (!titulo || !conteudo) { alert("Título e conteúdo são obrigatórios."); return; }
    await criarPost(titulo, conteudo);
    modalForum.classList.add("hidden");
  });

  postsList.addEventListener("click", async (e) => {
    const card = e.target.closest(".post-card");
    if (!card) return;
    const postId = card.dataset.id;

    if (e.target.classList.contains("like-icon")) {
      e.stopPropagation();
      if (!usuarioLogado) return alert("É necessário estar logado para curtir.");
      const likeWrap = e.target.closest(".like-wrap");
      const countEl = likeWrap.querySelector(".like-count");
      const current = parseInt(countEl.textContent) || 0;
      const liked = e.target.src.includes("like_curtido.png");
      countEl.textContent = liked ? current - 1 : current + 1;
      e.target.src = liked ? "./img/like_icon.png" : "./img/like_curtido.png";

      const likeRef = doc(db, "posts", postId, "likes", usuarioLogado.uid);
      try {
        const snap = await getDoc(likeRef);
        if (snap.exists()) {
          await deleteDoc(likeRef);
          await updateDoc(doc(db, "posts", postId), { likes: increment(-1) });
        } else {
          await setDoc(likeRef, { curtido: true });
          await updateDoc(doc(db, "posts", postId), { likes: increment(1) });
        }
      } catch (err) { console.error("Erro ao curtir:", err); }
      return;
    }

    if (e.target.closest(".delete-btn")) {
      if (confirm("Deseja realmente excluir este post?")) await deleteDoc(doc(db, "posts", postId));
      return;
    }

    window.location.href = `comentResp.html?postId=${postId}`;
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const termo = searchInput.value.toLowerCase();
      document.querySelectorAll(".post-card").forEach((card) => {
        const titulo = card.querySelector(".post-title")?.textContent.toLowerCase() || "";
        const autor = card.querySelector(".author-name")?.textContent.toLowerCase() || "";
        card.style.display = titulo.includes(termo) || autor.includes(termo) ? "block" : "none";
      });
    });
  }

  document.addEventListener("mousemove", (e) => {
    document.querySelectorAll(".post-card.com-brilho").forEach((card) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
      card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initForumParceiro);
} else {
  initForumParceiro();
}

console.log("home-parc.js (redesign) carregado");
