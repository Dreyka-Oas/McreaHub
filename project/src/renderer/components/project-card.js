// src/renderer/components/project-card.js

import { html } from '../../../node_modules/lit-html/lit-html.js';
import { state } from '../state.js';
import { deleteProjectVersionAction, deleteProjectFullAction } from '../actions/project-actions.js'; // Import ajouté
import { showLaunchProjectModal, showInitializeWorkspaceModal, showAddProjectVersionModal } from '../actions/project-modals.js';
import { syncProjectAction, syncVersionAction, showGitConfigModal } from '../actions/git-actions.js';
import { showManageBackupsModal } from '../actions/backup-modals.js';

// SVG Icons
const folderIcon = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 0 1 2-2h5.25a2 2 0 0 1 1.77.88l1.44 2.16a1 1 0 0 0 .88.44H16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z"></path></svg>`;
const trashIcon = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" /></svg>`;
const cloudIcon = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 16a3.5 3.5 0 01-.361-6.98c.048-1.052.63-2.062 1.638-2.757C7.838 5.56 9.353 5 11 5c3.027 0 5.513 2.247 5.931 5.188a3.75 3.75 0 010 4.812h-5.181v2h5.181a5.75 5.75 0 000-8.812c-.428-2.941-2.904-5.188-5.931-5.188-1.647 0-3.162.56-4.223 1.563A5.99 5.99 0 005.5 9v.01A5.5 5.5 0 005.5 16z" /></svg>`;
const spinnerIcon = html`<svg class="spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138a.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd" /></svg>`;
const archiveIcon = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 00-1 1v1a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1H2z" /><path fill-rule="evenodd" d="M2 7.5h16l-.811 7.71a2 2 0 01-1.99 1.79H4.802a2 2 0 01-1.99-1.79L2 7.5zm5.22 1.72a.75.75 0 011.06 0L10 10.94l1.72-1.72a.75.75 0 111.06 1.06l-2.25 2.25a.75.75 0 01-1.06 0l-2.25-2.25a.75.75 0 010-1.06z" clip-rule="evenodd" /></svg>`;
const plusIcon = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/></svg>`;
const gitIcon = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>`;

function checkCompatibility(minecraftVersion, projectMcreatorVersion) {
    const installedNames = Object.keys(state.installedVersions);
    return installedNames.some(name => {
        const release = state.allVersions.find(v => v.name === name);
        if (!release || !release.mc_versions || !release.mc_versions.includes(minecraftVersion)) return false;
        if (!projectMcreatorVersion) return true;
        return name.localeCompare(projectMcreatorVersion, undefined, { numeric: true, sensitivity: 'base' }) >= 0;
    });
}

const loaderStyles = {
    'Forge': 'color: #DFA855; background: rgba(223, 170, 85, 0.1); border-color: rgba(223, 170, 85, 0.2);',
    'NeoForge': 'color: #FF6432; background: rgba(255, 100, 50, 0.1); border-color: rgba(255, 100, 50, 0.2);',
    'Fabric': 'color: #CCCCCC; background: rgba(200, 200, 200, 0.1); border-color: rgba(200, 200, 200, 0.2);',
    'Quilt': 'color: #3CB464; background: rgba(60, 180, 100, 0.1); border-color: rgba(60, 180, 100, 0.2);'
};

