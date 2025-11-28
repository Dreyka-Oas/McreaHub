// src/renderer/pages/installed-versions-page.js

import { html } from '../../../node_modules/lit-html/lit-html.js';
import { state } from '../state.js';
import { VersionCard } from '../components/version-card.js';

/**
 * La vue "Versions Installées".
 */
export function InstalledVersionsPage() {
  const installedArray = Object.keys(state.installedVersions)
    .map(name => state.allVersions.find(v => v.name === name))
    .filter(Boolean)
    .sort((a, b) => b.name.localeCompare(a.name));

  return html`
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Versions Installées</h1>
        <span class="version-counter">${installedArray.length}</span>
      </div>
      <div id="version-grid-container" class="page-content-scrollable">
        ${installedArray.length === 0
          ? html`<div class="empty-state">Aucune version installée.</div>`
          : html`<div class="version-grid-fixed">${installedArray.map(v => VersionCard(v))}</div>`
        }
      </div>
    </div>
  `;
}