// src/renderer/actions/backup-modals.js

import { html, render } from '../../../node_modules/lit-html/lit-html.js';
import { state } from '../state.js';
import { renderApp } from '../app.js';
import { createBackup, deleteBackup } from './backup-actions.js';
import { formatBytes, formatDate } from '../utils/formatters.js';
import { showConfirmModal } from '../components/modal.js';
import { showNotification } from '../utils/notifications.js';

// Icônes SVG
const folderIcon = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px"><path d="M2 6a2 2 0 0 1 2-2h5.25a2 2 0 0 1 1.77.88l1.44 2.16a1 1 0 0 0 .88.44H16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z"></path></svg>`;
const trashIcon = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" /></svg>`;
const restoreIcon = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138a.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd" /></svg>`;
const archiveIcon = html`<span style="font-size: 32px;">🗄️</span>`; // Icone Header

function closeModalWithAnimation(modalContainer, onClosed) {
  if (!modalContainer) { if (onClosed) onClosed(); return; }
  modalContainer.classList.add('exiting');
  modalContainer.addEventListener('transitionend', () => {
    if (modalContainer.parentNode) modalContainer.parentNode.removeChild(modalContainer);
    state.ui.isModalOpen = false;
    if (onClosed) onClosed();
  }, { once: true });
}

