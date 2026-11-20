/* ==========================================================================
   SHADOW MOTORS — Manejo de Formularios de Contacto, Cotizaciones y Citas
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('contactForm');
  if (!contactForm) return;

  prefillFormFromURL();
  bindQuickModeButtons();
  bindContactSubmit(contactForm);
});

/**
 * Lee parámetros de la URL (?subject=quote&vehicle=...) y prepara el formulario
 */
function prefillFormFromURL() {
  const params = new URLSearchParams(window.location.search);
  const subjectParam = params.get('subject');
  const vehicleParam = params.get('vehicle');
  const serviceParam = params.get('service');

  const subjectSelect = document.getElementById('contactSubject');
  const messageField = document.getElementById('contactMessage');
  const dateGroup = document.getElementById('appointmentDateGroup');

  if (subjectParam && subjectSelect) {
    const validValues = ['general', 'quote', 'appointment', 'bespoke', 'performance', 'info'];
    if (validValues.includes(subjectParam)) {
      subjectSelect.value = subjectParam;
    }
  }

  if (dateGroup && subjectSelect) {
    dateGroup.style.display = subjectSelect.value === 'appointment' ? 'flex' : 'none';
    subjectSelect.addEventListener('change', () => {
      dateGroup.style.display = subjectSelect.value === 'appointment' ? 'flex' : 'none';
    });
  }

  if (messageField && !messageField.value) {
    if (vehicleParam && subjectParam === 'quote') {
      messageField.value = `Solicito una cotización formal y condiciones de entrega para el vehículo: ${vehicleParam}.`;
    } else if (vehicleParam) {
      messageField.value = `Me gustaría recibir ficha técnica y disponibilidad detallada sobre: ${vehicleParam}.`;
    } else if (serviceParam) {
      messageField.value = `Estoy interesado en solicitar información y presupuesto para el servicio: ${serviceParam}.`;
    }
  }
}

/**
 * Permite que los botones "Request a Quote" y "Book an Appointment" ajusten el formulario
 */
function bindQuickModeButtons() {
  const subjectSelect = document.getElementById('contactSubject');
  const dateGroup = document.getElementById('appointmentDateGroup');
  const formTitle = document.getElementById('formDynamicTitle');

  document.querySelectorAll('[data-form-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.formMode;
      if (!subjectSelect) return;

      subjectSelect.value = mode;
      if (dateGroup) {
        dateGroup.style.display = mode === 'appointment' ? 'flex' : 'none';
      }

      if (formTitle) {
        if (mode === 'quote') formTitle.textContent = 'Solicitar Cotización Personalizada';
        else if (mode === 'appointment') formTitle.textContent = 'Agendar Cita Privada en Showroom';
        else formTitle.textContent = 'Enviar Consulta Directa';
      }

      document.getElementById('contactName')?.focus();
    });
  });
}

/**
 * Valida y procesa el envío del formulario (se conectará al backend en la Etapa 9)
 */
function bindContactSubmit(form) {
  const feedback = document.getElementById('formFeedback');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = document.getElementById('contactName')?.value.trim();
    const email = document.getElementById('contactEmail')?.value.trim();
    const phone = document.getElementById('contactPhone')?.value.trim();
    const subject = document.getElementById('contactSubject')?.value;
    const appointmentDate = document.getElementById('appointmentDate')?.value || '';
    const message = document.getElementById('contactMessage')?.value.trim();

    if (!name || !email || !message) {
      showFeedback(feedback, 'Por favor completa los campos obligatorios: Nombre, Correo electrónico y Mensaje.', true);
      return;
    }

    // Guardar registro local temporal mientras conectamos MySQL en Etapa 9
    const submissions = JSON.parse(localStorage.getItem('shadow_motors_requests') || '[]');
    submissions.push({
      id: Date.now(),
      name,
      email,
      phone,
      subject,
      appointmentDate,
      message,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('shadow_motors_requests', JSON.stringify(submissions));

    showFeedback(
      feedback,
      `Gracias, ${name}. Tu solicitud ha sido registrada correctamente por nuestro equipo de Shadow Motors. Nos pondremos en contacto contigo a la brevedad.`,
      false
    );
    form.reset();
  });
}

function showFeedback(el, text, isError) {
  if (!el) return;
  el.textContent = text;
  el.classList.remove('is-success', 'is-error');
  el.classList.add('is-visible', isError ? 'is-error' : 'is-success');
}