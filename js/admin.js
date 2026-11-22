/* ==========================================================================
   SHADOW MOTORS — Lógica del Panel de Administración (Acceso Directo Firestore)
   ========================================================================== */

import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

let allRequests = [];
let allUsers = [];

const loginView = document.getElementById("adminLoginView");
const dashboardView = document.getElementById("adminDashboardView");
const sessionInfo = document.getElementById("adminSessionInfo");

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  showDashboard();
  await loadAllData();
});

function showDashboard() {
  if (loginView) loginView.style.display = "none";
  if (dashboardView) dashboardView.style.display = "block";
  if (sessionInfo) sessionInfo.textContent = "Modo directo (sin sesión)";
}

function bindEvents() {
  document.getElementById("adminLogoutBtn")?.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  document.getElementById("refreshDataBtn")?.addEventListener("click", async () => {
    await loadAllData();
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      const target = btn.dataset.tab;
      document.getElementById("tabRequests").style.display = target === "requests" ? "block" : "none";
      document.getElementById("tabUsers").style.display = target === "users" ? "block" : "none";
    });
  });

  document.getElementById("searchRequests")?.addEventListener("input", renderRequests);
  document.getElementById("filterStatus")?.addEventListener("change", renderRequests);
  document.getElementById("searchUsers")?.addEventListener("input", renderUsers);
}

