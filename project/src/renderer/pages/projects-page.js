// src/renderer/pages/projects-page.js

import { html } from '../../../node_modules/lit-html/lit-html.js';
import { classMap } from '../../../node_modules/lit-html/directives/class-map.js';
import { state } from '../state.js';
import { renderApp } from '../app.js';

// --- IMPORTS DIRECTS (CORRECTION CYCLE) ---
import { scanForProjects } from '../actions/project-actions.js';
import { manageProjectSources, showCreateNewProjectModal, showCloneProjectModal } from '../actions/project-modals.js';
import { ProjectCard } from '../components/project-card.js';

// État local pour la recherche
let projectSearchQuery = '';

function handleSearch(e) {
    projectSearchQuery = e.target.value.toLowerCase();
    renderApp();
}

function renderProjectGrid() {
  const projects = Array.isArray(state.projects) ? state.projects : [];
  const sources = Array.isArray(state.projectSources) ? state.projectSources : [];

  // CAS 1 : Aucune source
  if (sources.length === 0) {
    return html`
      <div class="empty-state">
        <div style="background: var(--color-background-tertiary); padding: 20px; border-radius: 50%; margin-bottom: 20px;">
            <svg style="width:48px;height:48px;opacity:0.6; color: var(--color-accent-blue);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
        </div>
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Aucune source configurée</h3>
        <p style="max-width: 400px; margin-bottom: 24px; opacity: 0.7;">Pour que McreaHub détecte vos espaces de travail, ajoutez le dossier parent où ils sont stockés.</p>
        <button class="card-button btn-primary" @click=${manageProjectSources}>Ajouter un dossier source</button>
      </div>`;
  }

  // Filtrage
  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(projectSearchQuery));

  // CAS 2 : Aucun projet
  if (filteredProjects.length === 0) {
    const isSearching = projectSearchQuery.length > 0;
    return html`
      <div class="empty-state">
        <div style="background: var(--color-background-tertiary); padding: 20px; border-radius: 50%; margin-bottom: 20px;">
            <svg style="width:48px;height:48px;opacity:0.5;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
        </div>
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">${isSearching ? 'Aucun résultat' : 'Aucun projet trouvé'}</h3>
        <p style="opacity: 0.7;">${isSearching ? 'Essayez une autre recherche.' : 'Vos dossiers sources semblent vides.'}</p>
        ${!isSearching ? html`
            <div style="display:flex; gap:10px; margin-top:16px;">
                <button class="card-button btn-secondary" @click=${() => scanForProjects()}>Actualiser</button>
                <button class="card-button btn-primary" @click=${showCreateNewProjectModal}>Créer un projet</button>
            </div>
        ` : ''}
      </div>`;
  }

  // CAS 3 : Affichage
  return html`
    <div class="project-grid">
      ${filteredProjects.map(project => {
          // Sécurité : si ProjectCard est indéfini à cause d'un cycle, on évite le crash complet
          return (typeof ProjectCard === 'function') ? ProjectCard(project) : html`<div>Erreur de chargement composant</div>`;
      })}
    </div>
  `;
}

export function ProjectsPage() {
  const projects = Array.isArray(state.projects) ? state.projects : [];
  const filteredCount = projects.filter(p => p.name.toLowerCase().includes(projectSearchQuery)).length;

  return html`
    <div class="page">
      
      <div class="page-header" style="align-items: flex-start;">
        <div class="page-header-left" style="flex-direction: column; align-items: flex-start; gap: 4px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <h1 class="page-title" style="margin: 0;">Mes Projets</h1>
            <span class="version-counter-badge">${filteredCount}</span>
          </div>
          <p class="page-subtitle">Gérez vos espaces de travail MCreator locaux.</p>
        </div>
        
        <div class="page-header-right" style="margin-top: 5px; gap: 8px;">
            
            <button class="header-button-icon refresh-button ${classMap({loading: state.ui.isLoading})}" @click=${() => scanForProjects()} title="Actualiser la liste">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138a.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd" /></svg>
            </button>

            <button class="header-button-icon" @click=${manageProjectSources} title="Gérer les sources">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 0 1 2-2h5.25a2 2 0 0 1 1.77.88l1.44 2.16a1 1 0 0 0 .88.44H16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z"></path></svg>
            </button>

            ${state.appConfig.features.github && state.appSettings.githubToken ? html`
                <button class="header-button-icon" @click=${showCloneProjectModal} title="Cloner depuis GitHub">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM5.555 17.776l8-16 .894.448-8 16-.894-.448z" clip-rule="evenodd" /></svg>
                </button>
            ` : ''}

            <button class="card-button btn-primary" style="margin-left: 8px;" @click=${showCreateNewProjectModal}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;margin-right:6px"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
                Nouveau
            </button>

        </div>
      </div>

      <div class="page-content-scrollable">
        ${projects.length > 0 ? html`
        <div class="versions-toolbar" style="margin-bottom: 24px;">
            <div class="search-container">
                <svg class="search-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" /></svg>
                <input type="text" class="search-input" placeholder="Rechercher un projet..." .value=${projectSearchQuery} @input=${handleSearch}>
            </div>
        </div>
        ` : ''}

        ${renderProjectGrid()}
      </div>
    </div>
  `;
}