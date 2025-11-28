// src/renderer/actions/project-modals.js

import { html, render } from '../../../node_modules/lit-html/lit-html.js';
import { state } from '../state.js';
import { renderApp } from '../app.js';
import { showNotification } from '../utils/notifications.js';
import { scanForProjects } from './project-actions.js';
import { navigateTo } from './app-actions.js';

// Icônes (Emojis pour l'instant, peuvent être remplacés par des SVG si souhaité)
const iconGit = html`<span style="font-size: 32px;">📦</span>`;
const iconFolder = html`<span style="font-size: 32px;">📂</span>`;
const iconPlus = html`<span style="font-size: 32px;">✨</span>`;
const iconLaunch = html`<span style="font-size: 32px;">🚀</span>`;

function closeModalWithAnimation(modalContainer, onClosed = () => {}) {
  if (!modalContainer) return;
  modalContainer.classList.add('exiting');
  modalContainer.addEventListener('transitionend', () => {
    if (modalContainer.parentNode) modalContainer.parentNode.removeChild(modalContainer);
    state.ui.isModalOpen = false;
    onClosed();
  }, { once: true });
}

function getAvailableMcVersions() {
  const installedNames = Object.keys(state.installedVersions);
  const installedReleases = state.allVersions.filter(v => installedNames.includes(v.name));
  const allMcVersions = installedReleases.flatMap(v => v.mc_versions || []);
  return [...new Set(allMcVersions)].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
}

// --- CLONER UN PROJET (REDESIGN) ---
export function showCloneProjectModal() {
  if (state.ui.isModalOpen) return;
  if (state.projectSources.length === 0) {
    showNotification("Veuillez d'abord ajouter un dossier source.", "info");
    manageProjectSources();
    return;
  }
  state.ui.isModalOpen = true;

  const modalContainer = document.createElement('div');
  modalContainer.className = 'modal-overlay';
  document.body.appendChild(modalContainer);

  let isSubmitting = false;
  const closeModal = () => closeModalWithAnimation(modalContainer);

  const handleClone = async () => {
    const repoUrl = modalContainer.querySelector('#repo-url-input').value.trim();
    const destinationPath = modalContainer.querySelector('input[name="project-source"]:checked')?.value;

    if (!repoUrl) { showNotification("Veuillez entrer une URL.", "error"); return; }
    if (!destinationPath) { showNotification("Sélectionnez un dossier.", "error"); return; }
    
    isSubmitting = true;
    renderModal(); 

    const result = await window.electronAPI.gitClone({ repoUrl, destinationPath });

    isSubmitting = false;
    if (result.success) {
      showNotification("Dépôt cloné avec succès !", "success");
      closeModal();
      scanForProjects();
    } else {
      showNotification(`Erreur : ${result.message}`, "error");
      renderModal();
    }
  };

  const renderModal = () => {
    const template = html`
      <div class="modal-content" @click=${e => e.stopPropagation()}>
        
        <div class="modal-header-panel">
            <div class="modal-icon-large">${iconGit}</div>
            <h2 class="modal-title">Cloner un Projet</h2>
            <p class="modal-subtitle">Récupérer un espace de travail depuis GitHub.</p>
        </div>

        <div class="modal-body-content" style="padding: 24px;">
            <div class="modal-form-group" style="flex-direction:column; align-items:flex-start; margin-top:0;">
              <label class="modal-label">URL du dépôt</label>
              <input type="text" id="repo-url-input" class="modal-input" placeholder="https://github.com/user/repo.git">
            </div>

            <div class="modal-form-group" style="flex-direction:column; align-items:flex-start;">
              <label class="modal-label">Destination</label>
              <div class="modal-options-container">
                ${state.projectSources.map((source, i) => html`
                  <label class="modal-radio-option">
                    <input type="radio" name="project-source" value=${source} ?checked=${i === 0}>
                    <div class="modal-option-text">${source}</div>
                  </label>
                `)}
              </div>
            </div>
        </div>

        <div class="modal-actions">
          <button class="card-button btn-secondary" @click=${closeModal} ?disabled=${isSubmitting}>Annuler</button>
          <button class="card-button btn-primary" @click=${handleClone} ?disabled=${isSubmitting}>
            ${isSubmitting ? html`<span class="spinner-small"></span> Clonage...` : 'Cloner'}
          </button>
        </div>
      </div>
    `;
    render(template, modalContainer);
  };
  
  renderModal();
  requestAnimationFrame(() => modalContainer.classList.add('visible'));
}

