// src/renderer/actions/note-actions.js

import { state } from '../state.js';
import { renderApp } from '../app.js';
import { debounce } from '../utils/dom.js';

const debouncedSave = debounce(async () => {
    try {
        await window.electronAPI.saveNotes(state.notes);
        console.log('[Notes] Sauvegarde locale effectuée.');
    } catch (e) {
        console.error('[Notes] Erreur de sauvegarde:', e);
    }
}, 500);

export async function loadNotes() {
    try {
        state.notes = await window.electronAPI.getNotes();
        
        // Migration
        state.notes = state.notes.map(n => {
            if (n.projectId && !n.projectIds) { n.projectIds = [n.projectId]; delete n.projectId; }
            if (!n.projectIds) n.projectIds = [];
            if (!n.createdAt) n.createdAt = n.updatedAt || Date.now();
            if (!n.updatedAt) n.updatedAt = n.createdAt;
            return n;
        });
        renderApp();
        
        // --- PLUS DE SYNCHRO AUTO ICI ---

    } catch (e) {
        console.error('[Notes] Impossible de charger les notes:', e);
    }
}

export async function syncNotesFromGithub() {
    if (state.ui.activeSync) return; 
    
    console.log('[Actions] Démarrage synchro globale...');
    state.ui.activeSync = true;
    renderApp();

    try {
        const result = await window.electronAPI.syncGlobal(); 
        
        if (result.success && result.restoredCount !== undefined) {
            const freshNotes = await window.electronAPI.getNotes();
            state.notes = freshNotes;
            console.log(`[Actions] Synchro terminée. ${result.restoredCount} éléments restaurés.`);
        } else if (result.message) {
            console.warn('[Actions] Sync warning:', result.message);
        }
    } catch (e) {
        console.error('[Actions] Erreur sync:', e);
    } finally {
        setTimeout(() => {
            state.ui.activeSync = false;
            renderApp();
        }, 1000);
    }
}

export function createNote({ title, content, type, color, projectIds }) {
    const now = Date.now();
    const newNote = {
        id: crypto.randomUUID(),
        title: title || 'Nouvelle Note',
        content: content || '',
        type: type || 'note', 
        color: color || 'default',
        projectIds: projectIds || [], 
        isCompleted: false,
        createdAt: now, 
        updatedAt: now
    };
    
    state.notes.unshift(newNote);
    renderApp();
    debouncedSave();
}

export function updateNote(id, updates, options = {}) {
    const noteIndex = state.notes.findIndex(n => n.id === id);
    if (noteIndex !== -1) {
        const updatedNote = { 
            ...state.notes[noteIndex], 
            ...updates
        };

        if (!options.skipDateUpdate) {
            updatedNote.updatedAt = Date.now();
        }

        state.notes[noteIndex] = updatedNote;
        renderApp();
        debouncedSave();
    }
}

export function toggleTaskCompletion(id) {
    const note = state.notes.find(n => n.id === id);
    if (note && note.type === 'task') {
        updateNote(id, { isCompleted: !note.isCompleted }, { skipDateUpdate: true });
    }
}

export function deleteNote(id) {
    state.notes = state.notes.filter(n => n.id !== id);
    renderApp();
    debouncedSave();
}