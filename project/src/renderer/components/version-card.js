// src/renderer/components/version-card.js

import { html } from '../../../node_modules/lit-html/lit-html.js';
import { state } from '../state.js';
import { downloadVersion, uninstallVersion, launchVersionAction } from '../actions/index.js';
import { formatDate, formatBytes, formatSpeed } from '../utils/formatters.js';
import { showConfirmModal } from './modal.js';

export function VersionCard(version) {
  const isInstalled = !!state.installedVersions[version.name];
  const downloadState = state.ui.downloads[version.name];
  const hasCompatibleVersions = version.mc_versions && version.mc_versions.length > 0;
  const isLaunching = state.ui.launchingVersions.has(version.name);
  const isUninstalling = state.ui.uninstallingVersions.has(version.name);
  
  const loaders = version.supported_loaders || [];

  let statusClass = 'status-standard';
  if (isInstalled) statusClass = 'status-installed';
  else if (version.prerelease) statusClass = 'status-eap';
  else if (!hasCompatibleVersions) statusClass = 'status-disabled';

  const handleUninstallClick = () => {
    showConfirmModal({
      title: `Désinstaller ${version.name} ?`,
      message: "Cette action supprimera définitivement les fichiers de cette version.",
      confirmText: "Désinstaller",
      confirmClass: 'btn-danger',
      onConfirm: () => uninstallVersion(version.name),
    });
  };
  
  const handleDownloadClick = () => {
    showConfirmModal({
      title: `Installer ${version.name} ?`,
      message: "Télécharger et installer cette version ?",
      confirmText: "Installer",
      onConfirm: () => downloadVersion(version),
    });
  };

  let cardFooter;
  
  if (downloadState || isUninstalling) {
    const percent = downloadState ? (downloadState.percent || 0) * 100 : 100;
    const label = isUninstalling ? 'Désinstallation...' : (downloadState.status === 'installing' ? 'Installation...' : 'Téléchargement...');
    const speed = downloadState ? formatSpeed(downloadState.speed || 0) : '';
    const fillClass = isUninstalling ? 'uninstalling' : (downloadState?.status === 'installing' ? 'installing' : '');

    cardFooter = html`
      <div class="card-progress-container">
        <div class="progress-info">
            <span>${label}</span>
            <span>${speed}</span>
        </div>
        <div class="card-progress-bar">
            <div class="card-progress-fill ${fillClass}" style="width: ${percent}%"></div>
        </div>
      </div>`;
  } else if (!hasCompatibleVersions && !isInstalled) {
    cardFooter = html`
        <div class="unavailable-msg" style="text-align:center; color:var(--color-text-tertiary); font-size:11px; padding:10px; margin-top:auto;">
            Non compatible avec cet OS
        </div>`;
  } else {
    if (isInstalled) {
        cardFooter = html`
            <div class="card-footer-v2">
                <button class="btn-card-action btn-icon-only" title="Désinstaller" @click=${handleUninstallClick}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width:20px;height:20px"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" /></svg>
                </button>
                <button class="btn-card-action btn-launch ${isLaunching ? 'btn-loading' : ''}" @click=${() => launchVersionAction(version.name)} ?disabled=${isLaunching}>
                    ${isLaunching ? 'Lancement...' : 'Lancer'}
                </button>
            </div>`;
    } else {
        cardFooter = html`
            <div class="card-footer-v2">
                <button class="btn-card-action btn-install" @click=${handleDownloadClick}>
                    <svg style="width:18px;height:18px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" /><path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" /></svg>
                    Installer
                </button>
            </div>`;
    }
  }

  const mcVersionText = hasCompatibleVersions
    ? version.mc_versions.slice(0, 3).join(', ') + (version.mc_versions.length > 3 ? '...' : '')
    : 'Inconnue';

  const getLoaderClass = (l) => {
      const lower = l.toLowerCase();
      if (lower.includes('neo')) return 'neoforge';
      if (lower.includes('forge')) return 'forge';
      if (lower.includes('fabric')) return 'fabric';
      if (lower.includes('quilt')) return 'quilt';
      return '';
  };

  return html`
    <div class="version-card ${statusClass}" data-version-name=${version.name}>
      
      <!-- HEADER (DESIGN V2) -->
      <div class="card-header-v2">
        <div class="card-header-top">
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <h3 class="version-title-large">${version.name}</h3>
                ${isInstalled ? html`<div class="badge-installed">Installé</div>` : ''}
            </div>
            <div class="version-meta-row">
                ${version.prerelease 
                    ? html`<span class="badge-type eap">Snapshot (EAP)</span>` 
                    : html`<span class="badge-type stable">Stable</span>`}
            </div>
        </div>
      </div>

      <!-- BODY -->
      <div class="card-body-v2">
        
        <!-- GRID INFO -->
        <div class="card-info-grid">
            <div class="info-cell">
                <span class="info-label">Date</span>
                <span class="info-value">${formatDate(version.published_at)}</span>
            </div>
            <div class="info-cell">
                <span class="info-label">Taille</span>
                <span class="info-value">${formatBytes(version.size)}</span>
            </div>
            <div class="info-cell" style="grid-column: 1 / -1; border-top: 1px solid var(--color-separator-translucent); padding-top: 8px;">
                <span class="info-label">Minecraft</span>
                <span class="info-value highlight" title="${version.mc_versions?.join(', ')}">${mcVersionText}</span>
            </div>
        </div>

        <!-- LOADERS -->
        ${loaders.length > 0 ? html`
            <div class="loaders-area">
                <span class="loaders-label">Supporte :</span>
                <div class="loaders-list">
                    ${loaders.map(l => html`<span class="badge-loader ${getLoaderClass(l)}">${l}</span>`)}
                </div>
            </div>
        ` : ''}

        <!-- FOOTER -->
        ${cardFooter}
      </div>
    </div>
  `;
}