// --- GÉRER SOURCES (REDESIGN) ---
export async function manageProjectSources() {
  if (state.ui.isModalOpen) return; 
  state.ui.isModalOpen = true;
  
  const modalContainer = document.createElement('div'); 
  modalContainer.className = 'modal-overlay'; 
  document.body.appendChild(modalContainer);
  
  const closeModal = () => closeModalWithAnimation(modalContainer);

  const addSource = async () => {
    const newPath = await window.electronAPI.selectDirectory();
    if (newPath && !state.projectSources.includes(newPath)) { 
        state.projectSources = await window.electronAPI.addProjectSource(newPath); 
        showNotification("Source ajoutée.", "info"); 
        await scanForProjects(); 
        renderModal(); 
    }
  };

  const removeSource = async (sourcePath) => { 
      state.projectSources = await window.electronAPI.removeProjectSource(sourcePath); 
      showNotification("Source retirée.", "info"); 
      await scanForProjects(); 
      renderModal(); 
  };

  const renderModal = () => {
    const template = html`
        <div class="modal-content" style="max-width: 600px;" @click=${e => e.stopPropagation()}>
            
            <div class="modal-header-panel">
                <div class="modal-icon-large">${iconFolder}</div>
                <h2 class="modal-title">Sources de projets</h2>
                <p class="modal-subtitle">Gérez les dossiers où McreaHub cherche vos projets.</p>
            </div>

            <div class="modal-body-content custom-scroll" style="padding: 0;">
                <div class="file-status-list">
                    ${state.projectSources.length === 0 
                        ? html`<div class="empty-msg" style="border:none; padding: 40px;">Aucun dossier configuré.</div>` 
                        : state.projectSources.map(source => html`
                            <div class="file-status-item" style="padding: 16px 24px;">
                                <div style="display:flex; align-items:center; gap:12px; overflow:hidden;">
                                    <svg style="width:20px;height:20px;color:var(--color-accent-blue);" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 0 1 2-2h5.25a2 2 0 0 1 1.77.88l1.44 2.16a1 1 0 0 0 .88.44H16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z"/></svg>
                                    <div class="file-path" style="font-size:13px;">${source}</div>
                                </div>
                                <button class="btn-icon-small" title="Retirer" style="color: var(--color-accent-red);" @click=${() => removeSource(source)}>
                                    <svg style="width:16px;height:16px;" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" /></svg>
                                </button>
                            </div>
                        `)
                    }
                </div>
            </div>

            <div class="modal-actions">
                <button class="card-button btn-secondary" @click=${closeModal}>Fermer</button>
                <button class="card-button btn-primary" @click=${addSource}>
                    Ajouter un dossier
                </button>
            </div>
        </div>`;
    render(template, modalContainer);
  };
  
  renderModal(); 
  requestAnimationFrame(() => modalContainer.classList.add('visible'));
}

// --- WIZARD CRÉATION PROJET (REDESIGN) ---
export function showCreateNewProjectModal() {
  if (state.ui.isModalOpen) return;
  if (Object.keys(state.installedVersions).length === 0) {
    showNotification("Veuillez d'abord installer une version.", "info");
    navigateTo('versions'); return;
  }
  if (state.projectSources.length === 0) { manageProjectSources(); return; }
  _showCreateProject_Step1_SelectSource(state.projectSources);
}

function _showCreateProject_Step1_SelectSource(sources) {
  state.ui.isModalOpen = true;
  const modalContainer = document.createElement('div'); 
  modalContainer.className = 'modal-overlay'; 
  document.body.appendChild(modalContainer);
  const closeModal = () => closeModalWithAnimation(modalContainer);
  
  const handleNext = () => {
    const selectedSource = modalContainer.querySelector('input[name="project-source"]:checked')?.value;
    if (!selectedSource) { showNotification("Sélectionnez une source.", "error"); return; }
    closeModalWithAnimation(modalContainer, () => _showCreateProject_Step2_EnterName(selectedSource));
  };

  const template = html`
    <div class="modal-content" @click=${e=>e.stopPropagation()}>
        <div class="modal-header-panel">
            <div class="modal-icon-large">${iconPlus}</div>
            <h2 class="modal-title">Nouveau Projet (1/4)</h2>
            <p class="modal-subtitle">Où souhaitez-vous stocker ce projet ?</p>
        </div>
        <div class="modal-body-content" style="padding: 24px;">
            <div class="modal-options-container">
                ${sources.map((source, i) => html`
                    <label class="modal-radio-option">
                        <input type="radio" name="project-source" value=${source} ?checked=${i===0}>
                        <div class="modal-option-text">${source}</div>
                    </label>
                `)}
            </div>
        </div>
        <div class="modal-actions">
            <button class="card-button btn-secondary" @click=${closeModal}>Annuler</button>
            <button class="card-button btn-primary" @click=${handleNext}>Suivant</button>
        </div>
    </div>`;
    render(template, modalContainer); 
    requestAnimationFrame(() => modalContainer.classList.add('visible'));
}

