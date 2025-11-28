// src/main/ipc-handlers.js

import { ipcMain, app, dialog, shell, systemPreferences } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { translateTextWithPrivacy, translateStream } from './utils/translator.js';
import InstallationManager from './managers/installation-manager.js';
import ProjectManager from './managers/project-manager.js';
import MCreatorConfigManager from './managers/mcreator-config-manager.js';
import GitHubApiManager from './managers/github-api-manager.js';
import GitManager from './managers/git-manager.js';

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Helper pour trouver une clé sans se soucier des majuscules/minuscules
function findDataByKey(data, targetKey) {
    if (!data) return null;
    const foundKey = Object.keys(data).find(k => k.toLowerCase() === targetKey.toLowerCase());
    return foundKey ? data[foundKey] : null;
}

export async function initializeIpcHandlers(mainWindow, settingsManager, installationManager, logToRenderer, config) {
    const log = (msg) => {
        console.log(msg);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('log-message', msg);
        }
    };

    const githubApiManager = new GitHubApiManager(settingsManager, app.getPath('userData'), log);
    const mcreatorConfigManager = new MCreatorConfigManager(settingsManager, githubApiManager);
    const projectManager = new ProjectManager(app.getPath('userData'), settingsManager, githubApiManager);
    const gitManager = new GitManager(settingsManager, mainWindow);
    
    projectManager.setGitManager(gitManager);
    
    const sendNotification = (message, type = 'info') => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('app:notification', { message, type });
        }
    };

    console.log('[IPC] Gestionnaires prêts.');

    const debouncedSettingsSync = debounce(async () => {
        const s = await settingsManager.getSettings();
        if (s.githubToken && s.syncConfigToGithub !== false) {
            await githubApiManager.syncGlobalGist({ settings: s }, 'push');
        }
    }, 2000);

    settingsManager.on('setting-changed', ({ key, value }) => {
        if (key !== 'githubToken' && !key.startsWith('windowState')) {
            debouncedSettingsSync();
        }
    });

    let notesManagerInstance = null;
    const getNotesManager = async () => {
        if (!notesManagerInstance) {
            const { default: NotesManager } = await import('./managers/notes-manager.js');
            notesManagerInstance = new NotesManager(app.getPath('userData'), settingsManager, githubApiManager);
        }
        return notesManagerInstance;
    };

    let backupManagerInstance = null;
    const getBackupManager = async () => {
        if (!backupManagerInstance) {
            const { default: BackupManager } = await import('./managers/backup-manager.js');
            backupManagerInstance = new BackupManager(mainWindow);
        }
        return backupManagerInstance;
    };

    // --- GLOBAL RESTORE/SYNC (Gist) ---
    ipcMain.handle('sync:global', async (e, tokenOverride = null) => {
        const settings = await settingsManager.getSettings();
        if (tokenOverride) { settings.githubToken = tokenOverride; settingsManager.cachedToken = tokenOverride; }
        if (!settings.githubToken) return { success: false, message: "Non connecté" };
        
        const downloadResult = await githubApiManager.syncGlobalGist(null, 'pull', tokenOverride);
        let restoredCount = 0;
        if (downloadResult.success && downloadResult.data) {
            const notes = findDataByKey(downloadResult.data, "mcreahub-notes.json");
            const appConfig = findDataByKey(downloadResult.data, "mcreahub-settings.json");
            const sources = findDataByKey(downloadResult.data, "mcreahub-sources.json");
            const mcConfig = findDataByKey(downloadResult.data, "mcreahub-mcreator-config.json");

            if (notes && Array.isArray(notes) && settings.syncNotesToGithub !== false) { const nm = await getNotesManager(); await nm.saveLocalOnly(notes); restoredCount++; }
            if (appConfig && settings.syncConfigToGithub !== false) { const merged = { ...settings, ...appConfig, githubToken: settings.githubToken }; settingsManager.setMany(merged); restoredCount++; }
            if (sources && settings.syncConfigToGithub !== false) { await projectManager.saveSources(sources); restoredCount++; }
            if (mcConfig && settings.syncMCreatorConfigToGithub !== false) { await mcreatorConfigManager.writeConfig(mcConfig); restoredCount++; }
        }
        if (!tokenOverride) {
            const payload = {};
            if (settings.syncNotesToGithub !== false) payload.notes = await (await getNotesManager()).getNotes();
            if (settings.syncConfigToGithub !== false) { payload.settings = await settingsManager.getSettings(); payload.sources = await projectManager.getSources(); }
            if (settings.syncMCreatorConfigToGithub !== false) { payload.mcreatorConfig = await mcreatorConfigManager.readConfig(); }
            if (Object.keys(payload).length > 0) await githubApiManager.syncGlobalGist(payload, 'push'); 
        }
        return { success: true, restoredCount };
    });

    ipcMain.handle('app:get-system-accent', () => { if (process.platform === 'win32' || process.platform === 'darwin') return systemPreferences.getAccentColor(); return null; });

    if (__FEATURE_GITHUB__) {
        ipcMain.handle('git:check-install', async () => gitManager.checkGitInstalled());
        ipcMain.handle('github:validate-token', (e, t) => githubApiManager.validateToken(t));
        ipcMain.handle('git:set-project-url', async (e, { projectPath, url }) => projectManager.setProjectRemoteUrl(projectPath, url));
        
        ipcMain.handle('git:check-project-status', async (e, projectPath) => {
            const remoteUrl = await projectManager.getProjectRemoteUrl(projectPath);
            if (!remoteUrl) return { success: false, message: "Pas d'URL distante" };
            try {
                const entries = await fs.readdir(projectPath, { withFileTypes: true });
                const versionFolders = entries.filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'backups');
                const localVersions = versionFolders.map(f => f.name);
                const statuses = [];
                for (const folder of versionFolders) {
                    const versionPath = path.join(projectPath, folder.name);
                    const status = await gitManager.getVersionStatus(versionPath, remoteUrl, folder.name);
                    if (status.localChanges || status.commitsBehind > 0 || status.commitsAhead > 0 || status.status === 'new') { statuses.push({ name: folder.name, ...status }); }
                }
                if (versionFolders.length > 0) {
                    const cwd = path.join(projectPath, versionFolders[0].name);
                    const remoteBranches = await gitManager.getRemoteBranchesList(cwd, remoteUrl);
                    const orphans = remoteBranches.filter(b => !localVersions.includes(b));
                    for (const orphan of orphans) { statuses.push({ name: orphan, status: 'orphan', message: "Branche distante obsolète" }); }
                }
                return { success: true, statuses };
            } catch (err) { return { success: false, message: err.message }; }
        });

        ipcMain.handle('git:check-version-status', async (e, { projectPath, versionName }) => {
            const remoteUrl = await projectManager.getProjectRemoteUrl(projectPath);
            if (!remoteUrl) return { success: false, message: "Pas d'URL distante" };
            const versionPath = path.join(projectPath, versionName);
            const status = await gitManager.getVersionStatus(versionPath, remoteUrl, versionName);
            return { success: true, status: { name: versionName, ...status } };
        });

        ipcMain.handle('git:sync-project', async (e, projectPath) => { 
             const settings = await settingsManager.getSettings();
             const remoteUrl = await projectManager.getProjectRemoteUrl(projectPath);
             if (!remoteUrl) return { success: false, message: "Pas d'URL" };
             const user = await githubApiManager.validateToken(settings.githubToken);
             const author = { name: user.user.login, email: user.user.email || "user@noreply.github.com" };
             // Boucle sur les versions
             const entries = await fs.readdir(projectPath, { withFileTypes: true });
             const versionFolders = entries.filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'backups');
             const localVersions = versionFolders.map(f => f.name);
             await gitManager.ensureMainBranch(remoteUrl, path.basename(projectPath), localVersions, author);
             let successCount = 0;
             for (const folder of versionFolders) {
                 const res = await gitManager.syncVersionToBranch(path.join(projectPath, folder.name), remoteUrl, folder.name, "Sync McreaHub", author);
                 if (res.success) successCount++;
             }
             return { success: true, message: `${successCount} versions synchronisées.` };
        });
        
        ipcMain.handle('git:sync-version', async (e, d) => {
             const settings = await settingsManager.getSettings();
             const remoteUrl = await projectManager.getProjectRemoteUrl(d.projectPath);
             if (!remoteUrl) return { success: false, message: "Pas d'URL" };
             const user = await githubApiManager.validateToken(settings.githubToken);
             const author = { name: user.user.login, email: user.user.email || "user@noreply.github.com" };
             return await gitManager.syncVersionToBranch(path.join(d.projectPath, d.versionName), remoteUrl, d.versionName, "Sync", author);
        });

        ipcMain.handle('git:clone', async (e, { repoUrl, destinationPath }) => {
            const result = await gitManager.cloneProject(repoUrl, destinationPath);
            if (result.success) { await projectManager.scanAllSourcesForProjects(); }
            return result;
        });

        ipcMain.handle('git:get-ignore', async (e, folderPath) => { return await gitManager.getGitIgnoreContent(folderPath); });
        ipcMain.handle('git:save-ignore', async (e, { path, content }) => { return await gitManager.saveGitIgnoreContent(path, content); });
    }
    
    ipcMain.handle('app:get-name', () => app.getName());
    ipcMain.handle('app:get-locale', () => app.getLocale());
    let activeTranslationController = null;
    ipcMain.handle('translate:abort', () => { if (activeTranslationController) { activeTranslationController.abort(); activeTranslationController = null; } return { success: true }; });
    ipcMain.handle('translate:text', async (e, { text, targetLang }) => { try { const translated = await translateTextWithPrivacy(text, targetLang); return { success: true, text: translated }; } catch (err) { return { success: false, error: err.message }; } });
    ipcMain.handle('translate:stream', async (event, { lines, targetLang }) => { try { if (activeTranslationController) activeTranslationController.abort(); activeTranslationController = new AbortController(); const currentSignal = activeTranslationController.signal; await translateStream(lines, targetLang, (partialResult) => { if (!event.sender.isDestroyed() && !currentSignal.aborted) { event.sender.send('translate:partial', partialResult); } }, logToRenderer, currentSignal); if (activeTranslationController && activeTranslationController.signal === currentSignal) activeTranslationController = null; return { success: true }; } catch (error) { return { success: false, error: error.message }; } });
    
    ipcMain.handle('versions:get-releases', (e, f) => githubApiManager.getReleases(f));
    ipcMain.handle('versions:get-installed', () => installationManager.getInstalledVersions());
    ipcMain.handle('versions:launch', (e, v) => installationManager.launchVersion(v));
    ipcMain.handle('versions:uninstall', (e, v) => installationManager.uninstallVersion(v));
    ipcMain.on('versions:download', (e, v) => installationManager.addToDownloadQueue(v));
    
    ipcMain.handle('settings:get', () => settingsManager.getSettings());
    ipcMain.on('settings:set', (e, k, v) => settingsManager.set(k, v));
    ipcMain.handle('settings:get-default-install-path', () => path.join(app.getPath('userData'), 'versions'));
    
    ipcMain.handle('mcreator:get-config', () => mcreatorConfigManager.readConfig());
    ipcMain.on('mcreator:set-config', (e, c) => mcreatorConfigManager.writeConfig(c));
    ipcMain.handle('mcreator:get-config-path', () => mcreatorConfigManager.configPath);
    ipcMain.handle('mcreator:check-config-exists', async () => { try { await fs.access(mcreatorConfigManager.configPath); return true; } catch { return false; } });
    
    ipcMain.handle('projects:get-sources', () => projectManager.getSources());
    ipcMain.handle('projects:add-source', async (e, s) => { const sources = await projectManager.addSource(s); const settings = await settingsManager.getSettings(); if (settings.githubToken && settings.syncConfigToGithub !== false) { const res = await githubApiManager.syncGlobalGist({ sources: sources }, 'push'); if (res.success) sendNotification('Source ajoutée et synchronisée', 'success'); } else { sendNotification('Source ajoutée', 'info'); } return sources; });
    ipcMain.handle('projects:remove-source', async (e, s) => { const sources = await projectManager.removeSource(s); const settings = await settingsManager.getSettings(); if (settings.githubToken && settings.syncConfigToGithub !== false) { githubApiManager.syncGlobalGist({ sources: sources }, 'push'); sendNotification('Source retirée', 'info'); } return sources; });
    ipcMain.handle('projects:launch', (e, d) => installationManager.launchProject(d));
    ipcMain.handle('projects:scan-for-projects', () => projectManager.scanAllSourcesForProjects());
    ipcMain.handle('projects:create-project-folder', (e, d) => projectManager.createProjectFolder(d));
    ipcMain.handle('projects:create-subfolder', (e, d) => projectManager.createProjectSubfolder(d));
    ipcMain.handle('projects:delete-version', (e, versionPath) => projectManager.deleteProjectVersion(versionPath));
    ipcMain.handle('projects:delete-project', (e, projectPath) => projectManager.deleteProject(projectPath));
    
    if (config.features.notes) { 
        ipcMain.handle('notes:get', async () => (await getNotesManager()).getNotes()); 
        ipcMain.handle('notes:save', async (e, notes) => { await (await getNotesManager()).saveNotes(notes); });
        ipcMain.handle('notes:sync', async () => (await getNotesManager()).syncFromGitHub()); 
    }
    
    if (config.features.backups) { 
        ipcMain.handle('backup:list', async (e, p) => (await getBackupManager()).listBackups(p)); 
        ipcMain.handle('backup:create', async (e, d) => (await getBackupManager()).createBackup(d.projectPath, d.maxBackups, d.compressionLevel)); 
        ipcMain.handle('backup:delete', async (e, p) => (await getBackupManager()).deleteBackup(p)); 
        ipcMain.handle('backup:restore', async (e, d) => (await getBackupManager()).restoreBackup(d.projectPath, d.backupPath)); 
    }
    
    ipcMain.handle('util:select-directory', async () => { const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] }); return canceled ? null : filePaths[0]; });
    ipcMain.handle('util:open-path', (e, p) => shell.showItemInFolder(p));
    ipcMain.handle('util:open-external-url', (e, url) => { if (!url || typeof url !== 'string') return; try { const p = new URL(url); if (['http:', 'https:'].includes(p.protocol)) shell.openExternal(url); } catch {} });
    ipcMain.handle('changelog:get', (e, f) => githubApiManager.getChangelog(f));
}