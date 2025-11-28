// src/main/managers/installation-manager.js

import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { spawn } from 'child_process';
import extract from 'extract-zip';
import { v4 as uuidv4 } from 'uuid';
import { 
    terminateProcessesInDirectory, 
    findMCreatorFiles, 
    sanitizeFileName, 
    writeJsonAtomic, 
    readJsonSafe,
    forceDeleteFolder 
} from '../utils/file-system.js';
import fetch from 'node-fetch';

async function fetchWithRetry(url, options, retries = 3, backoff = 1000) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            if (response.status < 500 && response.status !== 408 && response.status !== 429) throw new Error(`HTTP ${response.status}`);
            throw new Error(`Erreur serveur ${response.status}`);
        }
        return response;
    } catch (error) {
        if (retries > 0 && error.name !== 'AbortError') {
            console.warn(`[Network] Retry dans ${backoff}ms... (${retries} restants)`);
            await new Promise(r => setTimeout(r, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw error;
    }
}

class InstallationManager {
  constructor(settingsManager, userDataPath, mainWindow, githubApiManager) {
    this.settingsManager = settingsManager;
    this.userDataPath = userDataPath;
    this.mainWindow = mainWindow;
    this.githubApi = githubApiManager;
    this.installationsFile = path.join(userDataPath, 'installations.json');
    this.downloadsPath = path.join(userDataPath, 'downloads');
    this.downloadQueue = [];
    this.activeDownloadCount = 0;
    this.installations = {};
    this.activeDownloads = new Map();
    
    this._loadAndSyncInstallations();
  }

  async _loadAndSyncInstallations() {
    const data = await readJsonSafe(this.installationsFile);
    this.installations = data || {};
    await this.verifyAndSyncInstallations();
  }

  getReleases(force) { return this.githubApi.getReleases(force); }

  addToDownloadQueue(version) {
    if (!this.downloadQueue.some(v => v.name === version.name) && !this.activeDownloads.has(version.name)) {
      this.downloadQueue.push(version);
      this._processDownloadQueue();
    }
  }

  async _processDownloadQueue() {
    const settings = await this.settingsManager.getSettings();
    const maxConcurrent = settings.maxConcurrentDownloads || 1;
    while (this.activeDownloadCount < maxConcurrent && this.downloadQueue.length > 0) {
      this.activeDownloadCount++;
      this._startDownload(this.downloadQueue.shift());
    }
  }

  async _startDownload(version) {
    const onFinish = () => {
      this.activeDownloadCount--;
      this.activeDownloads.delete(version.name);
      this._processDownloadQueue();
    };

    const settings = await this.settingsManager.getSettings();
    const versionsPath = settings.installPath || path.join(this.userDataPath, 'versions');
    await fs.mkdir(this.downloadsPath, { recursive: true });
    await fs.mkdir(versionsPath, { recursive: true });

    const asset = this._findAssetForOS(version.assets);
    if (!asset) {
      this._sendError(version.name, "Incompatible avec cet OS.");
      return onFinish();
    }

    const safeName = sanitizeFileName(version.name);
    const installDir = path.join(versionsPath, safeName);
    const zipPath = path.join(this.downloadsPath, `${uuidv4()}-${asset.name}`);
    const controller = new AbortController();
    
    this.activeDownloads.set(version.name, { abortController: controller });

    try {
      this.mainWindow.webContents.send('download:progress', { name: version.name, status: 'downloading', percent: 0, speed: 0 });

      const response = await fetchWithRetry(asset.browser_download_url, { signal: controller.signal });
      const totalSize = parseInt(response.headers.get('content-length'), 10);
      let downloaded = 0, lastTime = Date.now(), lastSize = 0;
      const stream = fsSync.createWriteStream(zipPath);

      for await (const chunk of response.body) {
          downloaded += chunk.length;
          stream.write(chunk);
          const now = Date.now();
          if (now - lastTime >= 1000) {
              const speed = (downloaded - lastSize) / ((now - lastTime) / 1000);
              this.mainWindow.webContents.send('download:progress', { name: version.name, status: 'downloading', percent: totalSize ? downloaded/totalSize : 0, speed });
              lastTime = now; lastSize = downloaded;
          }
      }
      stream.end();
      await new Promise((res, rej) => { stream.on('finish', () => { stream.close(); res(); }); stream.on('error', rej); });

      this.mainWindow.webContents.send('download:progress', { name: version.name, status: 'installing', percent: 1 });
      
      await terminateProcessesInDirectory(installDir);
      await new Promise(resolve => setTimeout(resolve, 500));
      await forceDeleteFolder(installDir);
      
      await extract(zipPath, { dir: installDir });
      await this.verifyAndSyncInstallations();
      this.mainWindow.webContents.send('download:complete', version.name);

    } catch (err) {
      if (err.name !== 'AbortError') this._sendError(version.name, err.message);
    } finally {
      await fs.unlink(zipPath).catch(() => {});
      onFinish();
    }
  }

  async cancelAllDownloadsAndCleanup() {
    this.downloadQueue = [];
    for (const d of this.activeDownloads.values()) d.abortController.abort();
    await new Promise(r => setTimeout(r, 500));
  }

  _sendError(name, error) { this.mainWindow.webContents.send('download:error', { name, error }); }

  async getInstalledVersions() { return this.installations; }
  async saveInstallations(data) { 
      this.installations = data; 
      await writeJsonAtomic(this.installationsFile, data); 
  }

  async verifyAndSyncInstallations() {
    const settings = await this.settingsManager.getSettings();
    const versionsPath = settings.installPath || path.join(this.userDataPath, 'versions');
    await fs.mkdir(versionsPath, { recursive: true });
    
    const onDisk = { ...this.installations };
    const folders = await fs.readdir(versionsPath);
    let changed = false;

    for (const f of folders) {
        if (!onDisk[f]) {
            const exe = await this._findExecutable(path.join(versionsPath, f));
            if (exe) { onDisk[f] = { installPath: path.join(versionsPath, f), executablePath: exe }; changed = true; }
        }
    }
    for (const v in onDisk) { if (!folders.includes(v)) { delete onDisk[v]; changed = true; } }
    if (changed) await this.saveInstallations(onDisk);
  }

  async _findExecutable(dir) {
    const exeName = { win32: 'mcreator.exe', linux: 'mcreator.sh', darwin: 'mcreator.app' }[process.platform];
    if (!exeName) return null;
    try {
        const files = await fs.readdir(dir, { recursive: true });
        const found = files.find(f => path.basename(f).toLowerCase() === exeName);
        return found ? path.join(dir, found) : null;
    } catch { return null; }
  }

  _findAssetForOS(assets) {
    if (!assets) return null;
    const key = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux';
    return assets.find(a => a.name.toLowerCase().includes(key) && a.name.endsWith('.zip'));
  }

  // --- MODIFICATION : DÉSINSTALLATION FORCÉE ET ROBUSTE ---
  async uninstallVersion(name) {
    const info = this.installations[name];
    let targetPath = null;

    // Si la version est connue, on prend son chemin
    if (info) {
        targetPath = info.installPath;
    } else {
        // SINON (Cas "Inconnu" / Ghost), on devine le chemin pour forcer le nettoyage
        console.log(`[Uninstall] Version '${name}' inconnue dans la config. Tentative de suppression forcée.`);
        const settings = await this.settingsManager.getSettings();
        const versionsBase = settings.installPath || path.join(this.userDataPath, 'versions');
        targetPath = path.join(versionsBase, sanitizeFileName(name));
    }

    try {
      // 1. On tue les processus (Même si le dossier n'existe plus vraiment, ça ne coûte rien)
      await terminateProcessesInDirectory(targetPath);
      
      // 2. On attend 1 seconde
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 3. On supprime le dossier physiquement (ignore si inexistant)
      await forceDeleteFolder(targetPath);
      
      // 4. On nettoie la liste interne quoi qu'il arrive
      const newInstallations = { ...this.installations };
      if (newInstallations[name]) {
          delete newInstallations[name];
          await this.saveInstallations(newInstallations);
      } else {
          // Si elle n'était pas dans la liste, on force une resynchro
          await this.verifyAndSyncInstallations();
      }

      return { success: true };
    } catch (e) { 
        console.error("Erreur désinstallation:", e);
        // Même en cas d'erreur disque, on essaie de virer l'entrée de la liste pour débloquer l'UI
        const newInstallations = { ...this.installations };
        delete newInstallations[name];
        await this.saveInstallations(newInstallations);
        
        return { success: false, message: e.message }; 
    }
  }

  async launchVersion(name) {
    const info = this.installations[name];
    if (info?.executablePath) { this._spawnProcess(info.executablePath); return { success: true }; }
    return { success: false, message: "Exécutable manquant" };
  }

  async launchProject({ versionName, projectPath }) {
    const info = this.installations[versionName];
    if (!info) return { success: false, message: "Version non installée" };
    try {
      const files = await findMCreatorFiles(projectPath);
      if (!files.length) return { success: false, message: "Pas de fichier .mcreator" };
      this._spawnProcess(info.executablePath, [files[0]]);
      return { success: true };
    } catch(e) { return { success: false, message: e.message }; }
  }

  async _spawnProcess(exe, args = []) {
    if (process.platform === 'linux') await fs.chmod(exe, 0o755);
    spawn(exe, args, { cwd: path.dirname(exe), detached: true, stdio: 'ignore' }).unref();
  }

  async terminateAllRunningInstances() {
     const promises = Object.values(this.installations).map(i => terminateProcessesInDirectory(i.installPath));
     await Promise.all(promises);
  }
}

export default InstallationManager;