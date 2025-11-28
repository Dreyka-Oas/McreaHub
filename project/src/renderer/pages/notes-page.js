// src/renderer/pages/notes-page.js

import { html, render } from '../../../node_modules/lit-html/lit-html.js';
import { keyed } from '../../../node_modules/lit-html/directives/keyed.js';
import { state } from '../state.js';
import { renderApp } from '../app.js'; 
import { loadNotes, createNote, updateNote, deleteNote, toggleTaskCompletion } from '../actions/note-actions.js';
import { formatDate } from '../utils/formatters.js';

let activeProjectFilter = 'all';
let activeTypeFilter = 'all'; 
let activeSort = 'date-desc';

let editingNoteId = null;
let modalState = { title: '', content: '', type: 'note', color: 'blue', projectIds: [] };

const iconTrash = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width:14px;height:14px"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" /></svg>`;

// Icône "Pipette/Stylo" pour le bouton custom
const iconPen = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>`; 

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function updateGliders() {
    const controls = document.querySelectorAll('.page-header .segmented-control');
    controls.forEach(control => {
        const activeBtn = control.querySelector('.active');
        const glider = control.querySelector('.segment-glider');
        if (activeBtn && glider) {
            glider.style.width = `${activeBtn.offsetWidth}px`;
            glider.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
        }
    });
}

function updateModalGlider() {
    const container = document.getElementById('note-modal-container');
    if (!container) return;
    const control = container.querySelector('.note-type-selector');
    if (!control) return;
    const activeBtn = control.querySelector('.note-type-option.active');
    const glider = control.querySelector('.modal-glider');
    if (activeBtn && glider) {
        void activeBtn.offsetWidth;
        glider.style.width = `${activeBtn.offsetWidth}px`;
        glider.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
    }
}

window.addEventListener('resize', () => {
    updateGliders();
    updateModalGlider();
});

function closeModalWithAnimation(container) {
    if (!container) return;
    container.classList.remove('visible');
    setTimeout(() => { if (container.parentNode) container.parentNode.removeChild(container); }, 150);
}

function handleFilterClick(event, type, value) {
    event.stopPropagation();
    if (type === 'project') activeProjectFilter = value;
    if (type === 'sort') activeSort = value;
    const menu = event.target.closest('.filter-menu');
    if (menu) menu.classList.remove('active');
    renderApp();
}

function toggleDropdown(event) {
    event.stopPropagation();
    const button = event.currentTarget;
    const menu = button.nextElementSibling;
    document.querySelectorAll('.filter-menu.active').forEach(m => { if (m !== menu) m.classList.remove('active'); });
    if (menu) {
        const isActive = menu.classList.toggle('active');
        if (isActive) {
            const closeMenu = (e) => {
                if (!button.contains(e.target)) {
                    menu.classList.remove('active');
                    window.removeEventListener('click', closeMenu, { capture: true });
                }
            };
            window.addEventListener('click', closeMenu, { capture: true });
            const selectedItem = menu.querySelector('.selected');
            if (selectedItem) setTimeout(() => selectedItem.scrollIntoView({ block: 'nearest', behavior: 'auto' }), 0);
        }
    }
}

function openNoteModal(note = null) {
    if (note) {
        editingNoteId = note.id;
        modalState = { ...note, projectIds: [...(note.projectIds || [])] };
    } else {
        editingNoteId = null;
        modalState = { title: '', content: '', type: 'note', color: 'blue', projectIds: [] };
    }
    renderModal();
}

function closeNoteModal() {
    const container = document.getElementById('note-modal-container');
    closeModalWithAnimation(container);
}

function saveModal() {
    if (editingNoteId) updateNote(editingNoteId, modalState);
    else createNote(modalState);
    closeNoteModal();
}

function toggleProjectSelection(projectPath) {
    const index = modalState.projectIds.indexOf(projectPath);
    if (index === -1) modalState.projectIds.push(projectPath);
    else modalState.projectIds.splice(index, 1);
    renderModal();
}

function clearProjectSelection() {
    modalState.projectIds = [];
    renderModal();
}

function setModalType(type) {
    modalState.type = type;
    renderModal(); 
    setTimeout(updateModalGlider, 0);
}

function handleCustomColor(e) {
    modalState.color = e.target.value;
    renderModal();
}