async function syncLocalUsersIfNeeded() {
  try {
    const localUsers = JSON.parse(localStorage.getItem("shadow_motors_users") || "[]");
    const currentUser = JSON.parse(localStorage.getItem("shadow_motors_current_user") || "null");
    const merged = Array.isArray(localUsers) ? [...localUsers] : [];
    if (currentUser && currentUser.email && !merged.some((u) => u.email === currentUser.email)) {
      merged.push(currentUser);
    }
    for (const u of merged) {
      if (!u || !u.email) continue;
      const cleanEmail = String(u.email).trim().toLowerCase();
      await setDoc(
        doc(db, "users", encodeURIComponent(cleanEmail)),
        {
          fullName: u.fullName || "—",
          email: cleanEmail,
          phone: u.phone || "",
          role: u.role || "client",
          createdAt: u.createdAt || serverTimestamp()
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn("Sincronización local de usuarios omitida:", err);
  }
}

async function loadAllData() {
  await syncLocalUsersIfNeeded();

  try {
    const reqQuery = query(collection(db, "requests"), orderBy("createdAt", "desc"));
    const reqSnap = await getDocs(reqQuery);
    allRequests = reqSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("Cargando requests sin orderBy:", err);
    try {
      const reqSnap = await getDocs(collection(db, "requests"));
      allRequests = reqSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (innerErr) {
      console.error("Error cargando solicitudes:", innerErr);
      allRequests = [];
    }
  }

  try {
    const usersSnap = await getDocs(collection(db, "users"));
    allUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Error cargando usuarios:", err);
    allUsers = [];
  }

  updateStats();
  renderRequests();
  renderUsers();
}

function updateStats() {
  const pendingCount = allRequests.filter((r) => (r.status || "Pendiente") === "Pendiente").length;
  document.getElementById("statRequestsTotal").textContent = String(allRequests.length);
  document.getElementById("statRequestsPending").textContent = String(pendingCount);
  document.getElementById("statUsersTotal").textContent = String(allUsers.length);
}

function formatDate(ts) {
  if (!ts) return "—";
  const dateObj = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
  if (Number.isNaN(dateObj.getTime())) return "—";
  return dateObj.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function statusPillClass(status) {
  switch (status) {
    case "En revisión":
      return "pill pill--review";
    case "Respondido":
      return "pill pill--done";
    default:
      return "pill pill--pending";
  }
}

function renderRequests() {
  const tbody = document.getElementById("requestsTableBody");
  const term = (document.getElementById("searchRequests")?.value || "").trim().toLowerCase();
  const statusFilter = document.getElementById("filterStatus")?.value || "all";

  const filtered = allRequests.filter((r) => {
    const st = r.status || "Pendiente";
    if (statusFilter !== "all" && st !== statusFilter) return false;
    if (!term) return true;
    const hay = `${r.fullName || ""} ${r.email || ""} ${r.phone || ""} ${r.vehicleOrService || ""} ${r.requestType || ""} ${r.message || ""}`.toLowerCase();
    return hay.includes(term);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#A7A7A7;">No hay solicitudes que coincidan con el filtro.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((r) => {
      const currentStatus = r.status || "Pendiente";
      return `
        <tr>
          <td style="white-space:nowrap;color:#A7A7A7;">${formatDate(r.createdAt)}</td>
          <td>
            <strong>${escapeHtml(r.fullName || "Sin nombre")}</strong><br />
            <span style="color:#A7A7A7;font-size:0.82rem;">${escapeHtml(r.email || "")}</span>
            ${r.phone ? `<br /><span style="color:#A7A7A7;font-size:0.82rem;">${escapeHtml(r.phone)}</span>` : ""}
          </td>
          <td>
            <span class="pill">${escapeHtml(r.requestType || "Consulta")}</span><br />
            <span style="display:inline-block;margin-top:0.35rem;">${escapeHtml(r.vehicleOrService || "—")}</span>
            ${r.preferredDate ? `<br /><span style="color:#A7A7A7;font-size:0.8rem;">Fecha: ${escapeHtml(r.preferredDate)}</span>` : ""}
          </td>
          <td class="msg-cell">${escapeHtml(r.message || "")}</td>
          <td>
            <select class="status-select" data-id="${r.id}" style="min-width:130px;padding:0.4rem 0.6rem;font-size:0.8rem;">
              <option value="Pendiente" ${currentStatus === "Pendiente" ? "selected" : ""}>Pendiente</option>
              <option value="En revisión" ${currentStatus === "En revisión" ? "selected" : ""}>En revisión</option>
              <option value="Respondido" ${currentStatus === "Respondido" ? "selected" : ""}>Respondido</option>
            </select>
            <div style="margin-top:0.35rem;"><span class="${statusPillClass(currentStatus)}">${escapeHtml(currentStatus)}</span></div>
          </td>
          <td>
            <button type="button" class="btn btn--ghost btn--sm delete-req-btn" data-id="${r.id}" style="border-color:#6b3838;color:#e07a7a;">Eliminar</button>
          </td>
        </tr>
      `;
    })
    .join("");

  tbody.querySelectorAll(".status-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      const id = sel.dataset.id;
      const newStatus = sel.value;
      try {
        await updateDoc(doc(db, "requests", id), { status: newStatus });
        const item = allRequests.find((x) => x.id === id);
        if (item) item.status = newStatus;
        updateStats();
        renderRequests();
      } catch (err) {
        console.error("Error actualizando estado:", err);
      }
    });
  });

  tbody.querySelectorAll(".delete-req-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!confirm("¿Eliminar esta solicitud permanentemente?")) return;
      try {
        await deleteDoc(doc(db, "requests", id));
        allRequests = allRequests.filter((x) => x.id !== id);
        updateStats();
        renderRequests();
      } catch (err) {
        console.error("Error eliminando solicitud:", err);
      }
    });
  });
}

function renderUsers() {
  const tbody = document.getElementById("usersTableBody");
  const term = (document.getElementById("searchUsers")?.value || "").trim().toLowerCase();

  const filtered = allUsers.filter((u) => {
    if (!term) return true;
    return `${u.fullName || ""} ${u.email || ""} ${u.phone || ""} ${u.role || ""}`.toLowerCase().includes(term);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:#A7A7A7;">No hay usuarios registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((u) => {
      const role = u.role || "client";
      return `
        <tr>
          <td><strong>${escapeHtml(u.fullName || "—")}</strong></td>
          <td>${escapeHtml(u.email || "—")}</td>
          <td style="color:#A7A7A7;">${escapeHtml(u.phone || "—")}</td>
          <td><span class="pill ${role === "admin" ? "pill--admin" : ""}">${escapeHtml(role)}</span></td>
          <td style="color:#A7A7A7;">${formatDate(u.createdAt)}</td>
        </tr>
      `;
    })
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}