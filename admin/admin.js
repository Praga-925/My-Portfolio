const TOKEN_KEY = 'portfolio_admin_token';

const loginPanel = document.getElementById('admin-login-panel');
const dashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('admin-login-form');
const loginError = document.getElementById('admin-login-error');
const logoutBtn = document.getElementById('admin-logout');

const projectForm = document.getElementById('project-form');
const projectList = document.getElementById('project-list');
const projectStatus = document.getElementById('project-form-status');
const projectResetBtn = document.getElementById('project-reset');

const certForm = document.getElementById('certificate-form');
const certList = document.getElementById('certificate-list');
const certStatus = document.getElementById('certificate-form-status');
const certResetBtn = document.getElementById('certificate-reset');

let projects = [];
let certificates = [];

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || '';
}

function setToken(token) {
  if (!token) {
    sessionStorage.removeItem(TOKEN_KEY);
    return;
  }
  sessionStorage.setItem(TOKEN_KEY, token);
}

function setStatus(el, message, isError = false) {
  el.textContent = message;
  el.classList.toggle('error', isError);
}

async function apiFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || 'Request failed');
  }

  return payload;
}

function toggleDashboard(isLoggedIn) {
  loginPanel.classList.toggle('hidden', isLoggedIn);
  dashboard.classList.toggle('hidden', !isLoggedIn);
}

function resetProjectForm() {
  projectForm.reset();
  document.getElementById('project-id').value = '';
  setStatus(projectStatus, '');
}

function resetCertificateForm() {
  certForm.reset();
  document.getElementById('certificate-id').value = '';
  setStatus(certStatus, '');
}

function getProjectPayload() {
  return {
    id: document.getElementById('project-id').value.trim(),
    title: document.getElementById('project-title').value.trim(),
    tag: document.getElementById('project-tag').value.trim(),
    status: document.getElementById('project-status').value,
    command: document.getElementById('project-command').value.trim(),
    description: document.getElementById('project-description').value.trim(),
    stack: document.getElementById('project-stack').value.split(',').map((x) => x.trim()).filter(Boolean),
    features: document.getElementById('project-features').value.split('\n').map((x) => x.trim()).filter(Boolean),
    link: document.getElementById('project-link').value.trim()
  };
}

function getCertificatePayload() {
  return {
    id: document.getElementById('certificate-id').value.trim(),
    title: document.getElementById('certificate-title').value.trim(),
    provider: document.getElementById('certificate-provider').value.trim(),
    status: document.getElementById('certificate-status').value,
    description: document.getElementById('certificate-description').value.trim(),
    image: document.getElementById('certificate-image').value.trim(),
    pdf: document.getElementById('certificate-pdf').value.trim()
  };
}

function fillProjectForm(item) {
  document.getElementById('project-id').value = item.id || '';
  document.getElementById('project-title').value = item.title || '';
  document.getElementById('project-tag').value = item.tag || '';
  document.getElementById('project-status').value = item.status || 'featured';
  document.getElementById('project-command').value = item.command || '';
  document.getElementById('project-description').value = item.description || '';
  document.getElementById('project-stack').value = Array.isArray(item.stack) ? item.stack.join(', ') : '';
  document.getElementById('project-features').value = Array.isArray(item.features) ? item.features.join('\n') : '';
  document.getElementById('project-link').value = item.link || '';
}

function fillCertificateForm(item) {
  document.getElementById('certificate-id').value = item.id || '';
  document.getElementById('certificate-title').value = item.title || '';
  document.getElementById('certificate-provider').value = item.provider || '';
  document.getElementById('certificate-status').value = item.status || 'completed';
  document.getElementById('certificate-description').value = item.description || '';
  document.getElementById('certificate-image').value = item.image || '';
  document.getElementById('certificate-pdf').value = item.pdf || '';
}

