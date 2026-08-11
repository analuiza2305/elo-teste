import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  carregarConsulta(user.uid);
});

async function carregarConsulta(uid) {
  const consultaCard = document.getElementById("consulta-card");
  if (!consultaCard) return;

  const q = query(
    collection(db, "consultas"),
    where("uidMae", "==", uid),
    where("status", "==", "agendada"),
    orderBy("data"),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    consultaCard.innerHTML = `
      <h3>
  <i class="fa fa-comments"></i>
  Consultorias agendadas:
</h3>
      <p>Você ainda não possui agendamentos.</p>
      <a href="consultoria.html">Ver Histórico</a>
    `;
  } else {
    const consulta = snapshot.docs[0].data();
    consultaCard.innerHTML = `
      <h3>
  <i class="fa fa-comments"></i>
  Próxima consultoria:
</h3>
      <div class="card-item-preview">
        <strong>${consulta.especialista || "Especialista"}</strong>
        <span>${consulta.data || ""}</span>
        ${consulta.horario ? `<span>${consulta.horario}</span>` : ""}
      </div>
      <a href="consultoria.html">Ver Histórico</a>
    `;
  }
}