function renderModal() {
    let container = document.getElementById('note-modal-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'note-modal-container';
        container.className = 'modal-overlay';
        document.body.appendChild(container);
        requestAnimationFrame(() => { requestAnimationFrame(() => container.classList.add('visible')); });
    }

    const projects = state.projects || [];
    const count = modalState.projectIds.length;
    let selectedText = 'Lier à un projet...';
    if (count === 1) {
        const p = projects.find(proj => proj.projectFolderPath === modalState.projectIds[0]);
        selectedText = p ? p.name : '1 projet';
    } else if (count > 1) { selectedText = `${count} projets`; }

    // Liste exacte des couleurs correspondant au CSS .bg-XXX
    const colors = [
        'blue', 'green', 'orange', 'red', 'purple',
        'pink', 'teal', 'yellow', 'indigo'
    ];

    // Vérifie si la couleur actuelle est personnalisée (hexadécimal)
    const isCustomColor = modalState.color.startsWith('#');

    const template = html`
        <div class="modal-content" @click=${e => e.stopPropagation()} style="max-width: 650px; padding: 30px; overflow: visible;">
            
            <div class="note-modal-header">
                <div class="note-type-selector">
                    <div class="modal-glider"></div>
                    <div class="note-type-option ${modalState.type === 'note' ? 'active' : ''}" @click=${() => setModalType('note')}>Note</div>
                    <div class="note-type-option ${modalState.type === 'task' ? 'active' : ''}" @click=${() => setModalType('task')}>Tâche</div>
                </div>
                
                ${editingNoteId ? html`
                    <button class="delete-note-btn" title="Supprimer cette note" @click=${() => { deleteNote(editingNoteId); closeNoteModal(); }}>
                        ${iconTrash} Supprimer
                    </button>
                ` : ''}
            </div>

            <input type="text" class="note-input-title" placeholder="Titre de la note" 
                   .value=${modalState.title} @input=${e => modalState.title = e.target.value} autofocus>
            
            <textarea class="note-input-content custom-scroll" placeholder="Commencez à écrire..." 
                      .value=${modalState.content} @input=${e => modalState.content = e.target.value}></textarea>

            <div class="note-modal-toolbar">
                
                <div class="mini-color-picker">
                    ${colors.map(c => html`
                        <div class="mini-swatch bg-${c} ${modalState.color === c ? 'selected' : ''}" 
                             @click=${() => { modalState.color = c; renderModal(); }}>
                        </div>
                    `)}
                    
                    <!-- BOUTON COULEUR PERSONNALISÉE STYLISÉ -->
                    <div class="mini-swatch custom-picker-wrapper ${isCustomColor ? 'selected' : ''}">
                        <!-- Fond Arc-en-ciel (Ring) -->
                        <div class="rainbow-ring"></div>
                        
                        <!-- Centre (Couleur choisie ou par défaut) -->
                        <div class="custom-center" style="${isCustomColor ? `background-color: ${modalState.color};` : ''}">
                            <div class="picker-icon">${iconPen}</div>
                        </div>

                        <!-- Input caché -->
                        <input type="color" class="hidden-color-input" 
                               .value=${isCustomColor ? modalState.color : '#ffffff'}
                               @input=${handleCustomColor} 
                               @click=${e => e.stopPropagation()}>
                    </div>
                </div>

                <div class="filter-container" style="min-width: 180px;">
                    <button class="filter-button" style="height: 36px; background: transparent; border-color: var(--color-separator-translucent);" @click=${toggleDropdown}>
                        <span class="filter-value" style="font-size: 12px;">${selectedText}</span>
                        <svg viewBox="0 0 20 20" fill="currentColor" style="width: 14px; height: 14px;"><path fill-rule="evenodd" d="m5.22 8.22 4.25 4.25a.75.75 0 0 0 1.06 0l4.25-4.25a.75.75 0 0 0-1.06-1.06L10 10.94 6.28 7.16a.75.75 0 0 0-1.06 1.06Z" clip-rule="evenodd" /></svg>
                    </button>
                    <div class="filter-menu upward-menu" style="width: 100%; max-height: 180px; overflow-y: auto;">
                        <div class="filter-menu-item ${count === 0 ? 'selected' : ''}" @click=${(e) => { e.stopPropagation(); clearProjectSelection(); }}>
                            Aucun projet
                            ${count === 0 ? html`<span style="float:right; color:var(--color-accent-blue);">✓</span>` : ''}
                        </div>
                        <div style="height: 1px; background: var(--color-separator-translucent); margin: 4px 0;"></div>
                        ${projects.map(p => {
                            const isSelected = modalState.projectIds.includes(p.projectFolderPath);
                            return html`
                            <div class="filter-menu-item ${isSelected ? 'selected' : ''}" @click=${(e) => { e.stopPropagation(); toggleProjectSelection(p.projectFolderPath); }}>
                                ${p.name}
                                ${isSelected ? html`<span style="float:right; color:var(--color-accent-blue);">✓</span>` : ''}
                            </div>
                        `})}
                    </div>
                </div>

                <div style="display: flex; gap: 10px; margin-left: auto;">
                    <button class="card-button btn-secondary" @click=${closeNoteModal}>Annuler</button>
                    <button class="card-button btn-primary" @click=${saveModal}>Enregistrer</button>
                </div>
            </div>
        </div>
    `;
    render(template, container);
    setTimeout(updateModalGlider, 0);
}

