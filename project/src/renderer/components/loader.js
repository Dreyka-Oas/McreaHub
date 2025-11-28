// src/renderer/components/loader.js

import { html } from '../../../node_modules/lit-html/lit-html.js';
import { classMap } from '../../../node_modules/lit-html/directives/class-map.js';

/**
 * Affiche un overlay de chargement sur toute la page.
 * @param {boolean} isLoading - Si vrai, le loader est affiché.
 * @returns {TemplateResult} Le template lit-html pour le loader.
 */
export function Loader(isLoading) {
  const classes = { 'loader-overlay': true, 'visible': isLoading };

  return html`
    <div class=${classMap(classes)}>
      <svg class="loading-spinner" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138a.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd" />
      </svg>
    </div>
  `;
}