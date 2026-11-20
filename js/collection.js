/* ==========================================================================
   SHADOW MOTORS — Lógica del Catálogo, Filtros, Favoritos y Comparador
   ========================================================================== */

const VEHICLES_DATA = [
  {
    id: 1,
    brand: 'Porsche',
    model: '911 GT3 RS Shadow Spec',
    year: 2025,
    price: 285000,
    category: 'Superdeportivo',
    power: 518,
    transmission: 'Automática PDK',
    availability: 'Disponible',
    image: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1000&q=80',
    description: 'Configuración enfocada en circuito con aerodinámica activa, paquete Weissach y acabados interiores en Alcántara negro.'
  },
  {
    id: 2,
    brand: 'Mercedes-AMG',
    model: 'AMG GT 63 Coupé Nocturne',
    year: 2025,
    price: 210000,
    category: 'Gran Turismo',
    power: 577,
    transmission: 'Automática',
    availability: 'Disponible',
    image: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?auto=format&fit=crop&w=1000&q=80',
    description: 'Motor V8 biturbo ensamblado a mano con tracción integral 4MATIC+ y paquete exterior en fibra de carbono expuesta.'
  },
  {
    id: 3,
    brand: 'BMW M',
    model: 'M8 Competition Carbon Edition',
    year: 2024,
    price: 168000,
    category: 'Gran Turismo',
    power: 617,
    transmission: 'Automática',
    availability: 'Disponible',
    image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1000&q=80',
    description: 'Coupé de altas prestaciones con frenos carbocerámicos, rines forjados de 20 pulgadas y escape deportivo de titanio.'
  },
  {
    id: 4,
    brand: 'Lamborghini',
    model: 'Huracán Tecnica Nero',
    year: 2024,
    price: 315000,
    category: 'Superdeportivo',
    power: 631,
    transmission: 'Automática LDF',
    availability: 'Reservado',
    image: 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=1000&q=80',
    description: 'Propulsor V10 atmosférico de tracción trasera con dirección en el eje posterior y telemetría integrada.'
  },
  {
    id: 5,
    brand: 'Audi Sport',
    model: 'RS7 Performance Obsidian',
    year: 2025,
    price: 154000,
    category: 'Sedán de Lujo',
    power: 621,
    transmission: 'Automática Tiptronic',
    availability: 'Disponible',
    image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1000&q=80',
    description: 'Equilibrio absoluto entre confort ejecutivo y entrega inmediata de par con diferencial deportivo quattro.'
  },
  {
    id: 6,
    brand: 'Aston Martin',
    model: 'Vantage F1 Shadow Edition',
    year: 2024,
    price: 229000,
    category: 'Gran Turismo',
    power: 656,
    transmission: 'Automática ZF',
    availability: 'Bajo Pedido',
    image: 'https://images.unsplash.com/photo-1614200187524-dc4b892acf16?auto=format&fit=crop&w=1000&q=80',
    description: 'Chasis de aluminio refinado, suspensión adaptativa recalibrada y cabina artesanal en cuero anilina.'
  }
];

const FAVORITES_KEY = 'shadow_motors_favorites';
let favoriteIds = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
let compareIds = [];
let showOnlyFavorites = window.location.hash === '#favorites';

document.addEventListener('DOMContentLoaded', () => {
  const catalogGrid = document.getElementById('catalogGrid');
  if (!catalogGrid) return;

  populateSelectOptions();
  syncFavoritesToggleUI();
  bindFilterEvents();
  renderVehicles();
});

function populateSelectOptions() {
  fillSelect('filterBrand', [...new Set(VEHICLES_DATA.map((v) => v.brand))]);
  fillSelect('filterModel', [...new Set(VEHICLES_DATA.map((v) => v.model))]);
  fillSelect('filterYear', [...new Set(VEHICLES_DATA.map((v) => v.year))].sort((a, b) => b - a));
  fillSelect('filterCategory', [...new Set(VEHICLES_DATA.map((v) => v.category))]);
  fillSelect('filterTransmission', [...new Set(VEHICLES_DATA.map((v) => v.transmission))]);
  fillSelect('filterAvailability', [...new Set(VEHICLES_DATA.map((v) => v.availability))]);
}

function fillSelect(id, values) {
  const select = document.getElementById(id);
  if (!select) return;
  values.forEach((val) => {
    const option = document.createElement('option');
    option.value = String(val);
    option.textContent = String(val);
    select.appendChild(option);
  });
}