export function NotesPage() {
    if (!state.appConfig.features.notes) return html`<div class="empty-state">Fonctionnalité réservée à la version Extras.</div>`;

    if (!state.notesLoaded) {
        loadNotes();
        state.notesLoaded = true;
    }

    const allNotes = state.notes || [];
    const projects = state.projects || [];

    let filteredNotes = allNotes.filter(n => {
        if (activeProjectFilter !== 'all') {
            if (!n.projectIds || !n.projectIds.includes(activeProjectFilter)) return false;
        }
        if (activeTypeFilter === 'note' && n.type !== 'note') return false;
        if (activeTypeFilter === 'task' && n.type !== 'task') return false;
        return true;
    });

    filteredNotes.sort((a, b) => {
        if (activeSort === 'date-desc') return b.createdAt - a.createdAt;
        if (activeSort === 'date-asc') return a.createdAt - b.createdAt;
        if (activeSort === 'az') return (a.title || '').localeCompare(b.title || '');
        if (activeSort === 'za') return (b.title || '').localeCompare(a.title || '');
        return 0;
    });

    const totalTasks = allNotes.filter(n => n.type === 'task').length;
    const completedTasks = allNotes.filter(n => n.type === 'task' && n.isCompleted).length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const totalNotes = allNotes.filter(n => n.type === 'note').length;

    const currentFilterName = activeProjectFilter === 'all' 
        ? 'Tous les projets' 
        : (projects.find(p => p.projectFolderPath === activeProjectFilter)?.name || 'Projet inconnu');

    const sortLabels = { 'date-desc': 'Plus récent', 'date-asc': 'Plus ancien', 'az': 'Nom (A-Z)', 'za': 'Nom (Z-A)' };

    requestAnimationFrame(() => setTimeout(updateGliders, 0));

    return html`
        <div class="page">
            <div class="page-header">
                <div class="page-header-left">
                    <h1 class="page-title">Mes Notes</h1>
                    <div class="segmented-control">
                        <div class="segment-glider"></div>
                        <button class="${activeTypeFilter === 'all' ? 'active' : ''}" @click=${() => { activeTypeFilter = 'all'; renderApp(); }}>Tout</button>
                        <button class="${activeTypeFilter === 'note' ? 'active' : ''}" @click=${() => { activeTypeFilter = 'note'; renderApp(); }}>Notes</button>
                        <button class="${activeTypeFilter === 'task' ? 'active' : ''}" @click=${() => { activeTypeFilter = 'task'; renderApp(); }}>Tâches</button>
                    </div>
                </div>
                <div class="page-header-right">
                    <div class="filter-container">
                        <button class="filter-button" @click=${toggleDropdown}>
                            <span class="filter-label">Projet:</span>
                            ${keyed(currentFilterName, html`<span class="filter-value">${currentFilterName}</span>`)}
                            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="m5.22 8.22 4.25 4.25a.75.75 0 0 0 1.06 0l4.25-4.25a.75.75 0 0 0-1.06-1.06L10 10.94 6.28 7.16a.75.75 0 0 0-1.06 1.06Z" clip-rule="evenodd" /></svg>
                        </button>
                        <div class="filter-menu">
                            <div class="filter-menu-item ${activeProjectFilter === 'all' ? 'selected' : ''}" @click=${(e) => handleFilterClick(e, 'project', 'all')}>Tous les projets</div>
                            ${projects.map(p => html`
                                <div class="filter-menu-item ${activeProjectFilter === p.projectFolderPath ? 'selected' : ''}" @click=${(e) => handleFilterClick(e, 'project', p.projectFolderPath)}>${p.name}</div>`
                            )}
                        </div>
                    </div>
                    <div class="filter-container">
                        <button class="filter-button" @click=${toggleDropdown}>
                            <span class="filter-label">Trier par:</span>
                            ${keyed(sortLabels[activeSort], html`<span class="filter-value">${sortLabels[activeSort]}</span>`)}
                            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="m5.22 8.22 4.25 4.25a.75.75 0 0 0 1.06 0l4.25-4.25a.75.75 0 0 0-1.06-1.06L10 10.94 6.28 7.16a.75.75 0 0 0-1.06 1.06Z" clip-rule="evenodd" /></svg>
                        </button>
                        <div class="filter-menu">
                            <div class="filter-menu-item ${activeSort === 'date-desc' ? 'selected' : ''}" @click=${(e) => handleFilterClick(e, 'sort', 'date-desc')}>Plus récent</div>
                            <div class="filter-menu-item ${activeSort === 'date-asc' ? 'selected' : ''}" @click=${(e) => handleFilterClick(e, 'sort', 'date-asc')}>Plus ancien</div>
                            <div class="filter-menu-item ${activeSort === 'az' ? 'selected' : ''}" @click=${(e) => handleFilterClick(e, 'sort', 'az')}>Nom (A-Z)</div>
                            <div class="filter-menu-item ${activeSort === 'za' ? 'selected' : ''}" @click=${(e) => handleFilterClick(e, 'sort', 'za')}>Nom (Z-A)</div>
                        </div>
                    </div>
                    <button class="header-button-icon btn-primary" style="width: auto; padding: 0 16px; color: white;" @click=${() => openNoteModal()}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="margin-right: 6px;"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/></svg>
                        Nouvelle Note
                    </button>
                </div>
            </div>

            <div class="page-content-scrollable">
                <div class="stats-bar">
                    <div class="stat-item"><div class="stat-value">${totalNotes}</div><div class="stat-label">Notes</div></div>
                    <div class="stat-item"><div class="stat-value">${totalTasks - completedTasks}</div><div class="stat-label">À faire</div></div>
                    <div class="progress-ring-container">
                        <span class="progress-label">Tâches complétées</span>
                        <div class="progress-track"><div class="progress-fill" style="width: ${progress}%"></div></div>
                        <span class="progress-text">${Math.round(progress)}%</span>
                    </div>
                </div>

                <div class="notes-grid">
                    ${filteredNotes.length === 0 ? html`
                            <div class="notes-empty">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" stroke-linecap="round" stroke-linejoin="round" /></svg>
                                <h3>C'est bien vide ici</h3>
                                <p>Créez une note ou une liste de tâches pour organiser vos idées.</p>
                            </div>` : 
                            
                            filteredNotes.map(note => keyed(note.id, (() => {
                                const linkedProjects = [];
                                if (note.projectIds && note.projectIds.length > 0) {
                                    note.projectIds.forEach(pid => {
                                        const p = projects.find(proj => proj.projectFolderPath === pid);
                                        if (p) linkedProjects.push(p);
                                    });
                                }

                                // Calcul des styles dynamiques si couleur personnalisée
                                let customStyles = '';
                                let cardClass = `note-card color-${note.color} type-${note.type}`;
                                
                                if (note.color && note.color.startsWith('#')) {
                                    cardClass = `note-card type-${note.type}`;
                                    const rgb = hexToRgb(note.color);
                                    if (rgb) {
                                        const bg = `linear-gradient(145deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.03))`;
                                        const border = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`;
                                        customStyles = `background: ${bg}; border-color: ${border};`;
                                    }
                                }

                                return html`
                                <div id="note-${note.id}" 
                                     class="${cardClass} ${note.isCompleted ? 'completed' : ''}" 
                                     style="${customStyles}"
                                     @click=${() => openNoteModal(note)}>
                                    
                                    <div class="note-header">
                                        ${note.type === 'task' ? html`<div class="task-checkbox-container" @click=${(e) => { e.stopPropagation(); toggleTaskCompletion(note.id); }}><div class="task-checkbox">${note.isCompleted ? html`<svg style="width:14px;height:14px;color:white" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>` : ''}</div></div>` : ''}
                                        <div class="note-title">${note.title || 'Sans titre'}</div>
                                    </div>
                                    <div class="note-content-preview">${note.content}</div>
                                    <div class="note-footer">
                                        <div class="project-badges-list">${linkedProjects.map(p => html`<span class="project-badge">${p.name}</span>`)}</div>
                                        <span class="note-date">${formatDate(note.createdAt)}</span>
                                    </div>
                                </div>`;
                            })()))
                    }
                </div>
            </div>
        </div>
    `;
}