function _showCreateProject_Step2_EnterName(sourcePath) {
    state.ui.isModalOpen = true;
    const modalContainer = document.createElement('div'); modalContainer.className = 'modal-overlay'; document.body.appendChild(modalContainer);
    const closeModal = () => closeModalWithAnimation(modalContainer);
    const handleNext = () => {
        const projectName = modalContainer.querySelector('#project-name-input').value.trim();
        if (!projectName) { showNotification("Entrez un nom.", "error"); return; }
        closeModalWithAnimation(modalContainer, () => _showCreateProject_Step3_SelectMcVersion(sourcePath, projectName));
    };
    const template = html`
    <div class="modal-content" @click=${e=>e.stopPropagation()}>
        <div class="modal-header-panel">
            <div class="modal-icon-large">${iconPlus}</div>
            <h2 class="modal-title">Nouveau Projet (2/4)</h2>
            <p class="modal-subtitle">Donnez un nom à votre espace de travail.</p>
        </div>
        <div class="modal-body-content" style="padding: 24px;">
            <input type="text" id="project-name-input" class="modal-input" placeholder="Nom du projet" autofocus>
        </div>
        <div class="modal-actions">
            <button class="card-button btn-secondary" @click=${closeModal}>Annuler</button>
            <button class="card-button btn-primary" @click=${handleNext}>Suivant</button>
        </div>
    </div>`;
    render(template, modalContainer); 
    requestAnimationFrame(() => modalContainer.classList.add('visible'));
    setTimeout(() => modalContainer.querySelector('input')?.focus(), 100);
}

function _showCreateProject_Step3_SelectMcVersion(sourcePath, projectName) {
    state.ui.isModalOpen = true;
    const availableMcVersions = getAvailableMcVersions();
    const modalContainer = document.createElement('div'); modalContainer.className = 'modal-overlay'; document.body.appendChild(modalContainer);
    const closeModal = () => closeModalWithAnimation(modalContainer);
    
    const handleNext = async () => {
        const selectedMcVersion = modalContainer.querySelector('input[name="mc-version"]:checked')?.value;
        if (!selectedMcVersion) { showNotification("Sélectionnez une version.", "error"); return; }
        const result = await window.electronAPI.createProjectFolder({ parentPath: sourcePath, folderName: projectName, minecraftVersion: selectedMcVersion });
        if (!result.success) { showNotification(`Erreur : ${result.message}`, 'error'); return; }
        showNotification(`Dossier créé.`, 'success'); 
        closeModalWithAnimation(modalContainer, () => {
            scanForProjects(); 
            _showCreateProject_Step4_SelectMcreator(selectedMcVersion);
        });
    };

    const template = html`
    <div class="modal-content" @click=${e=>e.stopPropagation()}>
        <div class="modal-header-panel">
            <div class="modal-icon-large">${iconPlus}</div>
            <h2 class="modal-title">Nouveau Projet (3/4)</h2>
            <p class="modal-subtitle">Choisissez la version Minecraft cible.</p>
        </div>
        <div class="modal-body-content" style="padding: 24px;">
            <div class="modal-options-container custom-scroll" style="max-height:200px;">
                ${availableMcVersions.map((version, i) => html`
                    <label class="modal-radio-option">
                        <input type="radio" name="mc-version" value=${version} ?checked=${i===0}>
                        <div class="modal-option-text">${version}</div>
                    </label>`)}
            </div>
        </div>
        <div class="modal-actions">
            <button class="card-button btn-secondary" @click=${closeModal}>Annuler</button>
            <button class="card-button btn-primary" @click=${handleNext}>Créer</button>
        </div>
    </div>`;
    render(template, modalContainer);
    requestAnimationFrame(() => modalContainer.classList.add('visible'));
}