function bindFilterEvents() {
  const controlIds = [
    'searchInput',
    'sortSelect',
    'filterBrand',
    'filterModel',
    'filterYear',
    'filterPrice',
    'filterCategory',
    'filterTransmission',
    'filterPower',
    'filterAvailability'
  ];

  controlIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', renderVehicles);
      el.addEventListener('change', renderVehicles);
    }
  });

  document.getElementById('toggleFavoritesBtn')?.addEventListener('click', () => {
    showOnlyFavorites = !showOnlyFavorites;
    syncFavoritesToggleUI();
    renderVehicles();
  });

  document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
    controlIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = id === 'sortSelect' ? 'featured' : '';
    });
    showOnlyFavorites = false;
    syncFavoritesToggleUI();
    renderVehicles();
  });

  document.getElementById('openCompareBtn')?.addEventListener('click', openCompareModal);
  document.getElementById('clearCompareBtn')?.addEventListener('click', () => {
    compareIds = [];
    updateCompareBar();
    renderVehicles();
  });

  // Cierre de modales
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.modal')?.classList.remove('is-open');
    });
  });
}

function syncFavoritesToggleUI() {
  const btn = document.getElementById('toggleFavoritesBtn');
  if (!btn) return;
  btn.classList.toggle('btn--primary', showOnlyFavorites);
  btn.classList.toggle('btn--outline', !showOnlyFavorites);
  btn.textContent = showOnlyFavorites ? `Favoritos (${favoriteIds.length})` : `Ver Favoritos (${favoriteIds.length})`;
}

function getFilteredVehicles() {
  const search = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const brand = document.getElementById('filterBrand')?.value || '';
  const model = document.getElementById('filterModel')?.value || '';
  const year = document.getElementById('filterYear')?.value || '';
  const maxPrice = Number(document.getElementById('filterPrice')?.value || 0);
  const category = document.getElementById('filterCategory')?.value || '';
  const transmission = document.getElementById('filterTransmission')?.value || '';
  const minPower = Number(document.getElementById('filterPower')?.value || 0);
  const availability = document.getElementById('filterAvailability')?.value || '';
  const sortBy = document.getElementById('sortSelect')?.value || 'featured';

  const filtered = VEHICLES_DATA.filter((v) => {
    if (showOnlyFavorites && !favoriteIds.includes(v.id)) return false;
    if (search && !`${v.brand} ${v.model} ${v.category} ${v.description}`.toLowerCase().includes(search)) return false;
    if (brand && v.brand !== brand) return false;
    if (model && v.model !== model) return false;
    if (year && String(v.year) !== year) return false;
    if (maxPrice > 0 && v.price > maxPrice) return false;
    if (category && v.category !== category) return false;
    if (transmission && v.transmission !== transmission) return false;
    if (minPower > 0 && v.power < minPower) return false;
    if (availability && v.availability !== availability) return false;
    return true;
  });

  switch (sortBy) {
    case 'price-asc':
      filtered.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      filtered.sort((a, b) => b.price - a.price);
      break;
    case 'year-desc':
      filtered.sort((a, b) => b.year - a.year);
      break;
    case 'power-desc':
      filtered.sort((a, b) => b.power - a.power);
      break;
    default:
      break;
  }

  return filtered;
}

