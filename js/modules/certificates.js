import { safeText } from './sanitize.js';

function encodedPath(path) {
  return encodeURI(path);
}

let pdfJsPromise;
const renderedPdfPreviews = new WeakSet();

function ensurePdfJs() {
  if (window.pdfjsLib) {
    return Promise.resolve(window.pdfjsLib);
  }
  if (pdfJsPromise) {
    return pdfJsPromise;
  }

  pdfJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.onload = () => {
      if (!window.pdfjsLib) {
        reject(new Error('PDF.js failed to load'));
        return;
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error('Unable to load PDF.js'));
    document.head.appendChild(script);
  });

  return pdfJsPromise;
}

function showPdfFallback(preview, title) {
  preview.classList.add('is-fallback');
  const holder = preview.querySelector('.cert-pdf-placeholder');
  if (!holder) return;

  holder.innerHTML =
    '<svg class="cert-pdf-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" stroke="currentColor" stroke-width="1.5"></path><path d="M14 2v5h5" stroke="currentColor" stroke-width="1.5"></path><path d="M8 14h8M8 17h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>' +
    '<div class="cert-pdf-title">PDF Preview Unavailable<br>' + title + '</div>';
}

async function renderPdfPreview(preview) {
  if (!preview || renderedPdfPreviews.has(preview) || preview.dataset.rendering === 'true') {
    return;
  }

  const pdfPath = preview.dataset.pdf;
  if (!pdfPath) return;

  const title = preview.dataset.title || 'Certificate';
  preview.dataset.rendering = 'true';

  try {
    const pdfjsLib = await ensurePdfJs();
    const loadingTask = pdfjsLib.getDocument({ url: pdfPath });
    const pdfDoc = await loadingTask.promise;
    const firstPage = await pdfDoc.getPage(1);

    const containerWidth = Math.max(preview.clientWidth - 16, 120);
    const containerHeight = Math.max(preview.clientHeight - 16, 120);
    const baseViewport = firstPage.getViewport({ scale: 1 });
    const fitScale = Math.min(containerWidth / baseViewport.width, containerHeight / baseViewport.height);
    const deviceScale = window.devicePixelRatio || 1;
    const renderViewport = firstPage.getViewport({ scale: fitScale * deviceScale });

    const canvas = preview.querySelector('.cert-pdf-canvas');
    if (!canvas) {
      showPdfFallback(preview, title);
      return;
    }

    const context = canvas.getContext('2d', { alpha: false });
    canvas.width = Math.floor(renderViewport.width);
    canvas.height = Math.floor(renderViewport.height);
    canvas.style.width = Math.floor(renderViewport.width / deviceScale) + 'px';
    canvas.style.height = Math.floor(renderViewport.height / deviceScale) + 'px';

    await firstPage.render({ canvasContext: context, viewport: renderViewport }).promise;

    preview.classList.add('is-ready');
    renderedPdfPreviews.add(preview);
  } catch {
    showPdfFallback(preview, title);
  } finally {
    preview.dataset.rendering = 'false';
  }
}

function initPdfPreviewObserver() {
  const previews = document.querySelectorAll('.cert-preview[data-pdf]');
  if (!previews.length) return;

  if (!('IntersectionObserver' in window)) {
    previews.forEach((preview) => renderPdfPreview(preview));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      renderPdfPreview(entry.target);
      obs.unobserve(entry.target);
    });
  }, { rootMargin: '120px 0px', threshold: 0.15 });

  previews.forEach((preview) => observer.observe(preview));
}

