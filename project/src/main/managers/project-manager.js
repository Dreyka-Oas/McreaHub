// src/main/managers/project-manager.js

import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import url from 'url';
import chokidar from 'chokidar';
import { findMCreatorFiles, writeJsonAtomic, forceDeleteFolder, readJsonSafe } from '../utils/file-system.js';
import { formatMCreatorVersion } from '../utils/formatters.js';

class ProjectManager {
  constructor(userDataPath, settingsManager, githubApiManager) {
    this.sourcesFile = path.join(userDataPath, 'project-sources.json');
    this.watcher = null;
    this.mainWindow = null;
    this.debounceTimer = null;
    
    this.settingsManager = settingsManager;
    this.githubApiManager = githubApiManager;
    this.gitManager = null;
  }

  setGitManager(gitManager) {
      this.gitManager = gitManager;
  }

  initialize(mainWindow) {
    this.mainWindow = mainWindow;
    this.setupWatcher();
  }

  async setupWatcher() {
    if (this.watcher) await this.watcher.close();
    const sources = await this.getSources();
    if (sources.length === 0) return;

    this.watcher = chokidar.watch(sources, {
      ignored: /(^|[\/\\])\../, 
      persistent: true,
      depth: 2,
      ignoreInitial: true,
    });

    const rescanDebounced = () => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('projects:updated');
        }
        this.debounceTimer = null;
      }, 250);
    };

    this.watcher
      .on('add', rescanDebounced)
      .on('unlink', rescanDebounced)
      .on('addDir', rescanDebounced)
      .on('unlinkDir', rescanDebounced);
  }

  async close() {
    if (this.watcher) await this.watcher.close();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  async getSources() { 
      try { 
          const c = await fs.readFile(this.sourcesFile, 'utf-8'); 
          return JSON.parse(c); 
      } catch (e) { return []; } 
  }
  
  async saveSources(sources) {
    const u = [...new Set(sources)];
    await writeJsonAtomic(this.sourcesFile, u);
    await this.setupWatcher();
    return u;
  }

  async addSource(sourcePath) { const s = await this.getSources(); s.push(sourcePath); return this.saveSources(s); }
  async removeSource(sourcePath) { let s = await this.getSources(); s = s.filter(p => p !== sourcePath); return this.saveSources(s); }

  // --- LECTURE NATIVE GIT ---
  // Lit le fichier .git/config pour trouver l'URL du remote 'origin'
  async getProjectRemoteUrl(projectPath) {
      const gitConfigPath = path.join(projectPath, '.git', 'config');
      try {
          const content = await fs.readFile(gitConfigPath, 'utf-8');
          // Regex pour trouver url = ... dans le fichier config
          const match = content.match(/url\s*=\s*(.+)/);
          if (match && match[1]) {
              return match[1].trim();
          }
          return null;
      } catch (e) {
          return null;
      }
  }

  // --- CONFIGURATION NATIVE GIT ---
  async setProjectRemoteUrl(projectPath, remoteUrl) {
      if (!this.gitManager) return { success: false, message: "GitManager non initialisé" };

      // Si on passe null, on supprime le remote
      if (!remoteUrl) {
          await this.gitManager._run('git remote remove origin', projectPath);
          return { success: true };
      }

      // Sinon on configure
      const gitDir = path.join(projectPath, '.git');
      try { await fs.access(gitDir); } catch { 
          await this.gitManager._run('git init', projectPath); 
      }

      const check = await this.gitManager._run('git remote get-url origin', projectPath);
      if (check.success) {
          await this.gitManager._run(`git remote set-url origin "${remoteUrl}"`, projectPath);
      } else {
          await this.gitManager._run(`git remote add origin "${remoteUrl}"`, projectPath);
      }

      return { success: true };
  }

  async scanAllSourcesForProjects() {
    const sources = await this.getSources();
    
    const sourcesPromises = sources.map(async (source) => {
      try {
        const entries = await fs.readdir(source, { withFileTypes: true });
        const projectFolders = entries.filter(e => e.isDirectory() && !e.name.startsWith('.'));

        const projectsPromises = projectFolders.map(async (projectFolder) => {
          const projectFolderPath = path.join(source, projectFolder.name);
          
          let backupCount = 0;
          try {
              const backupsDir = path.join(projectFolderPath, 'backups');
              const backupFiles = await fs.readdir(backupsDir);
              backupCount = backupFiles.filter(f => f.endsWith('.zip')).length;
          } catch (e) { backupCount = 0; }

          // Récupération URL via Git natif
          const remoteUrl = await this.getProjectRemoteUrl(projectFolderPath);

          const projectData = {
            name: projectFolder.name,
            sourcePath: source,
            projectFolderPath: projectFolderPath,
            backupCount: backupCount,
            remoteUrl: remoteUrl,
            versions: []
          };

          try {
            const versionEntries = await fs.readdir(projectFolderPath, { withFileTypes: true });
            const versionFolders = versionEntries.filter(e => 
                e.isDirectory() && 
                !e.name.startsWith('.') && 
                e.name !== 'backups' && 
                e.name !== 'build' && 
                e.name !== '.gradle' &&
                e.name !== '.git' // On ignore le dossier .git
            );

            const versionsPromises = versionFolders.map(async (versionFolder) => {
                const versionPath = path.join(projectFolderPath, versionFolder.name);
                const minecraftVersion = versionFolder.name; 
                
                const mcreatorFiles = await findMCreatorFiles(versionPath);
                
                let loaderType = 'Unknown';
                let mcreatorVersion = 'Inconnue';
                let picture = null;
                let isInitialized = false;

                if (mcreatorFiles.length > 0) {
                  isInitialized = true;
                  try {
                    const content = JSON.parse(await fs.readFile(mcreatorFiles[0], 'utf-8'));
                    mcreatorVersion = formatMCreatorVersion(content.mcreatorVersion);
                    
                    const ws = content.workspaceSettings || {};
                    picture = ws.modPicture ? await this._findProjectPicture(versionPath, ws) : null;
                    
                    const rawGenerator = content.currentGenerator || ws.currentGenerator || ws.generator;
                    if (rawGenerator && typeof rawGenerator === 'string') {
                        const genLower = rawGenerator.toLowerCase();
                        if (genLower.includes('neoforge')) loaderType = 'NeoForge';
                        else if (genLower.includes('forge')) loaderType = 'Forge';
                        else if (genLower.includes('fabric')) loaderType = 'Fabric';
                        else if (genLower.includes('quilt')) loaderType = 'Quilt';
                    }
                  } catch (e) {}
                }

                return {
                  path: versionPath,
                  mcreatorVersion: mcreatorVersion,
                  minecraftVersion: minecraftVersion, 
                  loader: loaderType,
                  isInitialized: isInitialized,
                  picture: picture
                };
            });

            projectData.versions = await Promise.all(versionsPromises);
            return projectData;

          } catch (err) {
             return null;
          }
        });

        return await Promise.all(projectsPromises);

      } catch (error) { return []; }
    });

    const resultsNested = await Promise.all(sourcesPromises);
    const allProjects = resultsNested.flat().filter(p => p !== null);
    
    return allProjects.sort((a, b) => a.name.localeCompare(b.name));
  }

  async _findProjectPicture(projectPath, workspaceSettings) {
    const pictureName = workspaceSettings.modPicture ? `${workspaceSettings.modPicture}.png` : null;
    if (!pictureName) return null;
    const modId = workspaceSettings.modid || 'mod';
    const baseTexturesPath = path.join(projectPath, 'src', 'main', 'resources', 'assets', modId, 'textures');
    const possibleSubFolders = ['screens', 'gui', 'items', 'blocks', 'custom', ''];
    for (const sub of possibleSubFolders) {
        const fullPath = path.join(baseTexturesPath, sub, pictureName);
        try { 
            await fs.access(fullPath);
            return url.pathToFileURL(fullPath).href;
        } catch (e) {}
    }
    return null;
  }

  async createProjectFolder({ parentPath, folderName, minecraftVersion }) {
    const newFolderPath = path.join(parentPath, folderName, minecraftVersion);
    try { await fs.mkdir(newFolderPath, { recursive: true }); return { success: true, path: newFolderPath }; }
    catch (error) { return { success: false, message: error.message }; }
  }

  async createProjectSubfolder({ parentPath, folderName }) {
      const newPath = path.join(parentPath, folderName);
      try { await fs.mkdir(newPath, { recursive: true }); return { success: true, path: newPath }; }
      catch (e) { return { success: false, message: e.message }; }
  }

  async deleteProjectVersion(versionPath) {
      try {
          const parentDir = path.dirname(versionPath);
          const branchName = path.basename(versionPath);
          
          console.log(`[ProjectManager] Suppression version : ${versionPath}`);
          const remoteUrl = await this.getProjectRemoteUrl(parentDir);
          
          if (remoteUrl && this.gitManager) {
              await this.gitManager.deleteRemoteBranch(remoteUrl, branchName, versionPath);
          }

          await forceDeleteFolder(versionPath);
          return { success: true };
      } catch (error) {
          console.error('[ProjectManager] Erreur suppression version:', error);
          return { success: false, message: error.message };
      }
  }

  // --- SUPPRESSION PROJET COMPLET ---
  async deleteProject(projectPath) {
      try {
          console.log(`[ProjectManager] SUPPRESSION PROJET COMPLET : ${projectPath}`);
          await forceDeleteFolder(projectPath);
          return { success: true };
      } catch (error) {
          console.error('[ProjectManager] Erreur suppression projet:', error);
          return { success: false, message: error.message };
      }
  }
}

export default ProjectManager;