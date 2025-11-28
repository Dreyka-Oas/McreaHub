// src/renderer/app.js

import { html, render } from '../../node_modules/lit-html/lit-html.js';
import { until } from '../../node_modules/lit-html/directives/until.js';
import { classMap } from '../../node_modules/lit-html/directives/class-map.js';
import { state } from './state.js';

// Import des composants critiques (chargés immédiatement)
import { Sidebar } from './components/sidebar.js';
import { Loader } from './components/loader.js';

const appRoot = document.getElementById('app');

// Spinner temporaire pendant le chargement d'une page (Première fois uniquement)
const pageLoader = html`
  <div style="display:flex; justify-content:center; align-items:center; height:100%; width:100%;">
    <div class="spinner-large"></div>
  </div>
`;

// --- SYSTÈME DE CACHE (ANTI-CLIGNOTEMENT) ---
// On stocke les fonctions de rendu des pages une fois chargées
const moduleCache = {};

/**
 * Charge une page de manière optimisée.
 * Si la page est déjà en mémoire, l'affiche instantanément (sans spinner).
 * Sinon, télécharge le fichier JS et affiche le spinner.
 */
function loadCachedPage(pageId, importPromise, exportName) {
  // 1. Si le module est déjà chargé, on l'exécute directement (Rendu Synchrone)
  if (moduleCache[pageId]) {
    try {
      return moduleCache[pageId]();
    } catch (e) {
      console.error(`Erreur rendu page ${pageId}:`, e);
      return html`<div class="empty-state">Erreur de rendu</div>`;
    }
  }

  // 2. Sinon, on utilise 'until' pour gérer l'asynchrone (Rendu Asynchrone avec Spinner)
  return until(
    importPromise.then(module => {
      // On met en cache la fonction de rendu pour la prochaine fois
      moduleCache[pageId] = module[exportName];
      return moduleCache[pageId]();
    }).catch(err => {
      console.error(`Impossible de charger la page ${pageId}:`, err);
      return html`
        <div class="empty-state">
            <h3>Erreur de chargement</h3>
            <p>${err.message}</p>
        </div>`;
    }),
    pageLoader
  );
}

function renderActivePage() {
  switch (state.activePage) {
    case 'projects':
      return loadCachedPage('projects', import('./pages/projects-page.js'), 'ProjectsPage');
      
    case 'versions':
      return loadCachedPage('versions', import('./pages/versions-page.js'), 'VersionsPage');
      
    case 'installed':
      return loadCachedPage('installed', import('./pages/installed-versions-page.js'), 'InstalledVersionsPage');
      
    case 'settings':
      return loadCachedPage('settings', import('./pages/settings-page.js'), 'SettingsPage');
      
    case 'mcreatorSettings':
      return loadCachedPage('mcreatorSettings', import('./pages/mcreator-settings-page.js'), 'MCreatorSettingsPage');
      
    case 'changelog':
      return loadCachedPage('changelog', import('./pages/changelog-page.js'), 'ChangelogPage');
      
    case 'notes':
      return loadCachedPage('notes', import('./pages/notes-page.js'), 'NotesPage');
      
    default:
      return loadCachedPage('projects', import('./pages/projects-page.js'), 'ProjectsPage');
  }
}

export function renderApp() {
  const mainContentClasses = {
    'page-exit': state.ui.pageTransitionState === 'exiting',
    'page-enter': state.ui.pageTransitionState === 'entering',
    'page-enter-active': state.ui.pageTransitionState === 'entering-active',
  };

  const appTemplate = html`
    <!-- Loader Global (Actions bloquantes comme le Clone ou l'Init) -->
    ${Loader(state.ui.isLoading)}

    <!-- Sidebar toujours présente -->
    ${Sidebar(
      state.activePage,
      state.ui.downloads
    )}

    <!-- Contenu Principal -->
    <main id="main-content" class=${classMap(mainContentClasses)}>
      ${renderActivePage()}
    </main>
  `;

  render(appTemplate, appRoot);
}