export async function showManageBackupsModal(project) {
  if (state.ui.isModalOpen) return;
  state.ui.isModalOpen = true;

  const modalContainer = document.createElement('div');
  modalContainer.className = 'modal-overlay';
  document.body.appendChild(modalContainer);

  modalContainer.onclick = (e) => {
      if (e.target === modalContainer) closeModalWithAnimation(modalContainer);
  };

  let backups = [];
  let isLoading = true;

  const loadBackups = async () => {
      isLoading = true; renderModal();
      backups = await window.electronAPI.listBackups(project.projectFolderPath);
      isLoading = false; renderModal();
  };

  const handleCreate = async () => {
      closeModalWithAnimation(modalContainer);
      createBackup(project.projectFolderPath);
  };

  const handleDelete = async (path) => {
      await deleteBackup(path, project.projectFolderPath, loadBackups);
  };
  
  const handleRestore = (e, backup) => {
      if(e && e.stopPropagation) e.stopPropagation();
      closeModalWithAnimation(modalContainer, () => {
          showConfirmModal({
              title: "Restaurer cette sauvegarde ?",
              message: `Attention : Le contenu actuel du dossier sera remplacé par "${backup.name}".`,
              confirmText: "Restaurer",
              confirmClass: "btn-danger",
              onConfirm: async () => {
                  state.ui.activeRestoration = { projectName: project.name, percent: 0.1 };
                  renderApp();
                  try {
                      const result = await window.electronAPI.restoreBackup({ projectPath: project.projectFolderPath, backupPath: backup.path });
                      if (result.success) {
                          if (state.ui.activeRestoration) state.ui.activeRestoration.percent = 1;
                          renderApp();
                          showNotification('Projet restauré avec succès !', 'success');
                          await window.electronAPI.scanForProjects();
                      } else {
                          showNotification(`Erreur: ${result.message}`, 'error');
                      }
                  } catch (err) {
                      showNotification(`Crash: ${err.message}`, 'error');
                  } finally {
                      setTimeout(() => { state.ui.activeRestoration = null; renderApp(); }, 1500);
                  }
              }
          });
      });
  };
  
  const handleMaxChange = (e) => {
      const val = parseInt(e.target.value);
      state.appSettings.maxBackups = val;
      window.electronAPI.setSetting('maxBackups', val);
      renderModal();
  };

  const handleCompressionChange = (e) => {
      const val = parseInt(e.target.value);
      state.appSettings.backupCompression = val;
      window.electronAPI.setSetting('backupCompression', val);
      renderModal();
  };

  const renderModal = () => {
    const currentMax = state.appSettings.maxBackups || 5;
    const currentCompression = state.appSettings.backupCompression !== undefined ? state.appSettings.backupCompression : 9;

    const template = html`
      <div class="modal-content" @click=${e => e.stopPropagation()} style="max-width: 600px;">
        
        <!-- HEADER -->
        <div class="modal-header-panel">
            <div class="modal-icon-large">${archiveIcon}</div>
            <h2 class="modal-title">Sauvegardes du projet</h2>
            <p class="modal-subtitle">${project.name}</p>
        </div>
        
        <div class="modal-body-content" style="padding: 24px;">
            
            <!-- CONFIG GRID -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                <div class="modal-form-group" style="margin: 0; flex-direction:column; align-items:flex-start; background: var(--color-background-tertiary); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--color-separator-translucent);">
                    <div class="modal-label" style="margin:0 0 8px 0; font-size:11px; color:var(--color-text-tertiary);">HISTORIQUE</div>
                    <div style="display:flex; width:100%; align-items:center; justify-content:space-between;">
                        <span style="font-weight:600; font-size:13px;">Max ${currentMax}</span>
                        <input type="number" class="setting-input" style="flex-grow: 0; width: 60px; text-align:center; padding: 4px;" min="1" max="20" .value=${currentMax} @change=${handleMaxChange}>
                    </div>
                </div>

                <div class="modal-form-group" style="margin: 0; flex-direction:column; align-items:flex-start; background: var(--color-background-tertiary); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--color-separator-translucent);">
                    <div class="modal-label" style="margin:0 0 8px 0; font-size:11px; color:var(--color-text-tertiary);">COMPRESSION</div>
                    <div style="display:flex; width:100%; align-items:center; justify-content:space-between; gap:10px;">
                        <input type="range" min="0" max="9" step="1" .value=${currentCompression} @input=${handleCompressionChange} style="flex:1; height:4px; accent-color:var(--color-accent-blue);">
                        <span style="font-weight:700; font-size:13px; min-width:20px; text-align:right;">${currentCompression}</span>
                    </div>
                </div>
            </div>

            <div class="modal-label" style="margin-bottom: 8px;">Archives disponibles (${backups.length})</div>
            
            <!-- LISTE DES BACKUPS -->
            <div class="file-status-list custom-scroll" style="max-height: 250px; overflow-y: auto; margin-bottom: 0; background: var(--color-background-tertiary); border-radius: 12px; border: 1px solid var(--color-separator-translucent);">
                ${isLoading 
                    ? html`<div style="padding: 30px; text-align: center;"><div class="spinner-large"></div></div>` 
                    : backups.length === 0 
                        ? html`<div class="empty-msg" style="border:none; padding: 30px; background:transparent;">Aucune sauvegarde disponible.</div>`
                        : backups.map(bk => html`
                            <div class="file-status-item" style="padding: 12px 16px; border-bottom: 1px solid var(--color-separator-translucent);">
                                <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden; flex: 1;">
                                    <div style="font-weight: 700; font-size: 13px; color: var(--color-text-primary); display:flex; align-items:center; gap:8px;">
                                        ${formatDate(bk.date)}
                                        <span style="font-weight:400; font-size:10px; color:var(--color-text-tertiary); background:rgba(255,255,255,0.1); padding:1px 6px; border-radius:4px;">${formatBytes(bk.size)}</span>
                                    </div>
                                    <div style="font-size: 11px; color: var(--color-text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: monospace;">${bk.name}</div>
                                </div>
                                
                                <div style="display: flex; gap: 6px; align-items: center;">
                                    <button class="btn-icon-small" title="Restaurer" style="color: var(--color-accent-blue);" @click=${(e) => handleRestore(e, bk)}>
                                        ${restoreIcon}
                                    </button>
                                    <button class="btn-icon-small" title="Dossier" @click=${() => window.electronAPI.openPathInExplorer(bk.path)}>
                                        ${folderIcon}
                                    </button>
                                    <button class="btn-icon-small" title="Supprimer" style="color: var(--color-accent-red);" @click=${() => handleDelete(bk.path)}>
                                        ${trashIcon}
                                    </button>
                                </div>
                            </div>
                        `)
                }
            </div>
        </div>

        <div class="modal-actions">
          <button class="card-button btn-secondary" @click=${() => closeModalWithAnimation(modalContainer)}>Fermer</button>
          <button class="card-button btn-primary" @click=${handleCreate}>Créer une sauvegarde</button>
        </div>
      </div>
    `;
    render(template, modalContainer);
  };
  
  renderModal();
  loadBackups();
  requestAnimationFrame(() => modalContainer.classList.add('visible'));
}