const storageKeys = {
  apiBase: 'bustrack.apiBase',
  auth: 'bustrack.auth',
};

const state = {
  apiBase: localStorage.getItem(storageKeys.apiBase) || 'http://localhost:3000/v1',
  authMode: 'login',
  auth: readStoredAuth(),
  routes: [],
  buses: [],
  favorites: [],
  selectedRoute: null,
};

const els = {
  authPanel: document.querySelector('#authPanel'),
  dashboard: document.querySelector('#dashboard'),
  statusStrip: document.querySelector('#statusStrip'),
  statusText: document.querySelector('#statusText'),
  loginTab: document.querySelector('#loginTab'),
  registerTab: document.querySelector('#registerTab'),
  authForm: document.querySelector('#authForm'),
  authSubmit: document.querySelector('#authSubmit'),
  emailInput: document.querySelector('#emailInput'),
  passwordInput: document.querySelector('#passwordInput'),
  nameInput: document.querySelector('#nameInput'),
  phoneInput: document.querySelector('#phoneInput'),
  profileName: document.querySelector('#profileName'),
  profileEmail: document.querySelector('#profileEmail'),
  logoutButton: document.querySelector('#logoutButton'),
  refreshButton: document.querySelector('#refreshButton'),
  routeSearchInput: document.querySelector('#routeSearchInput'),
  busSearchInput: document.querySelector('#busSearchInput'),
  routeCount: document.querySelector('#routeCount'),
  busCount: document.querySelector('#busCount'),
  favoriteCount: document.querySelector('#favoriteCount'),
  routesList: document.querySelector('#routesList'),
  busesList: document.querySelector('#busesList'),
  favoritesList: document.querySelector('#favoritesList'),
  etaForm: document.querySelector('#etaForm'),
  etaBusSelect: document.querySelector('#etaBusSelect'),
  boardingStopInput: document.querySelector('#boardingStopInput'),
  destinationStopInput: document.querySelector('#destinationStopInput'),
  etaCard: document.querySelector('#etaCard'),
  selectedRouteStops: document.querySelector('#selectedRouteStops'),
  apiBaseInput: document.querySelector('#apiBaseInput'),
  saveApiButton: document.querySelector('#saveApiButton'),
};

function readStoredAuth() {
  try {
    return JSON.parse(localStorage.getItem(storageKeys.auth) || 'null');
  } catch {
    return null;
  }
}

