/* ==========================================================================
   SHADOW MOTORS — Gestión de Cuenta de Usuario, Sesión y Favoritos
   ========================================================================== */

import { db } from "./firebase-config.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const AUTH_USER_KEY = "shadow_motors_current_user";
const AUTH_USERS_KEY = "shadow_motors_users";
const AUTH_FAVS_KEY = "shadow_motors_favorites";

document.addEventListener("DOMContentLoaded", () => {
  updateHeaderAccountUI();
  bindAccountModalTriggers();
  syncExistingUsersToFirestore();
});

function getAccountTriggers() {
  const matched = new Set();

  document.querySelectorAll("a, button").forEach((el) => {
    const title = (el.getAttribute("title") || "").trim().toLowerCase();
    const href = (el.getAttribute("href") || "").trim().toLowerCase();
    const labelText = (el.querySelector(".action-label")?.textContent || el.textContent || "")
      .trim()
      .toLowerCase();

    const isAccountByTitle = title.includes("cuenta") || title.includes("account");
    const isAccountByText =
      labelText === "cuenta" ||
      labelText === "account" ||
      Boolean(getCurrentUser() && labelText === getCurrentUser().fullName.split(" ")[0].toLowerCase());
    const isContactAccountLink = el.tagName === "A" && href.endsWith("contact.html") && (isAccountByTitle || isAccountByText);

    if (isAccountByTitle || isAccountByText || isContactAccountLink) {
      matched.add(el);
    }
  });

  return Array.from(matched);
}

async function syncUserToFirestore(userObj) {
  if (!userObj || !userObj.email) return;
  try {
    const docId = encodeURIComponent(String(userObj.email).trim().toLowerCase());
    await setDoc(
      doc(db, "users", docId),
      {
        fullName: userObj.fullName || "—",
        email: String(userObj.email).trim().toLowerCase(),
        phone: userObj.phone || "",
        role: userObj.role || "client",
        createdAt: userObj.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("No se pudo sincronizar usuario con Firestore:", err);
  }
}

async function syncExistingUsersToFirestore() {
  try {
    const users = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "[]");
    const current = getCurrentUser();
    const list = Array.isArray(users) ? [...users] : [];
    if (current && !list.some((u) => u.email === current.email)) {
      list.push(current);
    }
    for (const u of list) {
      await syncUserToFirestore(u);
    }
  } catch {
    // Ignorar errores de lectura de localStorage
  }
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || "null");
  } catch {
    return null;
  }
}

function registerUser({ fullName, email, phone, password }) {
  const cleanName = (fullName || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanPhone = (phone || "").trim();

  if (!cleanName || !cleanEmail || !password) {
    return { ok: false, message: "Completa nombre, correo electrónico y contraseña." };
  }

  if (password.length < 6) {
    return { ok: false, message: "La contraseña debe tener al menos 6 caracteres." };
  }

  const users = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "[]");
  const exists = users.some((u) => u.email === cleanEmail);

  if (exists) {
    return { ok: false, message: "Ya existe una cuenta registrada con ese correo electrónico." };
  }

  const newUser = {
    id: Date.now(),
    fullName: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    role: "client",
    createdAt: new Date().toISOString()
  };

  users.push({ ...newUser, password });
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));

  syncUserToFirestore(newUser);
  updateHeaderAccountUI();
  return { ok: true, message: `Cuenta creada. Bienvenido a Shadow Motors, ${newUser.fullName}.`, user: newUser };
}

function loginUser(email, password) {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !password) {
    return { ok: false, message: "Ingresa tu correo electrónico y contraseña." };
  }

  const users = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "[]");
  const found = users.find((u) => u.email === cleanEmail && u.password === password);

  if (!found) {
    return { ok: false, message: "Credenciales inválidas. Verifica tu correo y contraseña." };
  }

  const sessionUser = {
    id: found.id,
    fullName: found.fullName,
    email: found.email,
    phone: found.phone,
    role: found.role,
    createdAt: found.createdAt
  };

  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(sessionUser));
  syncUserToFirestore(sessionUser);
  updateHeaderAccountUI();
  return { ok: true, message: `Sesión iniciada como ${sessionUser.fullName}.`, user: sessionUser };
}

