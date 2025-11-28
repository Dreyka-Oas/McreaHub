// src/renderer/pages/settings-page.js

import { html } from '../../../node_modules/lit-html/lit-html.js';
import { classMap } from '../../../node_modules/lit-html/directives/class-map.js';
import { keyed } from '../../../node_modules/lit-html/directives/keyed.js';
import { state } from '../state.js';
import { applyTheme, applyAccentColor } from '../utils/dom.js'; 
import { renderApp } from '../app.js';
import { showNotification } from '../utils/notifications.js';
import { navConfig } from '../navigation-config.js';
import { t, setLocale } from '../i18n.js';
import { syncNotesFromGithub } from '../actions/note-actions.js';
import { scanForProjects } from '../actions/index.js'; 
import { resetConfigCache } from './mcreator-settings-page.js';

const iconGeneral = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98 1.196l-.324 1.623a6.006 6.006 0 01.934.618l1.538-.588a1 1 0 011.177.32l1.18 1.18a1 1 0 01.122 1.218l-.82 1.42a6.014 6.014 0 01.182 1.025l1.635.136a1 1 0 01.916.995v1.674a1 1 0 01-.916.995l-1.635.136a6.016 6.016 0 01-.182 1.025l.82 1.42a1 1 0 01-.122 1.218l-1.18 1.18a1 1 0 01-1.177.32l-1.538-.588a6.006 6.006 0 01-.934.618l.324 1.623A1 1 0 0111.18 19H8.82a1 1 0 01-.98-1.196l.324-1.623a6.006 6.006 0 01-.934-.618l-1.538.588a1 1 0 01-1.177-.32l-1.18-1.18a1 1 0 01-.122-1.218l.82-1.42a6.014 6.014 0 01-.182-1.025l-1.635-.136A1 1 0 011 11.337V9.663a1 1 0 01.916-.995l1.635-.136a6.016 6.016 0 01.182-1.025l-.82-1.42a1 1 0 01.122-1.218l1.18-1.18a1 1 0 011.177-.32l1.538.588a6.006 6.006 0 01.934-.618l-.324-1.623zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>`;
const iconAppearance = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.616a1 1 0 01.894-1.79l1.599.8L9 4.323V3a1 1 0 011-1z" clip-rule="evenodd" /></svg>`;
const iconIntegrations = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM5.555 17.776l8-16 .894.448-8 16-.894-.448z" clip-rule="evenodd" /></svg>`;
const iconLogout = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width:14px;height:14px"><path fill-rule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clip-rule="evenodd" /><path fill-rule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clip-rule="evenodd" /></svg>`;

function updateGliders() {
    const controls = document.querySelectorAll('.segmented-control');
    controls.forEach(control => {
        const activeBtn = control.querySelector('.active');
        const glider = control.querySelector('.segment-glider');
        if (activeBtn && glider) {
            const left = activeBtn.offsetLeft;
            const width = activeBtn.offsetWidth;
            glider.style.width = `${width}px`;
            glider.style.transform = `translateX(${left}px)`;
        }
    });
}
window.addEventListener('resize', updateGliders);

function toggleDropdown(event) {
    event.stopPropagation();
    const button = event.currentTarget;
    const menu = button.nextElementSibling;
    document.querySelectorAll('.filter-menu.active').forEach(m => m.classList.remove('active'));
    if (menu) {
        const isActive = menu.classList.toggle('active');
        if (isActive) {
            const closeMenu = () => {
                menu.classList.remove('active');
                document.removeEventListener('click', closeMenu);
            };
            document.addEventListener('click', closeMenu);
            const selectedItem = menu.querySelector('.selected');
            if (selectedItem) {
                setTimeout(() => selectedItem.scrollIntoView({ block: 'nearest', behavior: 'auto' }), 0);
            }
        }
    }
}

