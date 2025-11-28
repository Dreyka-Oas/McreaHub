// src/renderer/renderer.js

import { initializeApp, updateDownloadProgress, handleDownloadComplete, handleDownloadError, scanForProjects, initBackupListeners } from './actions/index.js';
import { hideStartupLoader } from './utils/dom.js';
import { state } from './state.js';
import { renderApp } from './app.js';
import { initTooltipSystem } from './utils/tooltip-manager.js';
import { showNotification } from './utils/notifications.js';

document.addEventListener('dragover', (event) => event.preventDefault());
document.addEventListener('drop', (event) => event.preventDefault());

window.electronAPI.onLogMessage((message) => { console.log('[BACKEND]', message); });

// --- AJOUT : Écoute des notifications venant du backend ---
window.electronAPI.onNotification(({ message, type }) => {
    showNotification(message, type);
});

window.electronAPI.onDownloadProgress(updateDownloadProgress);
window.electronAPI.onDownloadComplete(handleDownloadComplete);
window.electronAPI.onDownloadError(handleDownloadError);

window.electronAPI.onProjectsUpdated(() => {
    console.log('[Renderer] Changement détecté sur le disque. Actualisation silencieuse...');
    scanForProjects(false);
});

if (window.electronAPI.onGitProgress) {
    window.electronAPI.onGitProgress(({ path, phase, percent }) => {
        console.log(`[GIT] Projet: ${path} | Action: ${phase} | Progression: ${Math.round(percent * 100)}%`);

        if (phase === 'Done' || percent >= 1) {
             state.ui.gitOperations[path] = { phase: 'Terminé', percent: 1 };
             renderApp();
             setTimeout(() => {
                 delete state.ui.gitOperations[path];
                 renderApp();
             }, 2000);
        } else {
             state.ui.gitOperations[path] = { phase, percent };
             renderApp();
        }
    });
}

initBackupListeners();

window.electronAPI.onAppFocused(async () => {
  console.log('[Renderer] L\'application a été réactivée.');
  await scanForProjects(false);
  const configExists = await window.electronAPI.checkMCreatorConfigExists();
  if (configExists !== state.mcreatorConfigExists) {
    state.mcreatorConfigExists = configExists;
    renderApp();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  const appName = await window.electronAPI.getAppName();
  document.title = appName;
  
  initTooltipSystem();
  
  await initializeApp();
  hideStartupLoader();
  console.log('[Renderer] Initialisation terminée. L\'application est prête.');
});