function renderVehicles() {
  const grid = document.getElementById('catalogGrid');
  const countEl = document.getElementById('resultsCount');
  const vehicles = getFilteredVehicles();

  if (countEl) {
    countEl.textContent = `${vehicles.length} vehículo${vehicles.length === 1 ? '' : 's'} encontrado${vehicles.length === 1 ? '' : 's'}`;
  }

  if (vehicles.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p class="eyebrow">Sin coincidencias</p>
        <h3 class="section-title">No hay vehículos con los criterios seleccionados</h3>
        <p class="section-lead" style="margin-inline:auto;">Ajusta los filtros o restablece la búsqueda para explorar todo el inventario.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = vehicles
    .map((v) => {
      const isFav = favoriteIds.includes(v.id);
      const isCompared = compareIds.includes(v.id);
      return `
        <article class="car-card">
          <div class="car-card__media">
            <img src="${v.image}" alt="${v.brand} ${v.model}" />
            <span class="car-card__badge">${v.availability}</span>
            <button
              type="button"
              class="car-card__fav ${isFav ? 'is-active' : ''}"
              data-fav-id="${v.id}"
              title="Agregar a favoritos"
              aria-label="Agregar ${v.brand} ${v.model} a favoritos"
            >
              ${isFav ? '★' : '☆'}
            </button>
          </div>
          <div class="car-card__body">
            <span class="car-card__meta">${v.brand} · ${v.year} · ${v.category}</span>
            <h2 class="car-card__title">${v.model}</h2>
            <p class="car-card__desc">${v.description}</p>
            <div class="car-card__specs">
              <div><span>Potencia</span><strong>${v.power} HP</strong></div>
              <div><span>Transmisión</span><strong>${v.transmission}</strong></div>
              <div><span>Estado</span><strong>${v.availability}</strong></div>
            </div>
            <div class="car-card__price-row">
              <span class="car-card__price">$${v.price.toLocaleString('en-US')} USD</span>
              <label class="compare-check">
                <input type="checkbox" data-compare-id="${v.id}" ${isCompared ? 'checked' : ''} />
                Comparar
              </label>
            </div>
            <div class="car-card__actions">
              <button type="button" class="btn btn--outline" data-detail-id="${v.id}">View Details</button>
              <a href="contact.html?subject=quote&vehicle=${encodeURIComponent(`${v.brand} ${v.model}`)}" class="btn btn--primary">Request a Quote</a>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  bindCardEvents();
}

function bindCardEvents() {
  document.querySelectorAll('[data-fav-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.favId);
      if (favoriteIds.includes(id)) {
        favoriteIds = favoriteIds.filter((item) => item !== id);
      } else {
        favoriteIds.push(id);
      }
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds));
      syncFavoritesToggleUI();
      renderVehicles();
    });
  });

  document.querySelectorAll('[data-compare-id]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const id = Number(checkbox.dataset.compareId);
      if (checkbox.checked) {
        if (compareIds.length >= 3) {
          checkbox.checked = false;
          alert('Puedes comparar hasta 3 vehículos simultáneamente.');
          return;
        }
        compareIds.push(id);
      } else {
        compareIds = compareIds.filter((item) => item !== id);
      }
      updateCompareBar();
    });
  });

  document.querySelectorAll('[data-detail-id]').forEach((btn) => {
    btn.addEventListener('click', () => openDetailModal(Number(btn.dataset.detailId)));
  });
}

function updateCompareBar() {
  const bar = document.getElementById('compareBar');
  const count = document.getElementById('compareCount');
  if (!bar || !count) return;
  count.textContent = String(compareIds.length);
  bar.classList.toggle('is-visible', compareIds.length > 0);
}

function openDetailModal(id) {
  const v = VEHICLES_DATA.find((item) => item.id === id);
  const modal = document.getElementById('detailModal');
  const body = document.getElementById('detailModalBody');
  if (!v || !modal || !body) return;

  const vehicleName = encodeURIComponent(`${v.brand} ${v.model}`);

  body.innerHTML = `
    <div class="detail-layout">
      <div class="detail-layout__media">
        <img src="${v.image}" alt="${v.brand} ${v.model}" />
      </div>
      <div class="detail-layout__info">
        <span class="eyebrow">${v.brand} · ${v.category}</span>
        <h2 class="section-title">${v.model}</h2>
        <p style="font-size:1.35rem;font-weight:500;">$${v.price.toLocaleString('en-US')} USD</p>
        <p style="color:var(--color-text-muted);font-size:0.95rem;">${v.description}</p>
        <div class="detail-specs-list">
          <div><span>Año</span>${v.year}</div>
          <div><span>Potencia</span>${v.power} HP</div>
          <div><span>Transmisión</span>${v.transmission}</div>
          <div><span>Disponibilidad</span>${v.availability}</div>
        </div>
        <div class="detail-actions">
          <a href="contact.html?subject=quote&vehicle=${vehicleName}" class="btn btn--primary">Request a Quote</a>
          <a href="contact.html?subject=info&vehicle=${vehicleName}" class="btn btn--outline">Request Information</a>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('is-open');
}

function openCompareModal() {
  const modal = document.getElementById('compareModal');
  const body = document.getElementById('compareModalBody');
  const selected = VEHICLES_DATA.filter((v) => compareIds.includes(v.id));
  if (!modal || !body || selected.length === 0) return;

  body.innerHTML = `
    <div class="compare-table-wrap">
      <span class="eyebrow">Análisis Comparativo</span>
      <h2 class="section-title" style="margin-bottom:1.5rem;">Comparación de Vehículos</h2>
      <table class="compare-table">
        <thead>
          <tr>
            <th>Especificación</th>
            ${selected.map((v) => `<td><strong>${v.brand} ${v.model}</strong></td>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr><th>Año</th>${selected.map((v) => `<td>${v.year}</td>`).join('')}</tr>
          <tr><th>Categoría</th>${selected.map((v) => `<td>${v.category}</td>`).join('')}</tr>
          <tr><th>Potencia</th>${selected.map((v) => `<td>${v.power} HP</td>`).join('')}</tr>
          <tr><th>Transmisión</th>${selected.map((v) => `<td>${v.transmission}</td>`).join('')}</tr>
          <tr><th>Disponibilidad</th>${selected.map((v) => `<td>${v.availability}</td>`).join('')}</tr>
          <tr><th>Precio</th>${selected.map((v) => `<td>$${v.price.toLocaleString('en-US')} USD</td>`).join('')}</tr>
        </tbody>
      </table>
    </div>
  `;

  modal.classList.add('is-open');
}