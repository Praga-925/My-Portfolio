import { initMatrixBackground } from './modules/matrixBackground.js';
import { initCursorEffects, bindCursorHover } from './modules/cursorEffects.js';
import { initProjects } from './modules/projects.js';
import { initModalViewer } from './modules/modalViewer.js';
import { initCertificates } from './modules/certificates.js';
import { initFormHandler } from './modules/formHandler.js';
import { initScrollReveal } from './modules/scrollReveal.js';
import { initTypingEffect } from './modules/typingEffect.js';
import { initContactCards } from './modules/contactCards.js';

async function bootstrap() {
  initMatrixBackground();

  const cursor = initCursorEffects();
  bindCursorHover(
    cursor.cursorElement,
    'a,button,.btn,.skill-card,.project-card,.cert-card,.cert-btn,.form-submit,.contact-card,.cert-preview[data-viewable="true"]'
  );

  const modalViewer = initModalViewer();

  await Promise.all([
    initProjects(),
    initCertificates(modalViewer)
  ]);

  bindCursorHover(
    cursor.cursorElement,
    '.project-card,.cert-card,.cert-btn,.cert-preview[data-viewable="true"]'
  );

  initFormHandler();
  initScrollReveal();
  initTypingEffect();
  initContactCards();
}

window.addEventListener('DOMContentLoaded', bootstrap);
