import { db, auth } from './firebase.js';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const container = document.querySelector(".cards-grid.eventos-home");

let currentUser = null;
let userInscritos = [];
let allEventosHome = []; // Armazena os eventos carregados na Home

// 1. Função idêntica à do eventos.js para normalizar as datas
function normalizeEventDoc(docData, id=null) {
  const obj = { ...docData, id };
  const raw = docData.data ?? docData.date ?? null;
  if (raw && raw.toDate) obj.data = raw.toDate();
  else if (typeof raw === 'string') {
    const parsed = new Date(raw);
    obj.data = isNaN(parsed) ? null : parsed;
  } else if (raw instanceof Date) obj.data = raw;
  else obj.data = null;
  return obj;
}

// 2. Formatadores de data idênticos ao eventos.js
function formatDate(date) {
  if (!date) return '';
  return date.toLocaleDateString('pt-BR', { day:'2-digit', month:'long' });
}
function formatTime(date) {
  if (!date) return '';
  return date.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
}

// 3. Modais de Confirmação e Informação (Idênticos ao eventos.js)
function showModalConfirm(titulo, mensagem, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'em-overlay';
  
    const modal = document.createElement('div');
    modal.className = 'em-modal';
    modal.innerHTML = `
      <div class="em-body">
        <h2 class="em-title">${titulo}</h2>
        <p class="em-desc">${mensagem}</p>
        <div class="em-actions">
          <button class="btn-fechar">Voltar</button>
          <button class="btn-inscrever">Sim, cancelar</button>
        </div>
      </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  
    modal.querySelector('.btn-fechar').addEventListener('click', () => overlay.remove());
    modal.querySelector('.btn-inscrever').addEventListener('click', async () => {
      await onConfirm();
      overlay.remove();
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function showModalInfo(titulo, mensagem) {
    const overlay = document.createElement('div');
    overlay.className = 'em-overlay';
  
    const modal = document.createElement('div');
    modal.className = 'em-modal';
    modal.innerHTML = `
      <div class="em-body">
        <h2 class="em-title">${titulo}</h2>
        <p class="em-desc">${mensagem}</p>
        <div class="em-actions"><button class="btn-fechar">Fechar</button></div>
      </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  
    modal.querySelector('.btn-fechar').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// 4. Modal Principal do Evento (Idêntico ao eventos.js)
function showEventModal(ev, opts = { mode: 'detalhes' }) {
    const overlay = document.createElement('div');
    overlay.className = 'em-overlay';
  
    const modal = document.createElement('div');
    modal.className = 'em-modal';
  
    const headerImg = ev.capa ? `<div class="em-header"><img src="${ev.capa}" alt="${ev.titulo}"></div>` : '';
    const titulo = `<h2 class="em-title">${ev.titulo ?? 'Evento'}</h2>`;
    const dataFmt = ev.data ? formatDate(ev.data) + ' • ' + formatTime(ev.data) : '';
    const meta = `<p class="em-meta">${ev.local ?? 'Online'} • ${dataFmt}</p>`;
    const descricao = `<div class="em-desc">${ev.descricao ?? ''}</div>`;
    const actionsHtml = `<div class="em-actions"></div>`;
  
    modal.innerHTML = `
      ${headerImg}
      <div class="em-body">
        ${titulo}
        ${meta}
        ${descricao}
        ${actionsHtml}
      </div>
      <button class="em-close" aria-label="Fechar">✕</button>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  
    const actionsDiv = modal.querySelector('.em-actions');
    const isInscrito = userInscritos.some(i => i.id === ev.id);
  
    if (!currentUser) {
      const btnLogin = document.createElement('button');
      btnLogin.className = 'btn-inscrever';
      btnLogin.textContent = 'Fazer login para se inscrever';
      btnLogin.addEventListener('click', () => showModalInfo('Login necessário', 'Você precisa estar logado para se inscrever em um evento.'));
      actionsDiv.appendChild(btnLogin);
    } else if (isInscrito) {
      const btnCancelar = document.createElement('button');
      btnCancelar.className = 'btn-inscrever';
      btnCancelar.style.background = '#d9534f';
      btnCancelar.textContent = 'Cancelar inscrição';
      btnCancelar.addEventListener('click', () => {
        showModalConfirm('Cancelar inscrição', 'Tem certeza que deseja cancelar sua inscrição neste evento?', async () => {
          try {
            const userRef = doc(db, 'usuarios', currentUser.uid);
            const snap = await getDoc(userRef);
            const eventosUser = snap.exists() ? (snap.data().eventosInscritos || []) : [];
            const atualizados = eventosUser.filter(e => e.id !== ev.id);
            await updateDoc(userRef, { eventosInscritos: atualizados });
            userInscritos = atualizados;
            showModalInfo('Cancelado', 'Sua inscrição foi cancelada com sucesso.');
            renderEventosHome(); // Re-renderiza a Home
            overlay.remove();
          } catch (err) {
            console.error(err);
            showModalInfo('Erro', 'Erro ao cancelar inscrição. Tente novamente.');
          }
        });
      });
      actionsDiv.appendChild(btnCancelar);
    } else {
      const btnInscrever = document.createElement('button');
      btnInscrever.className = 'btn-inscrever';
      btnInscrever.textContent = 'Inscrever-se';
      btnInscrever.addEventListener('click', async () => {
        try {
          const userRef = doc(db, 'usuarios', currentUser.uid);
          const userSnap = await getDoc(userRef);
          const inscritosExist = userSnap.exists() ? (userSnap.data().eventosInscritos || []) : [];
          const ja = inscritosExist.some(i => i.id === ev.id);
          if (ja) {
            showModalInfo('Atenção', 'Você já está inscrito nesse evento.');
            return;
          }
          const toSave = {
            id: ev.id,
            titulo: ev.titulo ?? '',
            descricao: ev.descricao ?? '',
            date: ev.data ? ev.data.toString() : ''
          };
          const novos = [...inscritosExist, toSave];
          await updateDoc(userRef, { eventosInscritos: novos });
          userInscritos = novos;
          showModalInfo('Sucesso', 'Inscrição realizada com sucesso!');
          renderEventosHome(); // Re-renderiza a Home
          overlay.remove();
        } catch (err) {
          console.error(err);
          showModalInfo('Erro', 'Erro ao inscrever. Tente novamente.');
        }
      });
      actionsDiv.appendChild(btnInscrever);
    }
  
    const btnFechar = document.createElement('button');
    btnFechar.className = 'btn-fechar';
    btnFechar.textContent = 'Fechar';
    btnFechar.addEventListener('click', () => overlay.remove());
    actionsDiv.appendChild(btnFechar);
  
    modal.querySelector('.em-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}


// 5. Renderiza a grade na Home (Com o design ticket-card que criamos)
function renderEventosHome() {
  container.innerHTML = "";
  container.classList.add("eventos-grid-horizontal");

  if (allEventosHome.length === 0) {
    container.innerHTML = `<p style="color: var(--text-color-light);">Nenhum evento no momento.</p>`;
    return;
  }

  allEventosHome.forEach(ev => {
    const dataFormatada = ev.data ? formatDate(ev.data) : '';
    const hora = ev.data ? formatTime(ev.data) : '';
    const local = ev.local || "Online";
    const imgUrl = ev.capa || './img/default-event.png'; 

    const card = document.createElement("div"); // Mudamos de <a> para <div> porque o clique abrirá o modal
    card.className = "ticket-card com-brilho";
    card.style.cursor = "pointer"; // Indica que é clicável
    
    // Verifica a inscrição para mostrar um texto diferente, se quiser.
    // Aqui mantivemos o layout que aprovamos antes.
    card.innerHTML = `
      <div class="tc-img-box">
        <img src="${imgUrl}" alt="Capa do evento">
      </div>
      <div class="tc-content">
        <span class="tc-date">${dataFormatada} • ${hora}</span>
        <h4 class="tc-title">${ev.titulo}</h4>
        <span class="tc-local"><i class="fa-solid fa-location-dot"></i> ${local}</span>
      </div>
      <div class="tc-arrow">
        <i class="fa-solid fa-chevron-right"></i>
      </div>
    `;

    // Ao clicar no card, abre o modal idêntico ao da página de eventos
    card.addEventListener('click', () => {
        const isInscrito = userInscritos.some(i => i.id === ev.id);
        showEventModal(ev, { mode: isInscrito ? 'inscrito' : 'detalhes' });
    });

    container.appendChild(card);
  });
}

// 6. Busca os eventos no Firebase
async function carregarUltimosEventos() {
  const q = query(
    collection(db, "eventos"),
    orderBy("data", "desc"),
    limit(2) 
  );
  
  const snap = await getDocs(q);
  const eventos = [];
  snap.forEach(docSnap => {
     eventos.push(normalizeEventDoc(docSnap.data(), docSnap.id));
  });
  
  allEventosHome = eventos.sort((a,b) => (b.data?.getTime() || 0) - (a.data?.getTime() || 0));
  renderEventosHome();
}

// 7. Controle de Autenticação
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      try {
        const userRef = doc(db, 'usuarios', user.uid);
        const snap = await getDoc(userRef);
        userInscritos = snap.exists() ? (snap.data().eventosInscritos || []) : [];
      } catch {
        userInscritos = [];
      }
    } else {
      userInscritos = [];
    }
    carregarUltimosEventos();
});