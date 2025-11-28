// src/renderer/actions/app-actions.js

import { state } from '../state.js';
import { renderApp } from '../app.js';
import { showNotification } from '../utils/notifications.js';
import { applyTheme, applyAccentColor } from '../utils/dom.js';
import { scanForProjects } from './project-actions.js'; 
import { setLocale } from '../i18n.js';
import { syncNotesFromGithub, loadNotes } from './note-actions.js'; // Gardé pour import mais pas utilisé au boot

let gitPollingInterval = null;

function startGitPolling() {
    if (gitPollingInterval) clearInterval(gitPollingInterval);
    const checkGit = async () => {
        if (!state.appConfig.features.github) return;
        try {
            const result = await window.electronAPI.checkGitInstalled();
            if (state.gitInstalled !== result.installed || state.gitLfsInstalled !== result.lfsInstalled) {
                state.gitInstalled = result.installed;
                state.gitLfsInstalled = result.lfsInstalled;
                renderApp();
            }
        } catch (e) { console.warn("[Git Polling] Erreur", e); }
    };
    checkGit();
    gitPollingInterval = setInterval(checkGit, 5000);
}

export async function initializeApp() {
  console.log('[Action] Initialisation de l\'application...');
  
  try {
    if (state.appConfig.features.github) {
        const gitCheck = await window.electronAPI.checkGitInstalled();
        state.gitInstalled = gitCheck.installed;
        state.gitLfsInstalled = gitCheck.lfsInstalled;
    }

    const settings = await window.electronAPI.getSettings();
    state.appSettings = settings;

    let targetLocale = settings.language;
    if (targetLocale === 'system') {
      targetLocale = await window.electronAPI.getAppLocale();
    }
    await setLocale(targetLocale);

  } catch (error) {
    console.error("Erreur critique init:", error);
    await setLocale('en');
  }

  renderApp();

  try {
    applyTheme(state.appSettings.theme);
    await applyAccentColor(state.appSettings.accentColorMode || 'system', state.appSettings.accentColor);
    
    if (state.appSettings.versionsFilter) Object.assign(state.ui.versionsFilter, state.appSettings.versionsFilter);
    if (state.appSettings.defaultPage) state.activePage = state.appSettings.defaultPage;
    
    if (state.appConfig.features.github) startGitPolling();
    
    if (state.appConfig.features.github && state.appSettings.githubToken) {
        const tokenResult = await window.electronAPI.validateToken(state.appSettings.githubToken);
        if (tokenResult.success) {
            state.githubUser = tokenResult.user;
            // --- MODIFICATION : ON A SUPPRIMÉ syncNotesFromGithub() ICI ---
            // La sync ne se fera que manuellement ou à la connexion dans les paramètres
        }
    }

    const [installed, sources, cachedReleases, mcreatorConfigExists] = await Promise.all([
      window.electronAPI.getInstalledVersions(),
      window.electronAPI.getProjectSources(),
      window.electronAPI.getReleases(false),
      window.electronAPI.checkMCreatorConfigExists(),
    ]);

    state.installedVersions = installed;
    state.projectSources = sources;
    state.mcreatorConfigExists = mcreatorConfigExists;
    if (cachedReleases.success) {
      state.allVersions = cachedReleases.data;
      state.ui.lastSyncInfo = { timestamp: cachedReleases.timestamp, fromCache: true };
    }
    
    renderApp();

  } catch (error) {
    console.error("Erreur phase 2:", error);
    showNotification(`Erreur au démarrage : ${error.message}`, 'error');
  }

  state.ui.isLoading = true;
  renderApp();

  try {
    const [freshReleases, projects] = await Promise.all([
        window.electronAPI.getReleases(true),
        window.electronAPI.scanForProjects(false),
    ]);

    if (freshReleases.success) {
        state.allVersions = freshReleases.data;
        state.ui.lastSyncInfo = { timestamp: freshReleases.timestamp, fromCache: freshReleases.fromCache || false };
    }
    state.projects = projects;
    
  } catch (error) {
    console.error("Erreur phase 2 background:", error);
  } finally {
    state.ui.isLoading = false;
    renderApp();
  }
}

export function navigateTo(page) {
  if (state.activePage === page || state.ui.pageTransitionState !== 'idle') {
    return;
  }

  if (state.activePage === 'changelog') {
      window.electronAPI.abortTranslation().catch(() => {});
  }

  const animationDuration = 200;
  state.ui.pageTransitionState = 'exiting';
  renderApp();
  setTimeout(() => {
    state.activePage = page;
    state.ui.pageTransitionState = 'entering';
    renderApp();
    requestAnimationFrame(() => {
      state.ui.pageTransitionState = 'entering-active';
      renderApp();
    });
    setTimeout(() => {
      state.ui.pageTransitionState = 'idle';
      renderApp();
    }, animationDuration);
  }, animationDuration);
}