export function SettingsPage() {
  const { appSettings, githubUser, gitInstalled, gitLfsInstalled } = state;

  const defaultPageOptions = navConfig
    .filter(item => item.condition(state))
    .reduce((acc, item) => {
      acc[item.id] = item.label();
      return acc;
    }, {});
  
  if (!defaultPageOptions[appSettings.defaultPage]) {
    appSettings.defaultPage = 'projects';
    window.electronAPI.setSetting('defaultPage', 'projects');
  }

  const handleThemeChange = (newTheme) => {
    state.appSettings.theme = newTheme;
    window.electronAPI.setSetting('theme', newTheme);
    applyTheme(newTheme);
    renderApp(); 
    setTimeout(updateGliders, 50); 
  };

  const handleAccentModeChange = (newMode) => {
      handleSettingChange('accentColorMode', newMode);
      applyAccentColor(newMode, appSettings.accentColor);
      setTimeout(updateGliders, 50);
  };

  const handleAccentColorChange = (e) => {
      const newColor = e.target.value;
      handleSettingChange('accentColor', newColor);
      applyAccentColor('manual', newColor);
  };
  
  const handleSettingChange = (key, value) => {
    state.appSettings[key] = value;
    window.electronAPI.setSetting(key, value);
    if (key === 'runInBackground' && value === false && state.appSettings.startWithSystem) {
      state.appSettings.startWithSystem = false;
    }
    renderApp();
  };
  
  // --- CORRECTION : Empêcher de descendre en dessous de 1 ---
  const handleNumberScroll = (e, key) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY) * -1; 
      const currentVal = Number(appSettings[key]) || 1;
      const newVal = Math.max(1, currentVal + delta); 
      handleSettingChange(key, newVal);
  };

  const handleLanguageChange = async (newLang) => {
    handleSettingChange('language', newLang);
    let targetLocale = newLang;
    if (targetLocale === 'system') {
      targetLocale = await window.electronAPI.getAppLocale();
    }
    await setLocale(targetLocale);
    renderApp();
    setTimeout(updateGliders, 50); 
  };

  const handleTokenTest = async (event) => {
    const button = event.currentTarget;
    const spinner = button.querySelector('.spinner-small');
    const input = document.getElementById('github-token-input');
    const token = input.value;
    
    button.disabled = true;
    spinner.style.display = 'inline-block';

    const gitCheckPromise = window.electronAPI.checkGitInstalled();
    const result = await window.electronAPI.validateToken(token);
    
    const gitCheck = await gitCheckPromise;
    state.gitInstalled = gitCheck.installed;
    state.gitLfsInstalled = gitCheck.lfsInstalled;

    if (result.success) {
      showNotification(`Connecté en tant que ${result.user.login}`, 'success');
      state.githubUser = result.user;
      handleSettingChange('githubToken', token);
      state.ui.activeSync = true; 
      renderApp();
      
      const syncResult = await window.electronAPI.syncGlobal(token);
      
      if (syncResult.success) {
          console.log("[Settings] Synchro OK, rechargement de l'état...");
          
          const freshNotes = await window.electronAPI.getNotes();
          state.notes = freshNotes;
          
          const freshSources = await window.electronAPI.getProjectSources();
          state.projectSources = freshSources;
          
          await scanForProjects(false);
          
          const freshSettings = await window.electronAPI.getSettings();
          Object.assign(state.appSettings, freshSettings);
          applyTheme(state.appSettings.theme);
          applyAccentColor(state.appSettings.accentColorMode || 'system', state.appSettings.accentColor);
          
          resetConfigCache();
          
          if (syncResult.restoredCount > 0) {
              showNotification(`${syncResult.restoredCount} éléments restaurés.`, 'success');
          }
      }
      
      state.ui.activeSync = false;
      renderApp();
    } else {
      showNotification(`Token invalide : ${result.message}`, 'error');
      state.githubUser = null;
    }
    button.disabled = false;
    spinner.style.display = 'none';
    renderApp();
  };

  const handleTokenDelete = () => {
    const input = document.getElementById('github-token-input');
    window.electronAPI.setSetting('githubToken', '');
    state.githubUser = null;
    if (input) input.value = '';
    showNotification('Déconnecté.', 'info');
    renderApp();
  };

  const handleDefaultPageChange = (event, value) => {
    handleSettingChange('defaultPage', value);
    const menu = event.target.closest('.filter-menu');
    if (menu) menu.classList.remove('active');
  };

  const languageOptions = { 'fr': 'Français', 'en': 'English', 'system': t('settings.appearance.languageSystem') };

  requestAnimationFrame(() => setTimeout(updateGliders, 0));

  const isManualMode = appSettings.accentColorMode === 'manual';

  return html`
    <div class="page" id="settings-page">
      <div class="page-header"><h1 class="page-title">${t('settings.title')}</h1></div>
      <div class="page-content-scrollable">
        
        <div class="settings-grid">
          
          <!-- CARTE 1 : GÉNÉRAL -->
          <div class="settings-group-card">
            <div class="group-header">
                <div class="group-icon">${iconGeneral}</div>
                <span class="group-title">${t('settings.general.title')}</span>
            </div>

            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-label">${t('settings.general.startPage')}</div>
                <div class="setting-description">${t('settings.general.startPageDesc')}</div>
              </div>
              <div class="setting-control">
                <div class="filter-container">
                    <button class="filter-button" @click=${toggleDropdown}>
                        ${keyed(defaultPageOptions[appSettings.defaultPage], html`<span class="filter-value">${defaultPageOptions[appSettings.defaultPage]}</span>`)}
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="m5.22 8.22 4.25 4.25a.75.75 0 0 0 1.06 0l4.25-4.25a.75.75 0 0 0-1.06-1.06L10 10.94 6.28 7.16a.75.75 0 0 0-1.06 1.06Z" clip-rule="evenodd" /></svg>
                    </button>
                    <div class="filter-menu">
                        ${Object.entries(defaultPageOptions).map(([key, value]) => html`
                            <div class="filter-menu-item ${key === appSettings.defaultPage ? 'selected' : ''}" @click=${(e) => handleDefaultPageChange(e, key)}>${value}</div>
                        `)}
                    </div>
                </div>
              </div>
            </div>

            ${state.appConfig.features.concurrentDownloads ? html`
              <div class="setting-row">
                <div class="setting-text">
                  <div class="setting-label">${t('settings.general.maxConcurrentDownloads')}</div>
                  <div class="setting-description">${t('settings.general.maxConcurrentDownloadsDesc')}</div>
                </div>
                <div class="setting-control">
                  <!-- CORRECTION : min="1" ajouté au HTML -->
                  <input type="number" class="setting-input" min="1" 
                         .value=${appSettings.maxConcurrentDownloads} 
                         @change=${e => handleSettingChange('maxConcurrentDownloads', Math.max(1, Number(e.target.value)))}
                         @wheel=${e => handleNumberScroll(e, 'maxConcurrentDownloads')}>
                </div>
              </div>
            ` : ''}

            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-label">${t('settings.general.runInBackground')}</div>
                <div class="setting-description">${t('settings.general.runInBackgroundDesc')}</div>
              </div>
              <div class="setting-control">
                <label class="switch">
                  <input type="checkbox" .checked=${appSettings.runInBackground} @change=${e => handleSettingChange('runInBackground', e.target.checked)}>
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <div class="setting-row ${classMap({ 'disabled': !appSettings.runInBackground })}" title=${!appSettings.runInBackground ? "Option requiert fonctionnement en arrière-plan." : ""}>
              <div class="setting-text">
                <div class="setting-label">${t('settings.general.startWithSystem')}</div>
                <div class="setting-description">${t('settings.general.startWithSystemDesc')}</div>
              </div>
              <div class="setting-control">
                <label class="switch">
                  <input type="checkbox" .checked=${appSettings.startWithSystem} ?disabled=${!appSettings.runInBackground} @change=${e => handleSettingChange('startWithSystem', e.target.checked)}>
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>

          <!-- CARTE 2 : APPARENCE -->
          <div class="settings-group-card">
            <div class="group-header">
                <div class="group-icon">${iconAppearance}</div>
                <span class="group-title">${t('settings.appearance.title')}</span>
            </div>

            <!-- LANGUE -->
            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-label">${t('settings.appearance.language')}</div>
                <div class="setting-description">${t('settings.appearance.languageDesc')}</div>
              </div>
              <div class="setting-control">
                <div class="segmented-control">
                  <div class="segment-glider"></div>
                  ${Object.entries(languageOptions).map(([key, value]) => html`
                    <button class=${appSettings.language === key ? 'active' : ''} @click=${() => handleLanguageChange(key)}>${value}</button>
                  `)}
                </div>
              </div>
            </div>

            <!-- THÈME -->
            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-label">${t('settings.appearance.theme')}</div>
                <div class="setting-description">${t('settings.appearance.themeDesc')}</div>
              </div>
              <div class="setting-control">
                <div class="segmented-control">
                  <div class="segment-glider"></div>
                  ${['Light', 'Dark', 'System'].map(theme => html`
                    <button class=${appSettings.theme === theme ? 'active' : ''} @click=${() => handleThemeChange(theme)}>${theme}</button>
                  `)}
                </div>
              </div>
            </div>

            <!-- COULEUR D'ACCENTUATION -->
            <div class="setting-row">
              <div class="setting-text">
                <div class="setting-label">Couleur d'accentuation</div>
                <div class="setting-description">Personnalisez la couleur de l'interface.</div>
              </div>
              <div class="setting-control" style="gap: 10px;">
                 <div class="segmented-control">
                    <div class="segment-glider"></div>
                    <button class="${!isManualMode ? 'active' : ''}" @click=${() => handleAccentModeChange('system')}>Auto</button>
                    <button class="${isManualMode ? 'active' : ''}" @click=${() => handleAccentModeChange('manual')}>Manuel</button>
                 </div>
                 
                 <div style="position:relative; width:32px; height:32px; overflow:hidden; border-radius:50%; border:2px solid var(--color-separator); box-shadow:0 2px 5px rgba(0,0,0,0.2); 
                             transition: all 0.3s ease;
                             opacity: ${isManualMode ? 1 : 0.5}; 
                             filter: ${isManualMode ? 'none' : 'grayscale(100%)'};
                             pointer-events: ${isManualMode ? 'auto' : 'none'};">
                    <input type="color" .value=${appSettings.accentColor} @input=${handleAccentColorChange} ?disabled=${!isManualMode} style="position:absolute; top:-50%; left:-50%; width:200%; height:200%; padding:0; border:none; cursor:pointer;">
                 </div>
              </div>
            </div>

            ${state.appConfig.features.autoTranslateChangelog ? html`
              <div class="setting-row">
                <div class="setting-text">
                  <div class="setting-label">${t('settings.appearance.autoTranslate')}</div>
                  <div class="setting-description">${t('settings.appearance.autoTranslateDesc')}</div>
                </div>
                <div class="setting-control">
                  <label class="switch">
                    <input type="checkbox" .checked=${appSettings.autoTranslateChangelog} @change=${e => handleSettingChange('autoTranslateChangelog', e.target.checked)}>
                    <span class="slider"></span>
                  </label>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- CARTE 3 : INTÉGRATIONS (GitHub) -->
          ${state.appConfig.features.github ? html`
            <div class="settings-group-card">
                <div class="group-header">
                    <div class="group-icon">${iconIntegrations}</div>
                    <span class="group-title">${t('settings.integrations.title')}</span>
                </div>

                ${((!gitInstalled || !gitLfsInstalled) && appSettings.githubToken) ? html`
                    <div class="git-alert">
                        <div class="git-alert-title">⚠️ Git n'est pas détecté</div>
                        <div class="git-alert-body">
                            Veuillez installer Git et Git LFS pour la synchronisation.
                        </div>
                        <div class="git-alert-actions">
                            <button class="btn-alert" @click=${() => window.electronAPI.openExternalUrl('https://git-scm.com/downloads')}>Télécharger Git</button>
                            <button class="btn-alert" @click=${() => window.electronAPI.openExternalUrl('https://git-lfs.com')}>Télécharger Git LFS</button>
                        </div>
                    </div>
                ` : ''}

                <div class="setting-row ${classMap({ 'disabled': !!githubUser })}">
                    <div class="setting-text">
                        <div class="setting-label">${t('settings.integrations.githubToken')}</div>
                        <div class="setting-description">${t('settings.integrations.githubTokenDesc')}</div>
                    </div>
                    <div class="setting-control setting-control-token">
                        <div class="input-group">
                            <input type="password" id="github-token-input" placeholder="ghp_..." .value=${appSettings.githubToken} ?disabled=${!!githubUser}>
                            <button @click=${handleTokenTest} ?disabled=${!!githubUser}>
                                <span class="spinner-small" style="display: none;"></span>
                                Connexion
                            </button>
                        </div>
                    </div>
                </div>

                ${githubUser ? html`
                <div class="setting-row">
                    <div class="setting-text"><div class="setting-label">${t('settings.integrations.githubAccount')}</div></div>
                    <div class="setting-control" style="flex: 1; justify-content:flex-end;">
                      <div class="github-user-card">
                          <div class="user-info">
                              <img src="${githubUser.avatar_url}" class="github-avatar">
                              <span class="user-name">${githubUser.login}</span>
                          </div>
                          <button class="btn-disconnect" @click=${handleTokenDelete}>
                            ${iconLogout} Déconnexion
                          </button>
                      </div>
                    </div>
                </div>

                <div class="setting-row">
                    <div class="setting-text">
                        <div class="setting-label">${t('settings.integrations.syncNotes')}</div>
                        <div class="setting-description">${t('settings.integrations.syncNotesDesc')}</div>
                    </div>
                    <div class="setting-control">
                        <label class="switch">
                            <input type="checkbox" .checked=${appSettings.syncNotesToGithub !== false} @change=${e => handleSettingChange('syncNotesToGithub', e.target.checked)}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>

                <div class="setting-row">
                    <div class="setting-text">
                        <div class="setting-label">${t('settings.integrations.syncSettings')}</div>
                        <div class="setting-description">${t('settings.integrations.syncSettingsDesc')}</div>
                    </div>
                    <div class="setting-control">
                        <label class="switch">
                            <input type="checkbox" .checked=${appSettings.syncConfigToGithub !== false} @change=${e => handleSettingChange('syncConfigToGithub', e.target.checked)}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>

                <div class="setting-row">
                    <div class="setting-text">
                        <div class="setting-label">${t('settings.integrations.syncMCreator')}</div>
                        <div class="setting-description">${t('settings.integrations.syncMCreatorDesc')}</div>
                    </div>
                    <div class="setting-control">
                        <label class="switch">
                            <input type="checkbox" .checked=${appSettings.syncMCreatorConfigToGithub !== false} @change=${e => handleSettingChange('syncMCreatorConfigToGithub', e.target.checked)}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                ` : ''}
            </div>
          ` : ''}

        </div>
      </div>
    </div>
  `;
}