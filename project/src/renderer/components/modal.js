// src/renderer/components/modal.js

import { html, render } from '../../../node_modules/lit-html/lit-html.js';
import { state } from '../state.js';

function closeModalWithAnimation(modalContainer, onClosed = () => {}) {
  modalContainer.classList.add('exiting');
  modalContainer.addEventListener('transitionend', () => {
    if (modalContainer.parentNode) modalContainer.parentNode.removeChild(modalContainer);
    state.ui.isModalOpen = false;
    onClosed();
  }, { once: true });
}

export function showConfirmModal({ title, message, confirmText = 'Confirmer', confirmClass = 'btn-primary', onConfirm }) {
  // Création du conteneur
  const modalContainer = document.createElement('div');
  modalContainer.className = 'modal-overlay';
  // Z-Index supérieur pour s'assurer qu'elle est au-dessus des autres (ex: résumé sync)
  modalContainer.style.zIndex = "6000"; 
  document.body.appendChild(modalContainer);

  const closeModal = () => closeModalWithAnimation(modalContainer);
  
  const confirmAction = () => {
    onConfirm();
    closeModal();
  };

  // Icône d'alerte par défaut
  const alertIcon = html`<div class="modal-icon-large" style="font-size: 36px;">⚠️</div>`;

  // Nouvelle structure harmonisée (Design Dark/Glassmorphism)
  const template = html`
    <div class="modal-content" @click=${(e) => e.stopPropagation()} style="max-width: 450px;">
      
      <!-- HEADER STYLISÉ AVEC ICONE -->
      <div class="modal-header-panel" style="padding: 24px 24px 10px 24px; border-bottom: none; background: transparent;">
        ${alertIcon}
        <h2 class="modal-title" style="margin-top:10px;">${title}</h2>
      </div>

      <!-- CORPS DU MESSAGE -->
      <div class="modal-body-content" style="padding: 0 30px 30px 30px; text-align: center; color: var(--color-text-secondary); background: transparent; font-size: 14px; line-height: 1.5;">
        ${message}
      </div>

      <!-- ACTIONS -->
      <div class="modal-actions">
        <button class="card-button btn-secondary" @click=${closeModal}>Annuler</button>
        <button class="card-button ${confirmClass}" @click=${confirmAction}>${confirmText}</button>
      </div>
    </div>
  `;
  
  render(template, modalContainer);

  // Animation d'entrée
  requestAnimationFrame(() => {
    modalContainer.classList.add('visible');
  });
}