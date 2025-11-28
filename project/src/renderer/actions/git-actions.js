// src/renderer/actions/git-actions.js

import { html, render } from '../../../node_modules/lit-html/lit-html.js';
import { state } from '../state.js';
import { renderApp } from '../app.js';
import { showNotification } from '../utils/notifications.js';
import { scanForProjects } from './project-actions.js';
import { showConfirmModal } from '../components/modal.js';

const iconFilter = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width:14px;height:14px"><path fill-rule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z" clip-rule="evenodd" /></svg>`;

// --- MODALE ÉDITION GITIGNORE ---
export async function showGitIgnoreEditor(targetPath) {
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-overlay';
    document.body.appendChild(modalContainer);

    const closeModal = () => {
        modalContainer.classList.add('exiting');
        modalContainer.addEventListener('transitionend', () => {
            if (modalContainer.parentNode) modalContainer.parentNode.removeChild(modalContainer);
        }, { once: true });
    };

    let content = "";
    try {
        content = await window.electronAPI.getGitIgnoreContent(targetPath);
    } catch (e) {
        content = "# Erreur lecture, voici le défaut :\n.DS_Store\nbuild/\n";
    }

    const handleSave = async () => {
        const newContent = modalContainer.querySelector('textarea').value;
        await window.electronAPI.saveGitIgnoreContent(targetPath, newContent);
        showNotification("Fichier .gitignore mis à jour.", "success");
        closeModal();
    };

    const template = html`
        <div class="modal-content" @click=${e => e.stopPropagation()}>
            <div class="modal-header-panel">
                <div class="modal-icon-large">${iconFilter}</div>
                <h2 class="modal-title">Filtres Git (.gitignore)</h2>
                <p class="modal-subtitle">Définissez les fichiers à ignorer lors de la synchronisation.</p>
            </div>
            
            <div class="modal-body-content" style="padding: 24px;">
                <textarea class="modal-input" style="height: 200px; font-family: monospace; resize: none;" spellcheck="false">${content}</textarea>
                <p style="font-size: 11px; color: var(--color-text-tertiary); margin-top: 8px;">
                    Un fichier/dossier par ligne. Les lignes commençant par # sont des commentaires.
                </p>
            </div>

            <div class="modal-actions">
                <button type="button" class="card-button btn-secondary" @click=${closeModal}>Annuler</button>
                <button type="button" class="card-button btn-primary" @click=${handleSave}>Enregistrer</button>
            </div>
        </div>
    `;
    render(template, modalContainer);
    requestAnimationFrame(() => modalContainer.classList.add('visible'));
}

function createSyncModalController(project, title, subtitle, targetPathForIgnore) {
    const container = document.createElement('div');
    container.className = 'modal-overlay';
    document.body.appendChild(container);
    
    state.ui.isModalOpen = true;
    requestAnimationFrame(() => container.classList.add('visible'));

    const close = () => {
        container.classList.add('exiting');
        container.addEventListener('transitionend', () => {
            if (container.parentNode) container.parentNode.removeChild(container);
            state.ui.isModalOpen = false;
        }, { once: true });
    };

    const updateUI = (props) => {
        const { isLoading, statuses, onConfirm, onUnlink } = props;
        const headerIcon = isLoading ? '⏳' : (statuses && statuses.length > 0 ? '🚀' : '✨');
        const headerTitle = isLoading ? 'Analyse en cours' : (statuses && statuses.length > 0 ? title : 'Tout est à jour');

        let listContent;
        if (isLoading) {
            listContent = html`
                <div class="sync-item-card">
                    <div class="sync-icon-badge"><span class="spinner-small" style="border-color: var(--color-text-secondary); border-top-color: transparent;"></span></div>
                    <div class="sync-info"><span class="sync-name">Vérification...</span></div>
                </div>`;
        } else if (!statuses || statuses.length === 0) {
            listContent = html`
                <div style="text-align:center; padding: 40px 20px; color: var(--color-text-secondary);">
                    <p style="margin-bottom: 8px;">Aucune modification détectée.</p>
                    <p style="font-size: 12px; color: var(--color-text-tertiary);">Votre projet local est synchronisé avec GitHub.</p>
                </div>`;
        } else {
            listContent = statuses.map(s => {
                let icon = ''; let tags = [];
                if (s.status === 'new') { icon = '✨'; tags.push(html`<span class="sync-tag tag-blue">Nouveau</span>`); }
                else if (s.status === 'orphan') { icon = '🗑️'; tags.push(html`<span class="sync-tag tag-red">Orphelin</span>`); }
                else {
                    if (s.commitsBehind > 0) { icon = '⬇️'; tags.push(html`<span class="sync-tag tag-orange">⬇️ ${s.commitsBehind}</span>`); }
                    if (s.localChanges) { icon = icon ? '🔄' : '✏️'; tags.push(html`<span class="sync-tag tag-green">Modifs locales</span>`); }
                    if (s.commitsAhead > 0) { icon = icon ? '🔄' : '⬆️'; tags.push(html`<span class="sync-tag tag-blue">⬆️ ${s.commitsAhead}</span>`); }
                }
                return html`
                    <div class="sync-item-card">
                        <div class="sync-icon-badge">${icon}</div>
                        <div class="sync-info">
                            <span class="sync-name">${s.name}</span>
                            <div class="sync-details">${tags}</div>
                        </div>
                    </div>`;
            });
        }

        render(html`
            <div class="modal-content" @click=${e => e.stopPropagation()}>
                <div class="modal-header-panel">
                    <div class="modal-icon-large">${headerIcon}</div>
                    <h2 class="modal-title">${headerTitle}</h2>
                    <p class="modal-subtitle">${subtitle}</p>
                </div>
                <div class="modal-body-content custom-scroll">
                    <div class="sync-status-list">${listContent}</div>
                </div>
                <div class="modal-actions">
                    <div style="display:flex; gap:12px; align-items:center;">
                        ${!isLoading ? html`
                            <button type="button" class="btn-danger-text" @click=${(e) => { e.stopPropagation(); close(); onUnlink(); }}>
                                Dissocier
                            </button>
                            
                            <!-- BOUTON MODIFIER GITIGNORE -->
                            <button type="button" class="btn-icon-small" title="Modifier .gitignore" @click=${(e) => { e.stopPropagation(); showGitIgnoreEditor(targetPathForIgnore); }}>
                                ${iconFilter}
                            </button>
                        ` : ''}
                    </div>
                    
                    <div style="display:flex; gap:12px;">
                        <button type="button" class="card-button btn-secondary" @click=${close}>Fermer</button>
                        ${(!isLoading && statuses && statuses.length > 0) ? html`
                            <button type="button" class="card-button btn-primary" @click=${(e) => { e.stopPropagation(); close(); onConfirm(); }}>Synchroniser</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `, container);
    };

    return { update: updateUI, close };
}

