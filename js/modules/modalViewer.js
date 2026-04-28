function encodedPath(path) {
  return encodeURI(path);
}

export function initModalViewer() {
  const certModal = document.getElementById('cert-modal');
  const certModalImage = document.getElementById('cert-modal-image');
  const certModalTitle = document.getElementById('cert-modal-title');
  const certModalClose = document.getElementById('cert-modal-close');

  if (!certModal || !certModalImage || !certModalTitle) {
    return {
      open: () => {},
      close: () => {}
    };
  }

  function open(imageSrc, title) {
    certModalImage.src = encodedPath(imageSrc);
    certModalImage.alt = title + ' certificate preview';
    certModalTitle.textContent = title;
    certModal.classList.add('is-open');
    certModal.setAttribute('aria-hidden', 'false');
  }

  function close() {
    certModal.classList.remove('is-open');
    certModal.setAttribute('aria-hidden', 'true');
    certModalImage.src = '';
  }

  if (certModalClose) {
    certModalClose.addEventListener('click', close);
  }

  certModal.addEventListener('click', (e) => {
    if (e.target === certModal) close();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && certModal.classList.contains('is-open')) {
      close();
    }
  });

  return { open, close };
}
