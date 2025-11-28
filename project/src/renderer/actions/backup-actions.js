// src/renderer/actions/backup-actions.js

import { state } from '../state.js';
import { renderApp } from '../app.js';
import { showNotification } from '../utils/notifications.js';
import { scanForProjects } from './project-actions.js';

export function initBackupListeners() {
    // Listener Création
    if (window.electronAPI.onBackupProgress) {
        window.electronAPI.onBackupProgress(({ projectId, percent, isRunning }) => {
            if (isRunning) {
                state.ui.activeBackups[projectId] = { percent, isRunning: true };
            } else {
                delete state.ui.activeBackups[projectId];
            }
            renderApp();
        });
    }
    
    // Listener Restauration (Si supporté par preload)
    // Le backend envoie 'backup:restore-progress'. On peut l'écouter via log-message ou un channel dédié
    // Ici, on compte sur l'état UI mis à jour par l'action elle-même pour l'instant T
}

export async function createBackup(projectPath) {
    const settings = state.appSettings;
    const maxBackups = settings.maxBackups || 5;
    const compressionLevel = settings.backupCompression !== undefined ? settings.backupCompression : 9;

    state.ui.activeBackups[projectPath] = { percent: 0, isRunning: true };
    renderApp();
    
    try {
        const result = await window.electronAPI.createBackup({ projectPath, maxBackups, compressionLevel });
        showNotification('Sauvegarde terminée avec succès !', 'success');
    } catch (error) {
        showNotification(`Erreur sauvegarde: ${error.message}`, 'error');
    } finally {
        delete state.ui.activeBackups[projectPath];
        renderApp();
    }
}

export async function deleteBackup(backupPath, projectPath, refreshCallback) {
    try {
        await window.electronAPI.deleteBackup(backupPath);
        if (refreshCallback) await refreshCallback();
    } catch (error) {
        showNotification(`Erreur suppression: ${error.message}`, 'error');
    }
}

// --- RESTAURATION ---
export async function restoreBackup(project, backupPath) {
    console.log('>>> [ACTION] restoreBackup appelée !');
    console.log('>>> Projet :', project.name);
    console.log('>>> Zip :', backupPath);

    // 1. Feedback Visuel Immédiat
    state.ui.activeRestoration = { 
        projectName: project.name,
        percent: 0.1 
    };
    renderApp();

    try {
        console.log('>>> [ACTION] Envoi IPC...');
        const result = await window.electronAPI.restoreBackup({ 
            projectPath: project.projectFolderPath, 
            backupPath: backupPath 
        });
        console.log('>>> [ACTION] Retour IPC:', result);

        if (result.success) {
            // Force 100% pour l'animation
            if (state.ui.activeRestoration) state.ui.activeRestoration.percent = 1;
            renderApp();
            
            showNotification('Projet restauré avec succès !', 'success');
            await scanForProjects(false);
        } else {
            showNotification(`Erreur restauration: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('>>> [ACTION] Exception:', error);
        showNotification(`Erreur critique: ${error.message}`, 'error');
    } finally {
        // Délai avant de cacher la barre
        setTimeout(() => {
            state.ui.activeRestoration = null;
            renderApp();
        }, 1500);
    }
}