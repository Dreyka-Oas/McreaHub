// src/main/managers/settings-manager.js

import Store from 'electron-store';
import SecretManager from './secret-manager.js';
import EventEmitter from 'events';

class SettingsManager extends EventEmitter {
  constructor(userDataPath) {
    super();
    this.secretManager = new SecretManager();
    this.cachedToken = null;

    this.store = new Store({
      name: 'mcreahub-config',
      defaults: {
        defaultPage: 'projects',
        theme: 'System',
        language: 'system',
        accentColorMode: 'system', 
        accentColor: '#0A84FF',
        
        animationsEnabled: true,
        cacheDurationMinutes: 360,
        maxConcurrentDownloads: 1,
        installPath: '',
        checkAppUpdates: true,
        scanProjectsOnStart: true,
        runInBackground: false,
        startWithSystem: false,
        autoTranslateChangelog: true,
        
        syncNotesToGithub: true,
        syncConfigToGithub: true,
        syncMCreatorConfigToGithub: true, 
        
        // Options de Backup
        maxBackups: 5,
        backupCompression: 9,

        // --- ORDRE MODIFIÉ ---
        sidebarOrder: [
            'projects', 
            'installed', 
            'notes', 
            'spacer-1', // Séparation ici
            'mcreatorSettings', 
            'versions', 
            'changelog', 
            'settings'
        ],

        windowState: {
            width: 1600,
            height: 1000,
            x: undefined,
            y: undefined,
            isMaximized: false
        }
      },
    });
    console.log(`[SettingsManager] Config chargée.`);
    this.migrateTokenFromStore();
  }
  
  async migrateTokenFromStore() {
      if (this.store.has('githubToken')) {
          const oldToken = this.store.get('githubToken');
          if (oldToken) {
              await this.secretManager.setGithubToken(oldToken);
              this.cachedToken = oldToken;
              this.store.delete('githubToken');
          }
      }
  }

  async getSettings() {
    const settings = this.store.store;
    if (this.cachedToken === null) {
        this.cachedToken = await this.secretManager.getGithubToken() || '';
    }
    settings.githubToken = this.cachedToken;
    return settings;
  }
  
  getWindowState() { return this.store.get('windowState'); }
  setWindowState(state) { this.store.set('windowState', state); }

  set(key, value) {
    if (key === 'githubToken') {
        this.secretManager.setGithubToken(value);
        this.cachedToken = value;
    } else {
        this.store.set(key, value);
    }
    
    this.emit('setting-changed', { key, value });

    if (key === 'runInBackground' && value === false) {
      if (this.store.get('startWithSystem') === true) {
        this.store.set('startWithSystem', false);
        this.emit('setting-changed', { key: 'startWithSystem', value: false });
      }
    }
  }

  setMany(settingsObj) {
      if (!settingsObj) return;
      for (const [key, value] of Object.entries(settingsObj)) {
          if (key !== 'githubToken') {
              this.store.set(key, value);
          }
      }
      console.log('[SettingsManager] Configuration restaurée depuis le cloud.');
  }
}

export default SettingsManager;