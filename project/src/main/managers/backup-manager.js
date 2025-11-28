// src/main/managers/backup-manager.js

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import extract from 'extract-zip';
import { sanitizeFileName, forceDeleteFolder } from '../utils/file-system.js';

class BackupManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
  }

  /**
   * Envoie un log au Renderer pour affichage dans la console du navigateur (F12).
   */
  _log(message) {
      const formattedMsg = `[BackupManager] ${message}`;
      console.log(formattedMsg); // Log Terminal
      
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('log-message', formattedMsg); // Log Console Navigateur
      }
  }

  getBackupsDir(projectPath) {
    return path.join(projectPath, 'backups');
  }

  async listBackups(projectPath) {
    const backupsDir = this.getBackupsDir(projectPath);
    try {
      await fsp.mkdir(backupsDir, { recursive: true });
      const files = await fsp.readdir(backupsDir);
      const backups = await Promise.all(files
        .filter(f => f.endsWith('.zip'))
        .map(async file => {
          try {
            const filePath = path.join(backupsDir, file);
            const stats = await fsp.stat(filePath);
            return { name: file, path: filePath, date: stats.mtime.getTime(), size: stats.size };
          } catch (e) { return null; }
        })
      );
      return backups.filter(b => b).sort((a, b) => b.date - a.date);
    } catch (e) { return []; }
  }

  async createBackup(projectPath, maxBackups = 5, compressionLevel = 9) {
    const projectName = path.basename(projectPath);
    const backupsDir = this.getBackupsDir(projectPath);
    await fsp.mkdir(backupsDir, { recursive: true });

    const existing = await this.listBackups(projectPath);
    if (existing.length >= maxBackups) {
        const toDelete = existing.slice(maxBackups - 1);
        for (const backup of toDelete) {
            await fsp.unlink(backup.path).catch(e => console.warn(e));
        }
    }

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `${sanitizeFileName(projectName)}-${dateStr}.zip`;
    const outputPath = path.join(backupsDir, fileName);

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: compressionLevel } });

      output.on('close', () => {
        this._notifyProgress(projectPath, 100, false);
        resolve({ success: true, path: outputPath, size: archive.pointer() });
      });

      archive.on('error', (err) => {
        this._notifyProgress(projectPath, 0, false);
        reject(err);
      });

      archive.on('progress', () => {
        this._notifyProgress(projectPath, -1, true); 
      });

      archive.pipe(output);
      
      // Note : On ignore .git lors de la CRÉATION du backup pour ne pas l'alourdir inutilement
      // Mais lors de la RESTAURATION, on doit le protéger s'il existe déjà sur le disque.
      archive.glob('**/*', {
        cwd: projectPath,
        ignore: ['backups/**', 'build/**', '.gradle/**', 'run/**', '**/.DS_Store', '**/Thumbs.db', '**/.git/**']
      });

      this._notifyProgress(projectPath, 0, true);
      archive.finalize();
    });
  }

  async restoreBackup(projectPath, backupPath) {
      try {
          this._log(`=== RESTAURATION DÉMARRÉE ===`);
          
          const absProjectPath = path.resolve(projectPath);
          const absBackupPath = path.resolve(backupPath);

          this._log(`📂 Destination (Dossier Projet) : "${absProjectPath}"`);
          this._log(`📦 Source (Fichier Zip) : "${absBackupPath}"`);

          // 1. Vérification existence
          this._notifyRestoreProgress(projectPath, 0.1);
          try {
              await fsp.access(absBackupPath);
              this._log(`✅ Le fichier Zip est accessible.`);
          } catch (e) {
              throw new Error(`Fichier backup introuvable: ${absBackupPath}`);
          }
          
          // 2. Nettoyage
          this._log(`🧹 Nettoyage du dossier projet...`);
          const entries = await fsp.readdir(absProjectPath);
          let deletedCount = 0;
          
          for (const entry of entries) {
              const lowerEntry = entry.toLowerCase();

              // --- PROTECTION CRITIQUE ---
              // On ne touche pas au dossier 'backups' (archives)
              // On ne touche pas au dossier '.git' (historique de versionnage)
              if (lowerEntry === 'backups' || lowerEntry === '.git') {
                  this._log(`   🛡️ Dossier protégé (conservé) : ${entry}`);
                  continue;
              }
              
              const fullEntryPath = path.join(absProjectPath, entry);
              try {
                  await forceDeleteFolder(fullEntryPath);
                  deletedCount++;
              } catch (delErr) {
                  this._log(`   ⚠️ Impossible de supprimer: ${entry} (${delErr.message})`);
              }
          }
          this._log(`✅ Nettoyage terminé (${deletedCount} éléments supprimés).`);
          this._notifyRestoreProgress(projectPath, 0.4);

          // 3. Extraction
          this._log(`🚀 Extraction de l'archive...`);
          
          await extract(absBackupPath, { 
              dir: absProjectPath,
              onEntry: (entry) => {
                  // Log optionnel
              }
          });
          
          this._log(`✅ Extraction terminée.`);
          this._notifyRestoreProgress(projectPath, 1.0);
          
          // 4. Vérification
          const filesAfter = await fsp.readdir(absProjectPath);
          this._log(`📊 Fichiers dans le projet après restauration : ${filesAfter.length}`);
          this._log(`=== OPÉRATION RÉUSSIE ===`);

          return { success: true };

      } catch (error) {
          this._log(`❌ ERREUR CRITIQUE : ${error.message}`);
          this._log(`STACK : ${error.stack}`);
          this._notifyRestoreProgress(projectPath, 0); 
          return { success: false, message: error.message };
      }
  }

  async deleteBackup(backupPath) {
      try { await fsp.unlink(backupPath); return { success: true }; } catch (e) { return { success: false, message: e.message }; }
  }

  _notifyProgress(projectPath, percent, isRunning) {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('backup:progress', { projectId: projectPath, percent, isRunning });
      }
  }

  _notifyRestoreProgress(projectPath, percent) {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('backup:restore-progress', { 
              projectId: projectPath, 
              percent, 
              isRunning: percent < 1 
          });
      }
  }
}

export default BackupManager;