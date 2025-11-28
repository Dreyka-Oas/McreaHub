// src/main/managers/mcreator-config-manager.js

import path from 'path';
import fs from 'fs/promises';
import os from 'os';

class MCreatorConfigManager {
  // MODIFICATION : Injection
  constructor(settingsManager, githubApiManager) {
    this.configPath = path.join(os.homedir(), '.mcreator', 'userpreferences');
    this.settingsManager = settingsManager;
    this.githubApiManager = githubApiManager;
    console.log(`[MCreatorConfigManager] Chemin cible : ${this.configPath}`);
  }

  async readConfig() {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn('[MCreatorConfigManager] Fichier non trouvé.');
        return null;
      }
      console.error('[MCreatorConfigManager] Erreur lecture :', error);
      throw error;
    }
  }

  async writeConfig(newConfig) {
    try {
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });
      const content = JSON.stringify(newConfig, null, 2);
      await fs.writeFile(this.configPath, content, 'utf-8');
      
      // --- NOUVEAU : SYNCHRO AUTO ---
      this._trySyncToGithub(newConfig);

      console.log('[MCreatorConfigManager] Sauvegardé.');
      return { success: true };
    } catch (error) {
      console.error('[MCreatorConfigManager] Erreur écriture :', error);
      return { success: false, message: error.message };
    }
  }

  async _trySyncToGithub(configData) {
      try {
          if (!this.settingsManager || !this.githubApiManager) return;
          const settings = await this.settingsManager.getSettings();
          // Vérification de l'option
          const isSyncEnabled = settings.syncMCreatorConfigToGithub !== false;
          
          if (settings.githubToken && isSyncEnabled) {
              console.log('[MCreatorConfigManager] Synchro vers GitHub...');
              await this.githubApiManager.syncGlobalGist({ mcreatorConfig: configData }, 'push');
          }
      } catch (e) { console.error('[MCreatorConfigManager] Sync Error:', e); }
  }
}

export default MCreatorConfigManager;