function handleUnlinkLogic(project) {
    setTimeout(() => {
        showConfirmModal({
            title: "Dissocier le projet ?",
            message: "Le lien Git sera supprimé de la configuration locale. Vos fichiers resteront intacts.",
            confirmText: "Dissocier",
            confirmClass: "btn-danger",
            onConfirm: async () => {
                try {
                    state.ui.isLoading = true;
                    renderApp();
                    await window.electronAPI.invoke('git:set-project-url', { projectPath: project.projectFolderPath, url: null });
                    showNotification("Projet dissocié avec succès.", "success");
                    await scanForProjects(false); 
                } catch(err) { showNotification(`Erreur : ${err.message}`, "error"); } 
                finally { state.ui.isLoading = false; renderApp(); }
            }
        });
    }, 50);
}

export async function syncProjectAction(project) {
    if (!project.remoteUrl) { showGitConfigModal(project); return; }

    // Pour la synchro globale, on passe la racine du projet pour le .gitignore
    const modal = createSyncModalController(
        project, 
        "Synchronisation", 
        html`Modifications pour <strong>${project.name}</strong>`,
        project.projectFolderPath 
    );
    modal.update({ isLoading: true });

    try {
        const checkRes = await window.electronAPI.invoke('git:check-project-status', project.projectFolderPath);
        if (!checkRes.success) { modal.close(); showNotification(`Erreur: ${checkRes.message}`, 'error'); return; }

        modal.update({
            isLoading: false,
            statuses: checkRes.statuses || [],
            onUnlink: () => handleUnlinkLogic(project),
            onConfirm: async () => {
                state.ui.gitOperations[project.projectFolderPath] = { phase: 'Envoi (Push)...', percent: 0.2 };
                renderApp();
                try {
                    const syncRes = await window.electronAPI.invoke('git:sync-project', project.projectFolderPath);
                    if (syncRes.success) showNotification(syncRes.message, 'success');
                    else showNotification(`Erreur partielle: ${syncRes.message}`, 'error');
                } catch (err) { showNotification(`Erreur sync: ${err.message}`, 'error'); } 
                finally { delete state.ui.gitOperations[project.projectFolderPath]; renderApp(); }
            }
        });
    } catch (e) { modal.close(); showNotification("Erreur d'analyse Git.", "error"); }
}

