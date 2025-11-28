// src/main/managers/github-api-manager.js

import path from 'path';
import fs from 'fs/promises';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

class GitHubApiManager {
  constructor(settingsManager, userDataPath, logToRenderer) {
    this.settingsManager = settingsManager;
    this.releasesCacheFile = path.join(userDataPath, 'github-releases-cache.json');
    this.changelogCacheFile = path.join(userDataPath, 'mcreator-changelog-cache.json');
    this.log = logToRenderer || console.log;
  }

  async validateToken(token) {
    if (!token) return { success: false, message: 'Token vide' };
    try {
        const response = await fetch('https://api.github.com/user', { headers: { 'Authorization': `token ${token}` } });
        if (!response.ok) throw new Error(`Erreur ${response.status}`);
        const userData = await response.json();
        return { success: true, user: { login: userData.login, avatar_url: userData.avatar_url, email: userData.email } };
    } catch (error) { return { success: false, message: error.message }; }
  }

  _tryFixCorruptedJson(jsonString) {
      try {
          return JSON.parse(jsonString);
      } catch (e) {
          try {
              const fixedString = jsonString.replace(/"(\w+)""\1":/g, '"$1":');
              return JSON.parse(fixedString);
          } catch (e2) {
              return null;
          }
      }
  }

  async syncGlobalGist(payload, mode = 'push', tokenOverride = null) {
      let token = tokenOverride;

      if (!token) {
          if (payload && payload.settings && payload.settings.githubToken) {
              token = payload.settings.githubToken;
          } else {
              const s = await this.settingsManager.getSettings();
              token = s.githubToken;
          }
      }

      if (!token) return { success: false, message: "Pas de token" };

      const GIST_DESC = "McreaHub Data Sync";
      
      try {
          const listRes = await fetch('https://api.github.com/gists', { 
              headers: { 'Authorization': `token ${token}` } 
          });
          
          if (!listRes.ok) throw new Error(`Impossible de lister les Gists (${listRes.status})`);
          
          const gists = await listRes.json();
          const targetGist = gists.find(g => g.description === GIST_DESC || g.description === "McreaHub Notes Backup");

          // --- MODE PULL ---
          if (mode === 'pull') {
              if (!targetGist) {
                  this.log("[GitHub] Aucun Gist trouvé.");
                  return { success: true, data: {} };
              }

              this.log(`[GitHub] Gist trouvé (${targetGist.id}). Téléchargement...`);
              const filesContent = {};
              
              for (const [filename, fileInfo] of Object.entries(targetGist.files)) {
                  try {
                      let contentStr = fileInfo.content;

                      // --- MODIFICATION : FORCE LE RAW SI CONTENU DOUTEUX OU TRONQUÉ ---
                      // Si content est vide, null, ou si truncated est true, on va chercher la source brute.
                      if (fileInfo.truncated || !contentStr || contentStr.trim() === "") {
                          this.log(`[GitHub] Téléchargement brut pour ${filename}...`);
                          const contentRes = await fetch(fileInfo.raw_url);
                          contentStr = await contentRes.text();
                      }

                      if (contentStr && contentStr.trim() !== "") {
                          const parsedData = this._tryFixCorruptedJson(contentStr);
                          if (parsedData) {
                              filesContent[filename] = parsedData;
                              this.log(`[GitHub] ${filename} chargé (${JSON.stringify(parsedData).length} chars).`);
                          } else {
                              this.log(`[GitHub] Echec parsing JSON pour ${filename}`);
                          }
                      } else {
                          this.log(`[GitHub] ${filename} est vide.`);
                      }
                  } catch (err) {
                      this.log(`[GitHub] Erreur lecture ${filename}: ${err.message}`);
                  }
              }
              return { success: true, data: filesContent };
          }

          // --- MODE PUSH ---
          if (!payload) return { success: true };

          const filesToUpload = {};
          const prepareContent = (data) => typeof data === 'string' ? data : JSON.stringify(data, null, 2);

          if (payload.notes) filesToUpload["mcreahub-notes.json"] = { content: prepareContent(payload.notes) };
          if (payload.settings) filesToUpload["mcreahub-settings.json"] = { content: prepareContent(payload.settings) };
          if (payload.sources) filesToUpload["mcreahub-sources.json"] = { content: prepareContent(payload.sources) };
          if (payload.mcreatorConfig) filesToUpload["mcreahub-mcreator-config.json"] = { content: prepareContent(payload.mcreatorConfig) };

          if (Object.keys(filesToUpload).length === 0) return { success: true };

          const body = { description: GIST_DESC, public: false, files: filesToUpload };

          const method = targetGist ? 'PATCH' : 'POST';
          const url = targetGist ? `https://api.github.com/gists/${targetGist.id}` : 'https://api.github.com/gists';

          await fetch(url, {
              method: method,
              headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
          });
          
          this.log(`[GitHub] Sauvegarde réussie (${method}).`);
          return { success: true };

      } catch (error) {
          this.log(`[GitHub] Erreur Sync (${mode}): ${error.message}`);
          return { success: false, message: error.message };
      }
  }

  async uploadNotesToGist(notesData) { return this.syncGlobalGist({ notes: notesData }, 'push'); }
  
  async downloadNotesFromGist() {
      const res = await this.syncGlobalGist(null, 'pull');
      if(res.success && res.data && res.data["mcreahub-notes.json"]) {
          return { success: true, notes: res.data["mcreahub-notes.json"] };
      }
      return { success: true, notes: [] };
  }

