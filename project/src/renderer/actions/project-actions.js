// src/renderer/actions/project-actions.js

import { state } from '../state.js';
import { renderApp } from '../app.js';
import { showNotification } from '../utils/notifications.js';
import { showConfirmModal } from '../components/modal.js';

export async function scanForProjects(showLoader = true) {
  if (showLoader) { 
      state.ui.isLoading = true; 
      renderApp(); 
  }

  try {
    state.projects = await window.electronAPI.scanForProjects();
    return state.projects;
  } catch (error) {
    showNotification(`Erreur scan: ${error.message}`, 'error');
    state.projects = []; 
    return [];
  } finally {
    if (showLoader) { 
        state.ui.isLoading = false; 
    }
    renderApp();
  }
}

export function deleteProjectVersionAction(versionPath, versionName) {
    showConfirmModal({
        title: `Supprimer ${versionName} ?`,
        message: "Cette action supprimera définitivement le dossier de cette version.",
        confirmText: "Supprimer",
        confirmClass: 'btn-danger',
        onConfirm: async () => {
            state.ui.isLoading = true;
            renderApp();
            try {
                const result = await window.electronAPI.deleteProjectVersion(versionPath);
                if (result.success) {
                    showNotification(`Version ${versionName} supprimée.`, 'success');
                    await scanForProjects(false);
                } else {
                    showNotification(`Erreur : ${result.message}`, 'error');
                }
            } catch (error) {
                showNotification(`Erreur : ${error.message}`, 'error');
            } finally {
                state.ui.isLoading = false;
                renderApp();
            }
        }
    });
}

// --- NOUVEAU : CASCADE DE CONFIRMATIONS POUR SUPPRESSION TOTALE ---
export function deleteProjectFullAction(project) {
    // 1ère Confirmation
    showConfirmModal({
        title: `Supprimer le projet "${project.name}" ?`,
        message: "Attention : Cette action va supprimer tout le dossier du projet, y compris toutes les versions, backups et configurations.",
        confirmText: "Continuer la suppression",
        confirmClass: "btn-danger",
        onConfirm: () => {
            // 2ème Confirmation (avec petit délai pour l'animation)
            setTimeout(() => {
                showConfirmModal({
                    title: "Êtes-vous vraiment sûr ?",
                    message: "C'est votre dernière chance de faire marche arrière. Toutes les données locales seront perdues définitivement.",
                    confirmText: "Je comprends, continuer",
                    confirmClass: "btn-danger",
                    onConfirm: () => {
                         // 3ème Confirmation (Ultime)
                         setTimeout(() => {
                             showConfirmModal({
                                 title: "CONFIRMATION FINALE",
                                 message: `Supprimer DÉFINITIVEMENT "${project.name}" ?`,
                                 confirmText: "DÉTRUIRE LE PROJET",
                                 confirmClass: "btn-danger",
                                 onConfirm: async () => {
                                     state.ui.isLoading = true;
                                     renderApp();
                                     try {
                                         const result = await window.electronAPI.deleteProject(project.projectFolderPath);
                                         if (result.success) {
                                             showNotification(`Projet "${project.name}" supprimé.`, 'success');
                                             await scanForProjects(false);
                                         } else {
                                             showNotification(`Erreur : ${result.message}`, 'error');
                                         }
                                     } catch (err) {
                                         showNotification(`Erreur critique : ${err.message}`, 'error');
                                     } finally {
                                         state.ui.isLoading = false;
                                         renderApp();
                                     }
                                 }
                             });
                         }, 200);
                    }
                });
            }, 200);
        }
    });
}