export function ProjectCard(project) {
  const mainPicture = project.versions.find(v => v.picture)?.picture || null;
  const backupsEnabled = state.appConfig.features.backups;
  const canUseGit = state.appConfig.features.github && state.gitInstalled && state.appSettings.githubToken;
  const activeOps = state.ui.gitOperations || {};
  const isAnyOpRunning = Object.keys(activeOps).some(key => key.startsWith(project.projectFolderPath));
  const hasRemote = !!project.remoteUrl;

  const renderVersions = () => {
      const sortedVersions = project.versions.sort((a, b) => b.minecraftVersion.localeCompare(a.minecraftVersion, undefined, { numeric: true }));

      return sortedVersions.map(version => {
            const isCompatible = checkCompatibility(version.minecraftVersion, version.mcreatorVersion);
            const versionOpKey = `${project.projectFolderPath}::${version.minecraftVersion}`;
            const isVerSyncing = !!activeOps[versionOpKey];
            const loaderStyle = (version.isInitialized && version.loader) ? (loaderStyles[version.loader] || '') : '';

            return html`
            <div class="version-row-compact">
                <div class="v-info">
                    <div class="v-main">
                        <span class="v-mc">${version.minecraftVersion}</span>
                        ${version.loader && version.loader !== 'Unknown' ? html`<span class="v-loader" style="${loaderStyle}">${version.loader}</span>` : ''}
                    </div>
                    <div class="v-sub">
                        ${version.isInitialized ? `v${version.mcreatorVersion}` : 'Non initialisé'}
                    </div>
                </div>
                <div class="v-actions-toolbar">
                    ${hasRemote && canUseGit ? html`
                        <button class="v-action-icon" 
                                title="Synchroniser cette version" 
                                ?disabled=${isAnyOpRunning} 
                                @click=${(e) => { e.stopPropagation(); syncVersionAction(project, version); }}>
                            ${isVerSyncing ? spinnerIcon : cloudIcon}
                        </button>
                    ` : ''}
                    <button class="v-action-icon" title="Ouvrir le dossier" ?disabled=${isAnyOpRunning} @click=${() => window.electronAPI.openPathInExplorer(version.path)}>
                        ${folderIcon}
                    </button>
                    <button class="v-action-icon danger" title="Supprimer cette version" ?disabled=${isAnyOpRunning} @click=${() => deleteProjectVersionAction(version.path, `${project.name} (${version.minecraftVersion})`)}>
                        ${trashIcon}
                    </button>
                    <div class="v-separator"></div>
                    <button 
                        class="v-launch-btn ${!version.isInitialized ? 'create' : ''}" 
                        ?disabled=${!isCompatible || isAnyOpRunning} 
                        @click=${() => version.isInitialized ? showLaunchProjectModal(version) : showInitializeWorkspaceModal(version)}>
                        ${version.isInitialized ? 'LANCER' : 'CRÉER'}
                    </button>
                </div>
            </div>`;
      });
  };

  return html`
    <div class="project-card redesign">
      <!-- HEADER -->
      <div class="card-header-redesign">
        <div class="header-cover">
            <div class="header-overlay"></div>
            <div class="header-content-layer">
                
                <div class="header-badges">
                    ${backupsEnabled ? html`
                        <button class="mini-badge-btn" ?disabled=${isAnyOpRunning} @click=${() => showManageBackupsModal(project)} title="Gérer les sauvegardes">
                            ${archiveIcon} <span>${project.backupCount}</span>
                        </button>
                    ` : ''}
                    ${canUseGit ? html`
                        <button class="mini-badge-btn ${hasRemote ? 'linked' : ''}" ?disabled=${isAnyOpRunning} @click=${(e) => { e.stopPropagation(); if(!isAnyOpRunning) hasRemote ? syncProjectAction(project) : showGitConfigModal(project); }} title="${hasRemote ? 'Synchroniser tout le projet' : 'Lier à GitHub'}">
                            ${gitIcon}
                        </button>
                    ` : ''}
                    
                    <!-- NOUVEAU BOUTON : SUPPRESSION PROJET (ROUGE) -->
                    <button class="mini-badge-btn" style="border-color: var(--color-accent-red); color: var(--color-accent-red);" 
                            ?disabled=${isAnyOpRunning} 
                            @click=${(e) => { e.stopPropagation(); deleteProjectFullAction(project); }} 
                            title="Supprimer tout le projet">
                        ${trashIcon}
                    </button>

                </div>

                <div class="header-title-row">
                    <div class="project-logo-box">
                        ${mainPicture ? html`<img src="${mainPicture}" class="project-logo-img">` : folderIcon}
                    </div>
                    <h3 class="header-title" title="${project.name}">${project.name}</h3>
                </div>

            </div>
        </div>
        <div class="header-path" title="${project.projectFolderPath}">${project.projectFolderPath}</div>
      </div>

      <!-- BODY PRINCIPAL (Flex Column) -->
      <div class="card-body-container">
          
        <!-- ZONE DÉFILANTE : Liste des versions -->
        <div class="versions-scroll-area">
            ${project.versions.length > 0 ? renderVersions() : html`<div class="empty-msg-compact">Aucune version.</div>`}
        </div>

        <!-- ZONE FIXE : Bouton Ajouter -->
        <button class="add-version-row" ?disabled=${isAnyOpRunning} @click=${() => showAddProjectVersionModal(project)}>
            ${plusIcon} <span>Ajouter une version</span>
        </button>

      </div>
    </div>
  `;
}