export async function syncVersionAction(project, version) {
    if (!project.remoteUrl) { showNotification("Veuillez d'abord configurer le dépôt.", "error"); return; }

    // Pour une version individuelle, on passe aussi la racine car le .gitignore est global
    const modal = createSyncModalController(
        project,
        "Sync Version",
        html`Mise à jour de <strong>${version.minecraftVersion}</strong>`,
        project.projectFolderPath
    );
    modal.update({ isLoading: true });

    try {
        const checkRes = await window.electronAPI.invoke('git:check-version-status', { projectPath: project.projectFolderPath, versionName: version.minecraftVersion });
        if (!checkRes.success) { modal.close(); showNotification(`Erreur: ${checkRes.message}`, 'error'); return; }
        const status = checkRes.status;
        const statuses = [];
        if (status.localChanges || status.commitsBehind > 0 || status.commitsAhead > 0 || status.status === 'new') statuses.push(status);

        modal.update({
            isLoading: false,
            statuses: statuses,
            onUnlink: () => handleUnlinkLogic(project),
            onConfirm: async () => {
                const opKey = `${project.projectFolderPath}::${version.minecraftVersion}`;
                state.ui.gitOperations[opKey] = { phase: 'Envoi (Push)...', percent: 0.2 };
                renderApp();
                try {
                    const syncRes = await window.electronAPI.invoke('git:sync-version', { projectPath: project.projectFolderPath, versionName: version.minecraftVersion });
                    if (syncRes.success) showNotification(`Version ${version.minecraftVersion} synchronisée.`, 'success');
                    else showNotification(`Erreur: ${syncRes.message}`, 'error');
                } catch (err) { showNotification(`Erreur sync: ${err.message}`, 'error'); } 
                finally { delete state.ui.gitOperations[opKey]; renderApp(); }
            }
        });
    } catch (e) { modal.close(); showNotification("Erreur d'analyse version.", "error"); }
}

export function showGitConfigModal(project) {
    if (state.ui.isModalOpen) return;
    state.ui.isModalOpen = true;
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-overlay';
    document.body.appendChild(modalContainer);
    const closeModal = () => {
        modalContainer.classList.add('exiting');
        modalContainer.addEventListener('transitionend', () => {
            if (modalContainer.parentNode) modalContainer.parentNode.removeChild(modalContainer);
            state.ui.isModalOpen = false;
        }, { once: true });
    };
    const handleSave = async () => {
        const url = modalContainer.querySelector('#remote-url-input').value.trim();
        if (!url) { showNotification("L'URL est requise.", "error"); return; }
        try {
            await window.electronAPI.invoke('git:set-project-url', { projectPath: project.projectFolderPath, url });
            showNotification("Dépôt configuré.", "success");
            closeModal();
            await scanForProjects(); 
        } catch (e) { showNotification("Erreur configuration.", "error"); }
    };
    const template = html`
        <div class="modal-content" @click=${e => e.stopPropagation()} style="max-width: 500px;">
            <div class="modal-header-panel">
                <div class="modal-icon-large">🔗</div>
                <h2 class="modal-title">Lier à GitHub</h2>
                <p class="modal-subtitle">Pour <strong>${project.name}</strong></p>
            </div>
            <div class="modal-body-content" style="padding: 24px;">
                <div class="modal-form-group" style="margin:0;">
                    <label class="modal-label">URL HTTPS</label>
                    <input type="text" id="remote-url-input" class="modal-input" placeholder="https://github.com/user/repo.git" value="${project.remoteUrl || ''}">
                </div>
            </div>
            <div class="modal-actions">
                <button class="card-button btn-secondary" @click=${closeModal}>Annuler</button>
                <button class="card-button btn-primary" @click=${handleSave}>Enregistrer</button>
            </div>
        </div>`;
    render(template, modalContainer);
    requestAnimationFrame(() => modalContainer.classList.add('visible'));
}