function _showCreateProject_Step4_SelectMcreator(minecraftVersion) {
    state.ui.isModalOpen = true;
    const compatibleMcreatorVersions = Object.keys(state.installedVersions).filter(name => {
        const release = state.allVersions.find(v => v.name === name);
        return release && release.mc_versions.includes(minecraftVersion);
    }).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    
    const modalContainer = document.createElement('div'); modalContainer.className = 'modal-overlay'; document.body.appendChild(modalContainer);
    const closeModal = () => closeModalWithAnimation(modalContainer);

    const handleLaunch = async () => {
        const selectedMcreator = modalContainer.querySelector('input[name="mcreator-version"]:checked')?.value;
        if (!selectedMcreator) return;
        await window.electronAPI.launchVersion(selectedMcreator); 
        showNotification(`Lancement...`, 'info'); 
        closeModal();
    };

    const template = html`
    <div class="modal-content" @click=${e=>e.stopPropagation()}>
        <div class="modal-header-panel">
            <div class="modal-icon-large">${iconLaunch}</div>
            <h2 class="modal-title">Nouveau Projet (4/4)</h2>
            <p class="modal-subtitle">Avec quelle version de MCreator lancer ce projet ?</p>
        </div>
        <div class="modal-body-content" style="padding: 24px;">
            <div class="modal-options-container">
                ${compatibleMcreatorVersions.map((version, i) => html`
                    <label class="modal-radio-option">
                        <input type="radio" name="mcreator-version" value=${version} ?checked=${i===0}>
                        <div class="modal-option-text">${version}</div>
                    </label>`)}
            </div>
        </div>
        <div class="modal-actions">
            <button class="card-button btn-secondary" @click=${closeModal}>Plus tard</button>
            <button class="card-button btn-primary" @click=${handleLaunch}>Lancer</button>
        </div>
    </div>`;
    render(template, modalContainer);
    requestAnimationFrame(() => modalContainer.classList.add('visible'));
}

export function showAddProjectVersionModal(project) { 
    _showAddVersion_Step1_SelectMcVersion(project); 
}

function _showAddVersion_Step1_SelectMcVersion(project) {
    const existingVersions = new Set(project.versions.map(v => v.minecraftVersion));
    const availableMcVersions = getAvailableMcVersions().filter(v => !existingVersions.has(v));
    
    if (availableMcVersions.length === 0) { showNotification("Toutes les versions possibles existent déjà.", "info"); return; }
    
    state.ui.isModalOpen = true;
    const modalContainer = document.createElement('div'); modalContainer.className = 'modal-overlay'; document.body.appendChild(modalContainer);
    const closeModal = () => closeModalWithAnimation(modalContainer);
    
    const handleNext = async () => {
        const selectedMcVersion = modalContainer.querySelector('input[name="mc-version"]:checked')?.value;
        if (!selectedMcVersion) return;
        const result = await window.electronAPI.createProjectSubfolder({ parentPath: project.projectFolderPath, folderName: selectedMcVersion });
        if (result.success) {
            showNotification(`Version ajoutée.`, 'success');
            closeModalWithAnimation(modalContainer, () => {
                scanForProjects();
                _showCreateProject_Step4_SelectMcreator(selectedMcVersion);
            });
        } else {
            showNotification(result.message, 'error');
        }
    };

    const template = html`
    <div class="modal-content" @click=${e=>e.stopPropagation()}>
        <div class="modal-header-panel">
            <div class="modal-icon-large">${iconPlus}</div>
            <h2 class="modal-title">Ajouter une version</h2>
            <p class="modal-subtitle">Pour le projet <strong>${project.name}</strong></p>
        </div>
        <div class="modal-body-content" style="padding: 24px;">
            <div class="modal-options-container custom-scroll" style="max-height:200px;">
                ${availableMcVersions.map((version, i) => html`
                    <label class="modal-radio-option">
                        <input type="radio" name="mc-version" value=${version} ?checked=${i===0}>
                        <div class="modal-option-text">${version}</div>
                    </label>`)}
            </div>
        </div>
        <div class="modal-actions">
            <button class="card-button btn-secondary" @click=${closeModal}>Annuler</button>
            <button class="card-button btn-primary" @click=${handleNext}>Créer</button>
        </div>
    </div>`;
    render(template, modalContainer);
    requestAnimationFrame(() => modalContainer.classList.add('visible'));
}