function createCertificateCard(cert, modalViewer) {
  const card = document.createElement('article');
  card.className = 'cert-card kali-shell';

  const status = cert.status === 'in-progress' ? 'in-progress' : 'completed';
  const statusLabel = status === 'in-progress' ? 'In Progress' : 'Completed';
  const statusClass = status === 'in-progress' ? 'status-progress' : 'status-completed';
  const hasImage = Boolean(cert.image);
  const hasPdf = Boolean(cert.pdf);
  const isAvailable = status !== 'in-progress';

  const scan = document.createElement('span');
  scan.className = 'kali-scan';
  scan.setAttribute('aria-hidden', 'true');

  const mini = document.createElement('div');
  mini.className = 'kali-line kali-mini';
  mini.innerHTML = '<span class="host">kali@certs</span><span class="sym">$</span><span class="cmd">verify --artifact</span>';

  const head = document.createElement('div');
  head.className = 'cert-head';

  const headLeft = document.createElement('div');

  const title = document.createElement('h3');
  title.className = 'cert-title';
  title.textContent = safeText(cert.title);

  const provider = document.createElement('div');
  provider.className = 'cert-provider';
  provider.textContent = safeText(cert.provider);

  headLeft.append(title, provider);

  const statusBadge = document.createElement('span');
  statusBadge.className = 'cert-status ' + statusClass;
  statusBadge.textContent = statusLabel;

  head.append(headLeft, statusBadge);

  const desc = document.createElement('p');
  desc.className = 'cert-desc';
  desc.textContent = safeText(cert.description);

  card.append(scan, mini, head, desc);

  const preview = document.createElement('div');
  preview.className = 'cert-preview';

  if (isAvailable && hasImage) {
    preview.classList.add('cert-preview-image');
    preview.dataset.viewable = 'true';
    preview.setAttribute('role', 'button');
    preview.setAttribute('tabindex', '0');
    preview.setAttribute('aria-label', 'View ' + safeText(cert.title) + ' in full screen');

    const image = document.createElement('img');
    image.loading = 'lazy';
    image.decoding = 'async';
    image.src = encodedPath(cert.image);
    image.alt = safeText(cert.title) + ' thumbnail';

    const overlay = document.createElement('div');
    overlay.className = 'cert-preview-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.textContent = 'Click to View';

    preview.append(image, overlay);

    const openModal = () => modalViewer.open(cert.image, safeText(cert.title));
    preview.addEventListener('click', openModal);
    preview.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openModal();
      }
    });
  } else if (isAvailable && hasPdf) {
    preview.classList.add('cert-preview-pdf');
    preview.dataset.viewable = 'true';
    preview.dataset.pdf = encodedPath(cert.pdf);
    preview.dataset.title = safeText(cert.title);
    preview.setAttribute('role', 'button');
    preview.setAttribute('tabindex', '0');
    preview.setAttribute('aria-label', 'Open ' + safeText(cert.title) + ' PDF in new tab');

    const holder = document.createElement('div');
    holder.className = 'cert-pdf-placeholder';

    const canvas = document.createElement('canvas');
    canvas.className = 'cert-pdf-canvas';
    canvas.setAttribute('aria-hidden', 'true');

    const loading = document.createElement('div');
    loading.className = 'cert-preview-loading';
    loading.textContent = 'Loading preview...';

    holder.append(canvas, loading);
    const overlay = document.createElement('div');
    overlay.className = 'cert-preview-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.textContent = 'Click to View';

    preview.append(holder, overlay);

    const openPdf = () => window.open(encodedPath(cert.pdf), '_blank', 'noopener,noreferrer');
    preview.addEventListener('click', openPdf);
    preview.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPdf();
      }
    });
  } else {
    const fallback = document.createElement('div');
    fallback.className = 'cert-preview-fallback';
    fallback.textContent = 'Certificate preview coming soon';
    preview.appendChild(fallback);
  }

  card.appendChild(preview);

  if (isAvailable) {
    const actions = document.createElement('div');
    actions.className = 'cert-actions';

    if (hasImage) {
      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'cert-btn';
      viewBtn.textContent = 'View';
      viewBtn.addEventListener('click', () => modalViewer.open(cert.image, safeText(cert.title)));
      actions.appendChild(viewBtn);
    }

    if (hasPdf) {
      const pdfLink = document.createElement('a');
      pdfLink.className = 'cert-btn';
      pdfLink.href = encodedPath(cert.pdf);
      pdfLink.target = '_blank';
      pdfLink.rel = 'noopener noreferrer';
      pdfLink.textContent = 'View';
      actions.appendChild(pdfLink);
    }

    if (!actions.children.length) {
      const note = document.createElement('p');
      note.className = 'cert-note';
      note.textContent = 'Certificate file will be added soon.';
      card.appendChild(note);
    } else {
      card.appendChild(actions);
    }
  } else {
    const note = document.createElement('p');
    note.className = 'cert-note';
    note.textContent = 'Status: ' + statusLabel;
    card.appendChild(note);
  }

  return card;
}

export async function initCertificates(modalViewer) {
  const certGrid = document.getElementById('certifications-grid');
  if (!certGrid) return;

  try {
    let response = await fetch('/data/certificates.json', { cache: 'no-store' });
    if (!response.ok) {
      response = await fetch('/api/certificates', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch certificates');
    }

    const list = await response.json();
    certGrid.innerHTML = '';

    list.forEach((cert) => {
      certGrid.appendChild(createCertificateCard(cert, modalViewer));
    });

    initPdfPreviewObserver();
  } catch {
    certGrid.innerHTML = '';
    const fallback = document.createElement('article');
    fallback.className = 'cert-card';
    fallback.innerHTML = '<p class="cert-desc">Certificates are temporarily unavailable.</p>';
    certGrid.appendChild(fallback);
  }
}
