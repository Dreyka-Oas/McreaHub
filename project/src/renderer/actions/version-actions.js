// src/renderer/actions/version-actions.js

import { state } from '../state.js';
import { renderApp } from '../app.js';
import { showNotification } from '../utils/notifications.js';
import { showConfirmModal } from '../components/modal.js';
import { navigateTo } from './app-actions.js';
import { throttle } from '../utils/dom.js';

const throttledRender = throttle(renderApp, 100);

export function updateDownloadProgress(progress) {
  state.ui.downloads[progress.name] = progress;
  throttledRender();
}

export async function handleDownloadComplete(versionName) {
  delete state.ui.downloads[versionName];
  state.installedVersions = await window.electronAPI.getInstalledVersions();
  showNotification(`${versionName} a été installé avec succès !`, 'success');
  renderApp();
}

export function handleDownloadError({ name, error }) {
  delete state.ui.downloads[name];
  showNotification(`Échec pour ${name}: ${error}`, 'error');
  renderApp();
}

export function downloadVersion(version) {
  state.ui.downloads[version.name] = { status: 'pending', percent: 0 };
  renderApp();
  window.electronAPI.downloadVersion(version);
  showNotification(`Début du téléchargement de ${version.name}.`, 'info');
}

export async function uninstallVersion(versionName) {
    // --- UX OPTIMISTE : ON SUPPRIME TOUT DE SUITE ---
    // On sauvegarde l'état actuel au cas où ça échoue
    const previousInstallations = { ...state.installedVersions };
    
    // On retire visuellement la version immédiatement
    delete state.installedVersions[versionName];
    
    // On met à jour l'UI tout de suite pour une sensation de vitesse instantanée
    if (state.activePage === 'installed' && Object.keys(state.installedVersions).length === 0) {
        navigateTo('versions');
    } else {
        renderApp();
    }

    // On lance l'opération réelle en arrière-plan
    try {
        const result = await window.electronAPI.uninstallVersion(versionName);
        
        if (result.success) {
            showNotification(`${versionName} a été désinstallé.`, 'success');
            // Pas besoin de renderApp ici, c'est déjà fait !
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        // --- ROLLBACK EN CAS D'ERREUR ---
        console.error("Erreur de désinstallation, restauration de l'état...", error);
        
        // On remet les données comme avant
        state.installedVersions = previousInstallations;
        
        showNotification(`Erreur de désinstallation : ${error.message}`, 'error');
        renderApp(); // On ré-affiche la carte qui avait disparu
    }
}

export function launchVersionAction(versionName) {
  if (state.ui.launchingVersions.has(versionName)) {
    return;
  }
  state.ui.launchingVersions.add(versionName);
  renderApp();
  window.electronAPI.launchVersion(versionName);
  showNotification(`Lancement de ${versionName}...`, 'info');
  setTimeout(() => {
    state.ui.launchingVersions.delete(versionName);
    renderApp();
  }, 8000);
}

export function setVersionsFilter(filterType, value) {
  if (state.ui.versionsFilter[filterType] !== value) {
    state.ui.versionsFilter[filterType] = value;
    window.electronAPI.setSetting('versionsFilter', state.ui.versionsFilter);
    renderApp();
  }
}

export function refreshReleases() {
    showConfirmModal({
        title: "Actualiser les versions ?",
        message: "Cette action interroge l'API de GitHub et est soumise à des limites de taux. Une utilisation excessive peut entraîner un blocage temporaire.",
        confirmText: "Forcer l'actualisation",
        confirmClass: 'btn-danger',
        onConfirm: async () => {
            state.ui.isLoading = true;
            renderApp();
            try {
                const result = await window.electronAPI.getReleases(true);
                if (result.success) {
                    state.allVersions = result.data;
                    state.ui.lastSyncInfo = { timestamp: result.timestamp, fromCache: false };
                    showNotification('Liste des versions actualisée.', 'success');
                } else {
                    throw new Error(result.reason || 'Réponse invalide');
                }
            } catch(error) {
                showNotification(`Erreur : ${error.message}`, 'error');
            } finally {
                state.ui.isLoading = false;
                renderApp();
            }
        }
    });
}