  // ... (Reste des fonctions getReleases/getChangelog inchangées)
  async getReleases(force=false) {
      const settings = await this.settingsManager.getSettings();
      const duration = settings.cacheDurationMinutes || 360;
      if (!force) {
          const cachedData = await this._loadFromCache(this.releasesCacheFile, duration);
          if (cachedData && cachedData.data) return { success: true, ...cachedData };
      }
      try {
          const releases = await this._fetchGitHubReleases();
          const processed = this._processReleases(releases);
          await this._saveToCache(this.releasesCacheFile, processed);
          return { success: true, data: processed, timestamp: Date.now() };
      } catch (error) {
          const old = await this._loadFromCache(this.releasesCacheFile, Infinity);
          if (old) return { success: true, fromCache: true, ...old };
          return { success: false, reason: error.message, data: [], timestamp: 0 };
      }
  }
  
  async _fetchGitHubReleases() {
    let all = []; let page = 1; const MAX_PAGES = 3; 
    while (page <= MAX_PAGES) {
      const res = await fetch(`https://api.github.com/repos/MCreator/MCreator/releases?per_page=100&page=${page}`);
      if (!res.ok) break; const chunk = await res.json(); if (!chunk || chunk.length === 0) break; all.push(...chunk); page++;
    }
    return all;
  }

  _processReleases(releases) {
    return releases.map(release => {
      const asset = this._findAssetForOS(release.assets);
      const detectedVersions = new Set();
      const detectedLoaders = new Set();
      if (release.body) {
        const lines = release.body.split('\n');
        const keywordRegex = /\b(NeoForge|Forge|Fabric|Data\s*Packs?|Datapacks?|Bedrock|Add-ons?)\b/gi;
        const versionRegex = /(\d+\.\d+(?:\.\d+)?)/g;
        for (const line of lines) {
            const cleanLine = line.trim(); if (!cleanLine) continue;
            const matches = [...cleanLine.matchAll(keywordRegex)];
            if (matches.length === 0) continue;
            for (let i = 0; i < matches.length; i++) {
                const m = matches[i];
                const keyword = m[0];
                const startIndex = m.index + keyword.length;
                const endIndex = (i + 1 < matches.length) ? matches[i+1].index : cleanLine.length;
                const textSegment = cleanLine.substring(startIndex, endIndex);
                let type = null;
                const lowerKey = keyword.toLowerCase();
                if (lowerKey.includes('neoforge')) type = 'NeoForge';
                else if (lowerKey.includes('forge')) type = 'Forge';
                else if (lowerKey.includes('fabric')) type = 'Fabric';
                if (type) {
                    detectedLoaders.add(type);
                    const vMatches = [...textSegment.matchAll(versionRegex)];
                    for (const vm of vMatches) detectedVersions.add(vm[1]);
                }
            }
        }
      }
      const mc_versions = Array.from(detectedVersions).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      const supported_loaders = Array.from(detectedLoaders).sort();
      return {
        name: release.tag_name,
        prerelease: release.prerelease || (release.name && release.name.toUpperCase().includes('EAP')),
        published_at: release.published_at,
        url: asset ? asset.browser_download_url : null,
        size: asset ? asset.size : 0,
        mc_versions: mc_versions,
        supported_loaders: supported_loaders,
        assets: release.assets,
      };
    }).filter(v => v.url);
  }

  _findAssetForOS(assets) {
      if (!assets) return null;
      const key = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux';
      return assets.find(a => a.name.toLowerCase().includes(key) && a.name.endsWith('.zip'));
  }

  async getChangelog(force = false) {
    if (!force) {
      const cachedData = await this._loadFromCache(this.changelogCacheFile, 360);
      if (cachedData) return { success: true, ...cachedData };
    }
    try {
      const response = await fetch('https://mcreator.net/changelog');
      if (!response.ok) throw new Error(`Statut HTTP: ${response.status}`);
      const html = await response.text();
      const changelogData = this._parseChangelog(html);
      await this._saveToCache(this.changelogCacheFile, changelogData);
      return { success: true, data: changelogData, timestamp: Date.now() };
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') return { success: false, error: "Serveur injoignable." };
      return { success: false, error: error.message };
    }
  }

  _parseChangelog(html) {
    const $ = cheerio.load(html); const changelogData = [];
    $('h2').each((i, h2_el) => {
      if ($(h2_el).text().toLowerCase().includes('older versions')) return;
      let current = $(h2_el).next();
      while (current.length > 0 && current.prop('tagName') !== 'H2') {
        if (current.prop('tagName') === 'H3') {
          const changes = current.next('ul').find('li').map((k, li) => $(li).text().trim()).get();
          changelogData.push({ version: $(h2_el).text().trim(), date: current.text().trim(), changes: changes.filter(c => c) });
        }
        current = current.next();
      }
    });
    return changelogData;
  }

  async _loadFromCache(filePath, durationMinutes) {
    try {
      const stats = await fs.stat(filePath);
      if ((Date.now() - stats.mtime.getTime()) / 60000 < durationMinutes) {
        const content = await fs.readFile(filePath, 'utf-8');
        return { data: JSON.parse(content), timestamp: stats.mtime.getTime() };
      }
    } catch (e) {} return null;
  }

  async _saveToCache(filePath, data) {
    try { await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8'); } catch (e) { this.log(e.message); }
  }
}

export default GitHubApiManager;