function setStatus(message, type = '') {
  els.statusText.textContent = message;
  els.statusStrip.className = `status-strip ${type}`.trim();
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (state.auth?.accessToken) {
    headers.Authorization = `Bearer ${state.auth.accessToken}`;
  }

  let response;
  try {
    response = await fetch(`${state.apiBase}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new Error(`API unavailable at ${state.apiBase}. Start the backend and database, then refresh.`);
  }
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    const message = payload.error?.message || payload.error || `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return payload.data;
}

function persistAuth(auth) {
  state.auth = auth;
  if (auth) {
    localStorage.setItem(storageKeys.auth, JSON.stringify(auth));
  } else {
    localStorage.removeItem(storageKeys.auth);
  }
  renderShell();
}

function setAuthMode(mode) {
  state.authMode = mode;
  els.loginTab.classList.toggle('active', mode === 'login');
  els.registerTab.classList.toggle('active', mode === 'register');
  document.querySelectorAll('.register-only').forEach((field) => {
    field.classList.toggle('hidden', mode !== 'register');
  });
  els.authSubmit.textContent = mode === 'login' ? 'Sign in' : 'Create account';
}

async function handleAuth(event) {
  event.preventDefault();
  const path = state.authMode === 'login' ? '/auth/login' : '/auth/register';
  const body = {
    email: els.emailInput.value.trim(),
    password: els.passwordInput.value,
  };

  if (state.authMode === 'register') {
    body.name = els.nameInput.value.trim();
    body.phone = els.phoneInput.value.trim();
  }

  try {
    setStatus('Signing in...');
    const data = await api(path, { method: 'POST', body: JSON.stringify(body) });
    persistAuth(data);
    setStatus(`Welcome, ${data.user.name}`, 'ok');
    await loadDashboard();
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function loadDashboard() {
  if (!state.auth) return;
  try {
    setStatus('Loading routes, buses, and favorites...');
    const [profile, routes, buses, favorites] = await Promise.all([
      api('/users/me'),
      api(`/routes${queryFromSearch(els.routeSearchInput.value)}`),
      api(`/buses${queryFromSearch(els.busSearchInput.value)}`),
      api('/users/me/favorites'),
    ]);

    state.auth.user = { ...state.auth.user, ...profile };
    state.routes = routes || [];
    state.buses = buses || [];
    state.favorites = favorites || [];
    localStorage.setItem(storageKeys.auth, JSON.stringify(state.auth));
    renderShell();
    renderDashboard();
    setStatus('Live data loaded', 'ok');
  } catch (error) {
    renderShell();
    setStatus(error.message, 'error');
  }
}

function queryFromSearch(value) {
  const search = value.trim();
  return search ? `?search=${encodeURIComponent(search)}` : '';
}

function renderShell() {
  const signedIn = Boolean(state.auth?.accessToken);
  els.authPanel.classList.toggle('hidden', signedIn);
  els.dashboard.classList.toggle('hidden', !signedIn);
  els.apiBaseInput.value = state.apiBase;

  if (signedIn) {
    els.profileName.textContent = state.auth.user?.name || 'BusTrack Rider';
    els.profileEmail.textContent = state.auth.user?.email || '';
  }
}

function renderDashboard() {
  els.routeCount.textContent = state.routes.length;
  els.busCount.textContent = state.buses.length;
  els.favoriteCount.textContent = state.favorites.length;
  renderRoutes();
  renderBuses();
  renderFavorites();
  renderEtaOptions();
}

function isFavorite(routeId) {
  return state.favorites.some((favorite) => favorite.routeId === routeId);
}

function renderRoutes() {
  els.routesList.innerHTML = state.routes.length ? '' : emptyCard('No routes found');
  state.routes.forEach((route) => {
    const card = document.createElement('article');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-heading">
        <strong>${escapeHtml(route.number || route.name)} · ${escapeHtml(route.name)}</strong>
        <span class="badge">${route.activeBusCount ?? route.buses?.length ?? 0} buses</span>
      </div>
      <div class="item-meta">${escapeHtml(route.description || `${route.stopCount ?? route.stops?.length ?? 0} stops`)}</div>
      <div class="item-actions">
        <button class="small-action" data-route-details="${route.id}" type="button">Stops</button>
        <button class="small-action ${isFavorite(route.id) ? 'active' : ''}" data-favorite-route="${route.id}" type="button">
          ${isFavorite(route.id) ? 'Saved' : 'Save'}
        </button>
      </div>
    `;
    els.routesList.appendChild(card);
  });
}

function renderBuses() {
  els.busesList.innerHTML = state.buses.length ? '' : emptyCard('No active buses found');
  state.buses.forEach((bus) => {
    const position = bus.currentPosition;
    const card = document.createElement('article');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-heading">
        <strong>${escapeHtml(bus.busNumber)} · ${escapeHtml(bus.vehicleNo)}</strong>
        <span class="badge">${escapeHtml(bus.status || 'ACTIVE')}</span>
      </div>
      <div class="item-meta">${escapeHtml(bus.routeName || 'Assigned route')} ${position ? `· ${Math.round(position.speed)} km/h` : ''}</div>
      <div class="badge-row">
        <span class="badge">${escapeHtml(bus.serviceType || 'Regular')}</span>
        ${bus.isFreeForWomen ? '<span class="badge">Free for women</span>' : ''}
      </div>
      <div class="item-actions">
        <button class="small-action" data-select-bus="${bus.id}" type="button">Plan trip</button>
      </div>
    `;
    els.busesList.appendChild(card);
  });
}

function renderFavorites() {
  els.favoritesList.innerHTML = state.favorites.length ? '' : emptyCard('Saved routes will appear here');
  state.favorites.forEach((favorite) => {
    const card = document.createElement('article');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-heading">
        <strong>${escapeHtml(favorite.route?.number || favorite.routeId)} · ${escapeHtml(favorite.route?.name || 'Favorite route')}</strong>
      </div>
      <div class="item-meta">${escapeHtml(favorite.route?.description || 'Saved route')}</div>
      <div class="item-actions">
        <button class="small-action" data-remove-favorite="${favorite.routeId}" type="button">Remove</button>
      </div>
    `;
    els.favoritesList.appendChild(card);
  });
}

function renderEtaOptions() {
  els.etaBusSelect.innerHTML = state.buses
    .map((bus) => `<option value="${bus.id}">${escapeHtml(bus.busNumber)} · ${escapeHtml(bus.vehicleNo)}</option>`)
    .join('');
}

async function toggleFavorite(routeId) {
  try {
    if (isFavorite(routeId)) {
      await api(`/users/me/favorites/${routeId}`, { method: 'DELETE' });
    } else {
      await api('/users/me/favorites', { method: 'POST', body: JSON.stringify({ routeId }) });
    }
    state.favorites = await api('/users/me/favorites');
    renderDashboard();
    setStatus('Favorites updated', 'ok');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function showRouteDetails(routeId) {
  try {
    const route = await api(`/routes/${routeId}`);
    state.selectedRoute = route;
    activateScreen('trip');
    els.selectedRouteStops.innerHTML = (route.stops || []).map((stop) => `
      <article class="item-card">
        <div class="item-heading">
          <strong>${stop.sequence}. ${escapeHtml(stop.name)}</strong>
          <button class="small-action" data-use-stop="${stop.stopId || stop.id}" type="button">Use stop</button>
        </div>
        <div class="item-meta">${escapeHtml(stop.stopId || stop.id)}</div>
      </article>
    `).join('');
    setStatus(`${route.name} stops loaded`, 'ok');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function handleEta(event) {
  event.preventDefault();
  try {
    setStatus('Calculating ETA...');
    const query = new URLSearchParams({
      boardingStopId: els.boardingStopInput.value.trim(),
      destinationStopId: els.destinationStopInput.value.trim(),
    });
    const eta = await api(`/buses/${els.etaBusSelect.value}/eta?${query.toString()}`);
    els.etaCard.classList.remove('hidden');
    els.etaCard.innerHTML = `
      <strong>${escapeHtml(eta.boardingStopName)} to ${escapeHtml(eta.destinationStopName)}</strong>
      <span>${formatTime(eta.etaToBoarding)} boarding · ${formatTime(eta.etaToDestination)} arrival</span>
      <span>${eta.stopsToBoarding} stops away · ${eta.distanceKm.toFixed(1)} km · ${escapeHtml(eta.trafficDescription)}</span>
    `;
    setStatus('ETA ready', 'ok');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

function activateScreen(name) {
  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.screen === name);
  });
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.toggle('active', screen.id === `${name}Screen`);
  });
}

function emptyCard(message) {
  return `<article class="item-card"><span class="item-meta">${escapeHtml(message)}</span></article>`;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function debounce(fn, wait) {
  let timeoutId;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), wait);
  };
}

els.loginTab.addEventListener('click', () => setAuthMode('login'));
els.registerTab.addEventListener('click', () => setAuthMode('register'));
els.authForm.addEventListener('submit', handleAuth);
els.refreshButton.addEventListener('click', loadDashboard);
els.logoutButton.addEventListener('click', () => {
  persistAuth(null);
  setStatus('Signed out');
});
els.routeSearchInput.addEventListener('input', debounce(loadDashboard, 350));
els.busSearchInput.addEventListener('input', debounce(loadDashboard, 350));
els.etaForm.addEventListener('submit', handleEta);
els.saveApiButton.addEventListener('click', () => {
  state.apiBase = els.apiBaseInput.value.trim().replace(/\/$/, '');
  localStorage.setItem(storageKeys.apiBase, state.apiBase);
  setStatus('API URL saved', 'ok');
});

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.dataset.screen) activateScreen(target.dataset.screen);
  if (target.dataset.favoriteRoute) toggleFavorite(target.dataset.favoriteRoute);
  if (target.dataset.removeFavorite) toggleFavorite(target.dataset.removeFavorite);
  if (target.dataset.routeDetails) showRouteDetails(target.dataset.routeDetails);

  if (target.dataset.selectBus) {
    els.etaBusSelect.value = target.dataset.selectBus;
    activateScreen('trip');
  }

  if (target.dataset.useStop) {
    if (!els.boardingStopInput.value) {
      els.boardingStopInput.value = target.dataset.useStop;
    } else {
      els.destinationStopInput.value = target.dataset.useStop;
    }
  }
});

setAuthMode('login');
renderShell();
if (state.auth?.accessToken) {
  loadDashboard();
}
