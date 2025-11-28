// src/main/managers/git-manager.js

import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = util.promisify(exec);

const BRANCH_GITIGNORE = `
.DS_Store
Thumbs.db
desktop.ini
*.log
build/
.gradle/
run/
out/
bin/
/temp/
/tmp/
*.zip
backups/
`;

class GitManager {
  constructor(settingsManager, mainWindow) {
    this.settingsManager = settingsManager;
    this.mainWindow = mainWindow;
  }

  _log(message) {
      const msg = `[Git] ${message}`;
      console.log(msg);
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('log-message', msg);
      }
  }

  async _run(command, cwd) {
      try {
          if (cwd) await fs.access(cwd);
          const { stdout, stderr } = await execAsync(command, { cwd, maxBuffer: 1024 * 1024 * 50 });
          return { success: true, stdout, stderr };
      } catch (error) {
          return { success: false, message: error.message, stderr: error.stderr };
      }
  }

  async _getAuthUrl(repoUrl) {
      const { githubToken } = await this.settingsManager.getSettings();
      if (!githubToken) throw new Error("Token GitHub manquant.");
      
      try {
          const urlObj = new URL(repoUrl);
          urlObj.username = 'oauth2';
          urlObj.password = githubToken;
          return urlObj.toString();
      } catch (e) {
          throw new Error("URL du dépôt invalide.");
      }
  }

  // --- GESTION DU GITIGNORE GLOBAL ---
  
  async getGitIgnoreContent(folderPath) {
      try {
          const filePath = path.join(folderPath, '.gitignore');
          const content = await fs.readFile(filePath, 'utf-8');
          return content;
      } catch (e) {
          return BRANCH_GITIGNORE.trim();
      }
  }

  async saveGitIgnoreContent(folderPath, content) {
      try {
          const filePath = path.join(folderPath, '.gitignore');
          await fs.writeFile(filePath, content, 'utf-8');
          return { success: true };
      } catch (e) {
          return { success: false, message: e.message };
      }
  }

  // --- CLONAGE INTELLIGENT MULTI-BRANCHES ---
  async cloneProject(repoUrl, destinationPath) {
      try {
          this._log(`Analyse du dépôt ${repoUrl}...`);
          
          const authUrl = await this._getAuthUrl(repoUrl);
          
          const repoName = repoUrl.split('/').pop().replace('.git', '');
          const projectRoot = path.join(destinationPath, repoName);

          try {
              await fs.mkdir(projectRoot, { recursive: true });
          } catch (e) {}

          this._log("Récupération de la liste des branches...");
          const lsCmd = `git ls-remote --heads "${authUrl}"`;
          const lsRes = await this._run(lsCmd, destinationPath);

          if (!lsRes.success) throw new Error("Impossible de lire les branches distantes.");

          const branches = lsRes.stdout.split('\n')
              .filter(line => line.trim() !== '')
              .map(line => {
                  const parts = line.split('\t');
                  return parts.length > 1 ? parts[1].replace('refs/heads/', '') : null;
              })
              .filter(b => b !== null);

          if (branches.length === 0) throw new Error("Aucune branche trouvée dans ce dépôt.");

          this._log(`${branches.length} branche(s) détectée(s) : ${branches.join(', ')}`);

          for (const branch of branches) {
              
              if (branch === 'main' || branch === 'master' || branch === 'HEAD') {
                  this._log(`ℹ️ Branche '${branch}' ignorée (racine virtuelle).`);
                  continue;
              }

              const versionPath = path.join(projectRoot, branch);
              
              try {
                  await fs.access(versionPath);
                  this._log(`⚠️ Le dossier ${branch} existe déjà, ignoré.`);
                  continue;
              } catch(e) {}

              this._log(`📥 Clonage de la branche "${branch}"...`);
              
              const cloneCmd = `git clone --single-branch --branch "${branch}" "${authUrl}" "${versionPath}"`;
              await this._run(cloneCmd, projectRoot);
              
              await this._run(`git remote set-url origin "${authUrl}"`, versionPath);
          }

          // --- CONFIGURATION RACINE & GITIGNORE ---
          this._log("Configuration de la racine du projet...");
          await this._run('git init', projectRoot);
          await this._run(`git remote add origin "${authUrl}"`, projectRoot);
          await this._run('git fetch', projectRoot);
          
          // Création du .gitignore à la racine
          await this.saveGitIgnoreContent(projectRoot, BRANCH_GITIGNORE.trim());

          this._log("✅ Importation terminée avec succès.");
          
          return { success: true, path: projectRoot };

      } catch (e) {
          this._log(`❌ Erreur clonage: ${e.message}`);
          return { success: false, message: e.message };
      }
  }
  
  async ensureMainBranch(remoteUrl, projectName, versionsList, author) {
      const tempDir = path.join(os.tmpdir(), `mcreahub-init-${Date.now()}`);
      try {
          await fs.mkdir(tempDir, { recursive: true });
          await this._run('git init -b main', tempDir);
          await this._run(`git config user.name "${author.name}"`, tempDir);
          await this._run(`git config user.email "${author.email}"`, tempDir);
          const authUrl = await this._getAuthUrl(remoteUrl);
          await this._run(`git remote add origin "${authUrl}"`, tempDir);
          const ls = await this._run('git ls-remote --heads origin main', tempDir);
          if (ls.success && ls.stdout.includes('refs/heads/main')) return { success: true }; 
          const readmeContent = `# ${projectName}\n\nGéré par McreaHub.\n\n## Versions :\n${versionsList.map(v => `- ${v}`).join('\n')}`;
          await fs.writeFile(path.join(tempDir, 'README.md'), readmeContent, 'utf-8');
          await this._run('git add README.md', tempDir);
          await this._run('git commit -m "Init Root"', tempDir);
          await this._run('git push -u origin main', tempDir);
          return { success: true };
      } catch (e) { return { success: false, message: e.message }; } 
      finally { try { await fs.rm(tempDir, { recursive: true, force: true }); } catch(e){} }
  }

  async getVersionStatus(versionPath, remoteUrl, branchName) {
      try {
          const gitDir = path.join(versionPath, '.git');
          try { await fs.access(gitDir); } catch { return { status: 'new', localChanges: true, commitsBehind: 0, commitsAhead: 0 }; }
          const authUrl = await this._getAuthUrl(remoteUrl);
          const remoteCheck = await this._run('git remote get-url origin', versionPath);
          if (!remoteCheck.success) await this._run(`git remote add origin "${authUrl}"`, versionPath);
          else await this._run(`git remote set-url origin "${authUrl}"`, versionPath);
          await this._run('git fetch origin', versionPath);
          const statusCmd = await this._run('git status --porcelain', versionPath);
          const hasLocalChanges = statusCmd.stdout.trim().length > 0;
          const lsRemote = await this._run(`git ls-remote --heads origin ${branchName}`, versionPath);
          const remoteExists = lsRemote.stdout.includes(branchName);
          let commitsBehind = 0, commitsAhead = 0;
          if (remoteExists) {
              const revList = await this._run(`git rev-list --left-right --count HEAD...origin/${branchName}`, versionPath);
              if (revList.success) { const parts = revList.stdout.trim().split(/\s+/); commitsAhead = parseInt(parts[0])||0; commitsBehind = parseInt(parts[1])||0; }
          } else {
              const countCmd = await this._run('git rev-list --count HEAD', versionPath); commitsAhead = parseInt(countCmd.stdout)||0;
          }
          return { status: 'ok', localChanges: hasLocalChanges, commitsAhead, commitsBehind, remoteExists };
      } catch (e) { return { status: 'error', message: e.message }; }
  }

  async getRemoteBranchesList(cwd, remoteUrl) {
      try {
          const authUrl = await this._getAuthUrl(remoteUrl);
          const res = await this._run(`git ls-remote --heads "${authUrl}"`, cwd);
          if (!res.success) return [];
          return res.stdout.split('\n').filter(l => l.trim() !== '').map(l => { const parts = l.split('\t'); if (parts.length < 2) return null; return parts[1].replace('refs/heads/', ''); }).filter(b => b !== 'main' && b !== 'master' && b !== 'HEAD' && b !== null);
      } catch (e) { return []; }
  }

  async pruneRemoteBranches(cwd, remoteUrl, branchesToDelete) {
      if (!branchesToDelete || branchesToDelete.length === 0) return { success: true };
      try {
          const authUrl = await this._getAuthUrl(remoteUrl);
          for (const branch of branchesToDelete) await this._run(`git push "${authUrl}" --delete ${branch}`, cwd);
          return { success: true };
      } catch (e) { return { success: false, message: e.message }; }
  }

  async syncVersionToBranch(versionPath, remoteUrl, branchName, message, author) {
      try {
          const gitDir = path.join(versionPath, '.git');
          try { await fs.access(gitDir); } catch { await this._run(`git init -b ${branchName}`, versionPath); }
          await this._run(`git config user.name "${author.name}"`, versionPath);
          await this._run(`git config user.email "${author.email}"`, versionPath);
          const authUrl = await this._getAuthUrl(remoteUrl);
          const remoteCheck = await this._run('git remote get-url origin', versionPath);
          if (!remoteCheck.success) await this._run(`git remote add origin "${authUrl}"`, versionPath);
          else await this._run(`git remote set-url origin "${authUrl}"`, versionPath);
          
          // NOTE : On ne recrée pas le .gitignore ici pour ne pas écraser les règles locales
          // Il est créé lors du clonage initial à la racine.
          
          await this._run('git fetch origin', versionPath);
          const branchCheck = await this._run(`git ls-remote --heads origin ${branchName}`, versionPath);
          if (branchCheck.success && branchCheck.stdout.includes(branchName)) {
              const status = await this._run('git status --porcelain', versionPath);
              if (status.stdout.trim() !== '') await this._run('git stash', versionPath);
              try { await this._run(`git pull origin ${branchName} --rebase`, versionPath); } catch(e) {}
              if (status.stdout.trim() !== '') try { await this._run('git stash pop', versionPath); } catch(e) {}
          }
          await this._run('git add .', versionPath);
          const finalStatus = await this._run('git status --porcelain', versionPath);
          if (finalStatus.stdout.trim() !== '') await this._run(`git commit -m "${message}"`, versionPath);
          const pushRes = await this._run(`git push origin HEAD:${branchName}`, versionPath);
          if (!pushRes.success && pushRes.stderr.includes('rejected')) await this._run(`git push origin HEAD:${branchName} --force`, versionPath);
          return { success: true };
      } catch (e) { return { success: false, message: e.message }; }
  }

  async deleteRemoteBranch(remoteUrl, branchName, cwd) {
      try {
          const authUrl = await this._getAuthUrl(remoteUrl);
          const checkRepo = await this._run('git status', cwd);
          if (checkRepo.success) {
              await this._run(`git push "${authUrl}" --delete ${branchName}`, cwd);
              return { success: true };
          }
          return { success: false, message: "Contexte Git invalide" };
      } catch (e) { return { success: false, message: e.message }; }
  }

  async checkGitInstalled() { 
      try { 
          const g = await this._run('git --version', process.cwd()); 
          return { installed: g.success, lfsInstalled: true }; 
      } catch (e) { return { installed: false }; } 
  }
}

export default GitManager;