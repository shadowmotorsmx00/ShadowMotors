import { auth, db } from "./firebase-config.js";
import { MAIL_CONFIG } from "./mail-config.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import emailjs from "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm";

if (MAIL_CONFIG.publicKey && !MAIL_CONFIG.publicKey.startsWith("TU_")) {
  emailjs.init({ publicKey: MAIL_CONFIG.publicKey });
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#contactForm, form[data-shadow-form='contact'], form");
  if (!form || form.dataset.firestoreBound === "true") return;
  form.dataset.firestoreBound = "true";

  const subjectSelect = form.querySelector("#contactSubject, [name='requestType'], [name='type'], [name='service'], #requestType");
  const appointmentDateGroup = form.querySelector("#appointmentDateGroup");
  const appointmentDateInput = form.querySelector("#appointmentDate");
  const feedbackEl = form.querySelector("#formFeedback") || document.getElementById("formFeedback");

  const showNotice = (msg, isError = false) => {
    if (feedbackEl) {
      feedbackEl.textContent = msg;
      feedbackEl.classList.remove("is-success", "is-error");
      feedbackEl.classList.add("is-visible", isError ? "is-error" : "is-success");
      feedbackEl.style.display = "block";
      feedbackEl.style.marginTop = "1rem";
      feedbackEl.style.padding = "0.75rem 1rem";
      feedbackEl.style.borderRadius = "4px";
      feedbackEl.style.fontSize = "0.9rem";
      feedbackEl.style.background = isError ? "rgba(180, 50, 50, 0.16)" : "rgba(255, 255, 255, 0.06)";
      feedbackEl.style.border = isError ? "1px solid rgba(220, 80, 80, 0.45)" : "1px solid rgba(255, 255, 255, 0.18)";
      feedbackEl.style.color = isError ? "#f39b9b" : "#f2f2f2";
    }
  };

  const syncSubjectMode = () => {
    if (!subjectSelect || !appointmentDateGroup) return;
    appointmentDateGroup.style.display = subjectSelect.value === "appointment" ? "" : "none";
  };

  if (subjectSelect) {
    subjectSelect.addEventListener("change", syncSubjectMode);
    syncSubjectMode();
  }

  const getVal = (selectors) => {
    for (const sel of selectors) {
      const el = form.querySelector(sel);
      if (el && typeof el.value === "string") return el.value.trim();
    }
    return "";
  };

  const getSubjectLabel = () => {
    if (!subjectSelect) return "Solicitud";
    const selectedOpt = subjectSelect.options[subjectSelect.selectedIndex];
    return (selectedOpt ? selectedOpt.textContent : subjectSelect.value).trim() || "Solicitud";
  };

  const submitRequest = async (overrideMode = null) => {
    if (overrideMode && subjectSelect) {
      subjectSelect.value = overrideMode;
      syncSubjectMode();
    }

    const fullName = getVal(["#contactName", "[name='fullName']", "[name='name']", "#fullName", "#name"]);
    const email = getVal(["#contactEmail", "[name='email']", "#email"]).toLowerCase();
    const phone = getVal(["#contactPhone", "[name='phone']", "#phone"]);
    const requestType = getSubjectLabel();
    const preferredDate = appointmentDateInput ? appointmentDateInput.value.trim() : "";
    const params = new URLSearchParams(window.location.search);
    const vehicleFromUrl = params.get("vehicle") || params.get("model") || "";
    const vehicleOrService =
      getVal(["[name='model']", "[name='vehicle']", "#modelInput"]) ||
      vehicleFromUrl ||
      (preferredDate ? `Cita (${preferredDate})` : "No especificado");
    const message = getVal(["#contactMessage", "[name='message']", "[name='notes']", "#message"]);

    if (!fullName || !email || !message) {
      showNotice("Completa nombre, correo y mensaje.", true);
      return;
    }

    const actionButtons = Array.from(form.querySelectorAll("button[type='submit'], input[type='submit'], button[data-form-mode]"));
    const prevStates = actionButtons.map((btn) => ({
      el: btn,
      disabled: btn.disabled,
      text: btn.textContent
    }));

    actionButtons.forEach((btn) => {
      btn.disabled = true;
    });
    const submitBtn = form.querySelector("button[type='submit'], input[type='submit']");
    if (submitBtn) {
      submitBtn.textContent = "Enviando...";
    }

    try {
      const payload = {
        userId: auth.currentUser ? auth.currentUser.uid : null,
        fullName,
        email,
        phone,
        requestType,
        vehicleOrService,
        preferredDate: preferredDate || null,
        message,
        status: "Pendiente",
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "requests"), payload);

      let mailSent = false;
      if (
        MAIL_CONFIG.publicKey &&
        !MAIL_CONFIG.publicKey.startsWith("TU_") &&
        MAIL_CONFIG.serviceId &&
        !MAIL_CONFIG.serviceId.startsWith("TU_") &&
        MAIL_CONFIG.templateId &&
        !MAIL_CONFIG.templateId.startsWith("TU_")
      ) {
        await emailjs.send(MAIL_CONFIG.serviceId, MAIL_CONFIG.templateId, {
          folio: docRef.id.slice(0, 7).toUpperCase(),
          full_name: fullName,
          email,
          phone: phone || "No proporcionado",
          request_type: requestType,
          vehicle_or_service: vehicleOrService,
          preferred_date: preferredDate || "No especificada",
          message
        });
        mailSent = true;
      }

      form.reset();
      syncSubjectMode();
      const folio = docRef.id.slice(0, 7).toUpperCase();
      showNotice(
        mailSent
          ? `Solicitud enviada correctamente · Folio ${folio}`
          : `Solicitud recibida · Folio ${folio}. Nuestro equipo se pondrá en contacto pronto.`
      );
    } catch (err) {
      console.error("Error en envío:", err);
      showNotice("No se pudo enviar la solicitud. Intenta de nuevo en un momento.", true);
    } finally {
      prevStates.forEach(({ el, disabled, text }) => {
        el.disabled = disabled;
        if (typeof text === "string") el.textContent = text;
      });
    }
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitRequest(null);
  });

  form.querySelectorAll("button[data-form-mode]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const mode = btn.dataset.formMode || null;
      await submitRequest(mode);
    });
  });
});