function renderProjects() {
  projectList.innerHTML = '';

  projects.forEach((item) => {
    const li = document.createElement('li');

    const left = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = item.title;

    const meta = document.createElement('div');
    meta.className = 'item-meta';
    meta.textContent = `${item.status} | ${item.id}`;

    left.append(title, meta);

    const buttons = document.createElement('div');
    buttons.className = 'item-buttons';

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => fillProjectForm(item));

    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = 'Delete';
    del.addEventListener('click', async () => {
      if (!confirm('Delete this project?')) return;
      try {
        await apiFetch(`/api/projects/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
        await loadData();
      } catch (error) {
        setStatus(projectStatus, error.message, true);
      }
    });

    buttons.append(edit, del);
    li.append(left, buttons);
    projectList.appendChild(li);
  });
}

function renderCertificates() {
  certList.innerHTML = '';

  certificates.forEach((item) => {
    const li = document.createElement('li');

    const left = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = item.title;

    const meta = document.createElement('div');
    meta.className = 'item-meta';
    meta.textContent = `${item.status} | ${item.id}`;

    left.append(title, meta);

    const buttons = document.createElement('div');
    buttons.className = 'item-buttons';

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => fillCertificateForm(item));

    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = 'Delete';
    del.addEventListener('click', async () => {
      if (!confirm('Delete this certificate?')) return;
      try {
        await apiFetch(`/api/certificates/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
        await loadData();
      } catch (error) {
        setStatus(certStatus, error.message, true);
      }
    });

    buttons.append(edit, del);
    li.append(left, buttons);
    certList.appendChild(li);
  });
}

async function loadData() {
  const [projectData, certData] = await Promise.all([
    apiFetch('/api/projects'),
    apiFetch('/api/certificates')
  ]);

  projects = Array.isArray(projectData) ? projectData : [];
  certificates = Array.isArray(certData) ? certData : [];

  renderProjects();
  renderCertificates();
}

async function login(username, password) {
  const payload = await apiFetch('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

  setToken(payload.token || '');
}

async function verifyToken() {
  try {
    await apiFetch('/api/admin/me');
    return true;
  } catch {
    setToken('');
    return false;
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus(loginError, '');

  const username = loginForm.username.value.trim();
  const password = loginForm.password.value;

  if (!username || !password) {
    setStatus(loginError, 'Username and password are required.', true);
    return;
  }

  try {
    await login(username, password);
    toggleDashboard(true);
    await loadData();
    loginForm.reset();
  } catch (error) {
    setStatus(loginError, error.message, true);
  }
});

logoutBtn.addEventListener('click', () => {
  setToken('');
  toggleDashboard(false);
  resetProjectForm();
  resetCertificateForm();
});

projectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus(projectStatus, '');

  const payload = getProjectPayload();
  if (!payload.title || !payload.description) {
    setStatus(projectStatus, 'Title and description are required.', true);
    return;
  }

  try {
    if (payload.id) {
      await apiFetch(`/api/projects/${encodeURIComponent(payload.id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setStatus(projectStatus, 'Project updated.');
    } else {
      await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setStatus(projectStatus, 'Project added.');
    }

    resetProjectForm();
    await loadData();
  } catch (error) {
    setStatus(projectStatus, error.message, true);
  }
});

certForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus(certStatus, '');

  const payload = getCertificatePayload();
  if (!payload.title || !payload.provider) {
    setStatus(certStatus, 'Title and provider are required.', true);
    return;
  }

  try {
    if (payload.id) {
      await apiFetch(`/api/certificates/${encodeURIComponent(payload.id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setStatus(certStatus, 'Certificate updated.');
    } else {
      await apiFetch('/api/certificates', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setStatus(certStatus, 'Certificate added.');
    }

    resetCertificateForm();
    await loadData();
  } catch (error) {
    setStatus(certStatus, error.message, true);
  }
});

projectResetBtn.addEventListener('click', resetProjectForm);
certResetBtn.addEventListener('click', resetCertificateForm);

(async function bootstrap() {
  const ok = getToken() ? await verifyToken() : false;

  if (ok) {
    toggleDashboard(true);
    await loadData();
  } else {
    toggleDashboard(false);
  }
})();
