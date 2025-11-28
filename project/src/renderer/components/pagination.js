// src/renderer/components/pagination.js

import { html } from '../../../node_modules/lit-html/lit-html.js';

/**
 * Affiche les contrôles de pagination.
 * @param {object} props - Les propriétés du composant.
 * @param {number} props.currentPage - Le numéro de la page actuelle.
 * @param {number} props.totalPages - Le nombre total de pages.
 * @param {function} props.onPageChange - La fonction à appeler avec le nouveau numéro de page.
 * @returns {TemplateResult|null} Le template lit-html pour la pagination, ou null si elle n'est pas nécessaire.
 */
export function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) {
    return null; // N'affiche rien s'il n'y a qu'une page ou moins
  }

  const pagesToShow = new Set([1]); // Toujours montrer la première page

  // Ajouter les pages autour de la page actuelle
  for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
    pagesToShow.add(i);
  }

  if (totalPages > 1) {
    pagesToShow.add(totalPages); // Toujours montrer la dernière page
  }

  let lastPage = 0;
  const buttons = [];
  for (const page of Array.from(pagesToShow).sort((a, b) => a - b)) {
    if (page - lastPage > 1) {
      buttons.push(html`<span class="pagination-dots">...</span>`);
    }
    buttons.push(html`
      <button
        class="pagination-btn ${page === currentPage ? 'active' : ''}"
        @click=${() => onPageChange(page)}>
        ${page}
      </button>
    `);
    lastPage = page;
  }

  return html`
    <div class="pagination">
      <button class="pagination-btn" ?disabled=${currentPage === 1} @click=${() => onPageChange(currentPage - 1)}>&lt;</button>
      ${buttons}
      <button class="pagination-btn" ?disabled=${currentPage === totalPages} @click=${() => onPageChange(currentPage + 1)}>&gt;</button>
    </div>
  `;
}