function logoutUser() {
  localStorage.removeItem(AUTH_USER_KEY);
  updateHeaderAccountUI();
}

function updateHeaderAccountUI() {
  const user = getCurrentUser();
  const favs = JSON.parse(localStorage.getItem(AUTH_FAVS_KEY) || "[]");

  document.querySelectorAll('a[href*="collection.html#favorites"] .action-label').forEach((el) => {
    el.textContent = favs.length > 0 ? `Favoritos (${favs.length})` : "Favoritos";
  });

  getAccountTriggers().forEach((link) => {
    const label = link.querySelector(".action-label");
    if (label) {
      label.textContent = user ? user.fullName.split(" ")[0] : "Cuenta";
    }
    link.dataset.loggedIn = user ? "true" : "false";
  });
}

function bindAccountModalTriggers() {
  getAccountTriggers().forEach((link) => {
    if (link.dataset.accountBound === "true") return;
    link.dataset.accountBound = "true";

    link.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openAccountModal(getCurrentUser() ? "profile" : "login");
    });
  });
}

function setModalVisibility(modal, visible) {
  if (!modal) return;
  if (visible) {
    modal.classList.add("is-open");
    modal.style.display = "flex";
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.zIndex = "9999";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.padding = "1.25rem";
    modal.style.background = "rgba(0, 0, 0, 0.78)";
    modal.style.backdropFilter = "blur(4px)";
  } else {
    modal.classList.remove("is-open");
    modal.style.display = "none";
  }
}

