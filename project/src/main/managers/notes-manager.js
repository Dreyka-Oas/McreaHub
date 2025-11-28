// src/main/managers/notes-manager.js

import path from 'path';
import { readJsonSafe, writeJsonAtomic } from '../utils/file-system.js';

class NotesManager {
  constructor(userDataPath, settingsManager, githubApiManager) {
    this.notesFile = path.join(userDataPath, 'user-notes.json');
    this.settingsManager = settingsManager;
    this.githubApiManager = githubApiManager;
  }

  async getNotes() {
    const notes = await readJsonSafe(this.notesFile);
    return notes || [];
  }

  async saveNotes(notes) {
    // Nettoyage préventif : on s'assure que c'est un tableau d'objets propre
    const cleanNotes = Array.isArray(notes) ? notes : [];
    
    // 1. Sauvegarde Locale
    const success = await writeJsonAtomic(this.notesFile, cleanNotes);

    // 2. Sauvegarde Cloud (Push)
    if (success) {
        this._trySyncToGitHub(cleanNotes);
    }
    return success;
  }

  async saveLocalOnly(notes) {
      console.log('[NotesManager] Sauvegarde locale uniquement (Restauration).');
      return await writeJsonAtomic(this.notesFile, notes);
  }

  async _trySyncToGitHub(notes) {
      try {
          if (!this.settingsManager || !this.githubApiManager) return;
          const settings = await this.settingsManager.getSettings();
          const isSyncEnabled = settings.syncNotesToGithub !== false; 
          
          if (settings.githubToken && isSyncEnabled) {
              await this.githubApiManager.uploadNotesToGist(notes);
          }
      } catch (error) {
          console.error('[NotesManager] Erreur Push GitHub:', error);
      }
  }

  async syncFromGitHub() {
      if (!this.settingsManager || !this.githubApiManager) return { success: false };

      const settings = await this.settingsManager.getSettings();
      const isSyncEnabled = settings.syncNotesToGithub !== false;

      if (!settings.githubToken || !isSyncEnabled) return { success: false, message: "Sync désactivée ou pas de token" };

      console.log('[NotesManager] Démarrage de la synchronisation (Pull)...');
      
      const localNotes = await this.getNotes();
      const remoteResult = await this.githubApiManager.downloadNotesFromGist();

      if (!remoteResult.success) return remoteResult;
      const remoteNotes = remoteResult.notes;

      if (!remoteNotes || remoteNotes.length === 0) return { success: true, notes: localNotes };

      // Fusion intelligente
      const noteMap = new Map();
      localNotes.forEach(n => noteMap.set(n.id, n));

      let changesMade = false;
      remoteNotes.forEach(remoteNote => {
          const localNote = noteMap.get(remoteNote.id);
          if (!localNote) {
              noteMap.set(remoteNote.id, remoteNote);
              changesMade = true;
          } else {
              // Comparaison des timestamps (si corrompu, on prend le distant)
              const localTime = localNote.updatedAt || 0;
              const remoteTime = remoteNote.updatedAt || Date.now(); // Sécurité
              if (remoteTime > localTime) {
                  noteMap.set(remoteNote.id, remoteNote);
                  changesMade = true;
              }
          }
      });

      const mergedNotes = Array.from(noteMap.values());

      if (changesMade) {
          await this.saveLocalOnly(mergedNotes);
      }

      return { success: true, notes: mergedNotes };
  }
}

export default NotesManager;