export function showLaunchProjectModal(version) {
    if (state.ui.isModalOpen) return;
    state.ui.isModalOpen = true;
    const modalContainer = document.createElement('div'); modalContainer.className = 'modal-overlay'; document.body.appendChild(modalContainer);
    const closeModal = () => closeModalWithAnimation(modalContainer);
    
    const compatibleInstalledVersions = Object.keys(state.installedVersions)
      .filter(installedName => {
        const installedReleaseData = state.allVersions.find(v => v.name === installedName);
        if (!installedReleaseData) return false;
        
        const supportsMcVersion = installedReleaseData.mc_versions.includes(version.minecraftVersion);
        if (!supportsMcVersion) return false;
        
        if (!version.mcreatorVersion) return true;
        return installedName.localeCompare(version.mcreatorVersion, undefined, { numeric: true }) >= 0;
      })
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

    if (compatibleInstalledVersions.length === 0) {
        showNotification(`Aucune version compatible.`, 'error');
        closeModal();
        return;
    }

    const handleLaunch = async () => {
        const selectedVersion = modalContainer.querySelector('input[name="mcreator-version"]:checked')?.value;
        if (selectedVersion) {
            await window.electronAPI.launchProject({ versionName: selectedVersion, projectPath: version.path });
            closeModal();
        }
    };

    const template = html`
    <div class="modal-content" @click=${e=>e.stopPropagation()}>
        <div class="modal-header-panel">
            <div class="modal-icon-large">${iconLaunch}</div>
            <h2 class="modal-title">Lancer le projet</h2>
            <p class="modal-subtitle">${version.minecraftVersion}</p>
        </div>
        <div class="modal-body-content" style="padding: 24px;">
             <p style="margin-bottom:10px; font-size:12px;">Sélectionnez la version de MCreator :</p>
             <div class="modal-options-container">
                ${compatibleInstalledVersions.map((v, i) => html`
                    <label class="modal-radio-option">
                        <input type="radio" name="mcreator-version" value=${v} ?checked=${i===0}>
                        <div class="modal-option-text">${v}</div>
                    </label>`)}
             </div>
        </div>
        <div class="modal-actions">
            <button class="card-button btn-secondary" @click=${closeModal}>Annuler</button>
            <button class="card-button btn-primary" @click=${handleLaunch}>Lancer</button>
        </div>
    </div>`;
    render(template, modalContainer);
    requestAnimationFrame(() => modalContainer.classList.add('visible'));
}

export function showInitializeWorkspaceModal(version) {
    if (state.ui.isModalOpen) return;
    state.ui.isModalOpen = true;
    const modalContainer = document.createElement('div'); modalContainer.className = 'modal-overlay'; document.body.appendChild(modalContainer);
    const closeModal = () => closeModalWithAnimation(modalContainer);

    const compatibleMcreatorVersions = Object.keys(state.installedVersions).filter(name => {
        const release = state.allVersions.find(v => v.name === name);
        return release && release.mc_versions.includes(version.minecraftVersion);
    }).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

    if (compatibleMcreatorVersions.length === 0) {
        showNotification(`Aucune version compatible avec MC ${version.minecraftVersion}.`, 'error');
        closeModal();
        return;
    }

    const handleLaunch = async () => {
        const selectedMcreator = modalContainer.querySelector('input[name="mcreator-version"]:checked')?.value;
        if (!selectedMcreator) return;
        await window.electronAPI.launchVersion(selectedMcreator);
        showNotification(`Lancement...`, 'info');
        closeModal();
    };

    const template = html`
    <div class="modal-content" @click=${e=>e.stopPropagation()}>
        <div class="modal-header-panel">
            <div class="modal-icon-large">${iconLaunch}</div>
            <h2 class="modal-title">Initialiser l'espace</h2>
            <p class="modal-subtitle">Minecraft ${version.minecraftVersion}</p>
        </div>
        <div class="modal-body-content" style="padding: 24px;">
             <div class="modal-options-container">
                ${compatibleMcreatorVersions.map((v, i) => html`
                    <label class="modal-radio-option">
                        <input type="radio" name="mcreator-version" value=${v} ?checked=${i===0}>
                        <div class="modal-option-text">${v}</div>
                    </label>`)}
             </div>
        </div>
        <div class="modal-actions">
            <button class="card-button btn-secondary" @click=${closeModal}>Annuler</button>
            <button class="card-button btn-primary" @click=${handleLaunch}>Lancer</button>
        </div>
    </div>`;
    render(template, modalContainer);
    requestAnimationFrame(() => modalContainer.classList.add('visible'));
}