function ensureAccountModal() {
  let modal = document.getElementById("accountModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "accountModal";
  modal.className = "modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Cuenta de Usuario Shadow Motors");
  modal.style.display = "none";

  modal.innerHTML = `
    <div class="modal__dialog" style="position:relative;width:100%;max-width:520px;padding:2rem;background:#111215;border:1px solid rgba(255,255,255,0.16);color:#f4f4f5;border-radius:6px;box-shadow:0 20px 50px rgba(0,0,0,0.65);">
      <button type="button" class="modal__close" id="closeAccountModalBtn" aria-label="Cerrar" style="position:absolute;top:1rem;right:1rem;background:transparent;border:1px solid rgba(255,255,255,0.2);color:#fff;width:32px;height:32px;border-radius:4px;cursor:pointer;">✕</button>
      <div id="accountModalContent"></div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) setModalVisibility(modal, false);
  });

  modal.querySelector("#closeAccountModalBtn")?.addEventListener("click", () => {
    setModalVisibility(modal, false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.style.display !== "none") {
      setModalVisibility(modal, false);
    }
  });

  return modal;
}

function showAuthFeedback(fb, message, isSuccess) {
  if (!fb) return;
  fb.textContent = message;
  fb.classList.remove("is-success", "is-error");
  fb.classList.add("is-visible", isSuccess ? "is-success" : "is-error");
  fb.style.display = "block";
  fb.style.padding = "0.7rem 0.9rem";
  fb.style.borderRadius = "4px";
  fb.style.fontSize = "0.88rem";
  fb.style.background = isSuccess ? "rgba(40, 167, 69, 0.14)" : "rgba(220, 53, 69, 0.16)";
  fb.style.border = isSuccess ? "1px solid rgba(72, 199, 116, 0.45)" : "1px solid rgba(240, 90, 90, 0.45)";
  fb.style.color = isSuccess ? "#8ce99a" : "#ffa8a8";
}

function openAccountModal(mode = "login") {
  const modal = ensureAccountModal();
  const content = modal.querySelector("#accountModalContent");
  const user = getCurrentUser();
  const favs = JSON.parse(localStorage.getItem(AUTH_FAVS_KEY) || "[]");

  if (!content) return;

  if (user && mode === "profile") {
    content.innerHTML = `
      <span class="eyebrow">Perfil Activo</span>
      <h2 class="section-title" style="margin-bottom:0.5rem;">${user.fullName}</h2>
      <p style="color:var(--color-text-muted,#a1a1aa);font-size:0.9rem;margin-bottom:1.5rem;">${user.email}</p>

      <div style="border-block:1px solid rgba(255,255,255,0.14);padding-block:1rem;margin-bottom:1.5rem;font-size:0.9rem;display:flex;flex-direction:column;gap:0.4rem;">
        <p style="margin:0;"><strong>Rol:</strong> ${user.role}</p>
        <p style="margin:0;"><strong>Vehículos favoritos guardados:</strong> ${favs.length}</p>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:0.75rem;">
        <a href="collection.html#favorites" class="btn btn--outline">Ver Favoritos</a>
        <button type="button" id="logoutBtn" class="btn btn--primary">Cerrar Sesión</button>
      </div>
    `;

    content.querySelector("#logoutBtn")?.addEventListener("click", () => {
      logoutUser();
      openAccountModal("login");
    });
  } else if (mode === "register") {
    content.innerHTML = `
      <span class="eyebrow">Acceso Privado</span>
      <h2 class="section-title" style="margin-bottom:1.25rem;">Crear Cuenta</h2>

      <form id="registerForm" style="display:flex;flex-direction:column;gap:1rem;">
        <div class="form-group">
          <label class="form-label" for="regName">Nombre completo *</label>
          <input type="text" id="regName" class="form-input" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="regEmail">Correo electrónico *</label>
          <input type="email" id="regEmail" class="form-input" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="regPhone">Teléfono</label>
          <input type="tel" id="regPhone" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label" for="regPassword">Contraseña (mín. 6 caracteres) *</label>
          <input type="password" id="regPassword" class="form-input" required />
        </div>
        <div id="authFeedback" class="form-feedback" style="display:none;"></div>
        <div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin-top:0.5rem;">
          <button type="submit" class="btn btn--primary">Registrarse</button>
          <button type="button" id="switchToLoginBtn" class="btn btn--outline">Ya tengo cuenta</button>
        </div>
      </form>
    `;

    content.querySelector("#switchToLoginBtn")?.addEventListener("click", () => openAccountModal("login"));
    content.querySelector("#registerForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const res = registerUser({
        fullName: document.getElementById("regName")?.value,
        email: document.getElementById("regEmail")?.value,
        phone: document.getElementById("regPhone")?.value,
        password: document.getElementById("regPassword")?.value
      });
      const fb = document.getElementById("authFeedback");
      showAuthFeedback(fb, res.message, res.ok);
      if (res.ok) {
        setTimeout(() => openAccountModal("profile"), 650);
      }
    });
  } else {
    content.innerHTML = `
      <span class="eyebrow">Acceso Privado</span>
      <h2 class="section-title" style="margin-bottom:1.25rem;">Iniciar Sesión</h2>

      <form id="loginForm" style="display:flex;flex-direction:column;gap:1rem;">
        <div class="form-group">
          <label class="form-label" for="loginEmail">Correo electrónico *</label>
          <input type="email" id="loginEmail" class="form-input" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="loginPassword">Contraseña *</label>
          <input type="password" id="loginPassword" class="form-input" required />
        </div>
        <div id="authFeedback" class="form-feedback" style="display:none;"></div>
        <div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin-top:0.5rem;">
          <button type="submit" class="btn btn--primary">Iniciar Sesión</button>
          <button type="button" id="switchToRegisterBtn" class="btn btn--outline">Crear Cuenta</button>
        </div>
      </form>
    `;

    content.querySelector("#switchToRegisterBtn")?.addEventListener("click", () => openAccountModal("register"));
    content.querySelector("#loginForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const res = loginUser(
        document.getElementById("loginEmail")?.value,
        document.getElementById("loginPassword")?.value
      );
      const fb = document.getElementById("authFeedback");
      showAuthFeedback(fb, res.message, res.ok);
      if (res.ok) {
        setTimeout(() => setModalVisibility(modal, false), 650);
      }
    });
  }

  setModalVisibility(modal, true);
}

window.ShadowAuth = {
  getCurrentUser,
  registerUser,
  loginUser,
  logoutUser,
  openAccountModal
};