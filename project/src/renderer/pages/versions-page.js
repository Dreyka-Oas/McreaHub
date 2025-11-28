// src/renderer/pages/versions-page.js

import { html } from '../../../node_modules/lit-html/lit-html.js';
import { classMap } from '../../../node_modules/lit-html/directives/class-map.js';
import { state } from '../state.js';
import { setVersionsFilter, refreshReleases } from '../actions/index.js';
import { VersionCard } from '../components/version-card.js';
import { Pagination } from '../components/pagination.js';
import { formatTime } from '../utils/formatters.js';
import { renderApp } from '../app.js';

// ... (Le début du fichier avec les fonctions handleFilterMenuClick, toggleFilterMenu reste identique) ...
// ... (Je ne remets pas tout le code du haut pour gagner de la place, le changement est dans le return html) ...

let currentPage = 1;

function handleFilterMenuClick(event, filterType, value) {
    if (filterType === 'loader' && state.ui.versionsFilter.mcVersion !== 'all') {
        setVersionsFilter('mcVersion', 'all');
    }
    if (filterType === 'mcVersion' && state.ui.versionsFilter.loader !== 'all') {
        setVersionsFilter('loader', 'all'); 
    }
    setVersionsFilter(filterType, value);
    currentPage = 1;
    const menu = event.target.closest('.filter-menu');
    if (menu) menu.classList.remove('active');
}

function toggleFilterMenu(event) {
    event.stopPropagation();
    const button = event.currentTarget;
    const menu = button.nextElementSibling;
    document.querySelectorAll('.filter-menu.active').forEach(m => {
        if (m !== menu) m.classList.remove('active');
    });
    if (menu) {
        const isActive = menu.classList.toggle('active');
        if (isActive) {
            const closeMenu = () => {
                menu.classList.remove('active');
                document.removeEventListener('click', closeMenu);
            };
            document.addEventListener('click', closeMenu);
            const selectedItem = menu.querySelector('.selected');
            if (selectedItem) {
                setTimeout(() => {
                    selectedItem.scrollIntoView({ block: 'nearest', behavior: 'auto' });
                }, 0);
            }
        }
    }
}

export function VersionsPage() {
  const { searchQuery, type, mcVersion, loader } = state.ui.versionsFilter;
  
  // Filtrage (Identique à avant)
  const filteredVersions = state.allVersions.filter(version => {
    const matchesSearch = version.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = type === 'all' || (type === 'stable' && !version.prerelease) || (type === 'eap' && version.prerelease);
    const matchesMc = mcVersion === 'all' || (version.mc_versions && version.mc_versions.includes(mcVersion));
    const matchesLoader = loader === 'all' || (version.supported_loaders && version.supported_loaders.includes(loader));
    return matchesSearch && matchesType && matchesMc && matchesLoader;
  });

  // Options dynamiques (Identique à avant)
  const versionsForMcList = state.allVersions.filter(version => {
      const matchesType = type === 'all' || (type === 'stable' && !version.prerelease) || (type === 'eap' && version.prerelease);
      const matchesLoader = loader === 'all' || (version.supported_loaders && version.supported_loaders.includes(loader));
      return matchesType && matchesLoader;
  });
  const uniqueMcVersions = [...new Set(versionsForMcList.flatMap(v => v.mc_versions || []))].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  const versionsForLoaderList = state.allVersions.filter(version => {
      const matchesType = type === 'all' || (type === 'stable' && !version.prerelease) || (type === 'eap' && version.prerelease);
      const matchesMc = mcVersion === 'all' || (version.mc_versions && version.mc_versions.includes(mcVersion));
      return matchesType && matchesMc;
  });
  const uniqueLoaders = [...new Set(versionsForLoaderList.flatMap(v => v.supported_loaders || []))].sort();

  const mcVersionOptions = { all: 'Toutes les versions MC', ...Object.fromEntries(uniqueMcVersions.map(v => [v, v])) };
  const typeFilterOptions = { all: 'Toutes', stable: 'Stables', eap: 'EAP' };
  const loaderFilterOptions = { all: 'Tous les loaders' };
  uniqueLoaders.forEach(l => { loaderFilterOptions[l] = l; });

  // Pagination (Identique à avant)
  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(filteredVersions.length / ITEMS_PER_PAGE);
  if (currentPage > totalPages && totalPages > 0) currentPage = 1;
  if (currentPage < 1) currentPage = 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const versionsForPage = filteredVersions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return html`
    <div class="page page-with-footer">
      <!-- HEADER REDESIGNÉ -->
      <div class="page-header" style="align-items: flex-start;">
        <div class="page-header-left" style="flex-direction: column; align-items: flex-start; gap: 4px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <h1 class="page-title" style="margin: 0;">Catalogue MCreator</h1>
            <span class="version-counter-badge">${filteredVersions.length}</span>
          </div>
          <p class="page-subtitle">Explorez, téléchargez et installez toutes les versions officielles.</p>
        </div>
        
        <div class="page-header-right" style="margin-top: 5px;">
            <div class="sync-info-container">
                <span class="sync-dot"></span>
                Dernière synchro : ${formatTime(state.ui.lastSyncInfo.timestamp)}
            </div>
            <button class="header-button-icon refresh-button ${classMap({loading: state.ui.isLoading})}" @click=${refreshReleases} title="Forcer l'actualisation">
                <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138a.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd"></path></svg>
            </button>
        </div>
      </div>

      <div class="page-content-scrollable">
        <!-- BARRE D'OUTILS (Inchangée) -->
        <div class="versions-toolbar">
            <div class="search-container">
                <svg class="search-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" /></svg>
                <input type="text" class="search-input" placeholder="Rechercher une version (ex: 2024.1)..." .value=${searchQuery} @input=${(e) => { setVersionsFilter('searchQuery', e.target.value); currentPage = 1; }}>
            </div>

            <div class="filters-group">
                <!-- TYPE -->
                <div class="filter-container">
                    <button class="filter-button" @click=${toggleFilterMenu}>
                        <span class="filter-label">Type:</span><span class="filter-value">${typeFilterOptions[type]}</span>
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="m5.22 8.22 4.25 4.25a.75.75 0 0 0 1.06 0l4.25-4.25a.75.75 0 0 0-1.06-1.06L10 10.94 6.28 7.16a.75.75 0 0 0-1.06 1.06Z" clip-rule="evenodd" /></svg>
                    </button>
                    <div class="filter-menu">
                        ${Object.entries(typeFilterOptions).map(([key, value]) => html`<div class="filter-menu-item ${key === type ? 'selected' : ''}" @click=${(e) => handleFilterMenuClick(e, 'type', key)}>${value}</div>`)}
                    </div>
                </div>

                <!-- LOADER -->
                <div class="filter-container">
                    <button class="filter-button" @click=${toggleFilterMenu}>
                        <span class="filter-label">Loader:</span><span class="filter-value">${loaderFilterOptions[loader] || loader}</span>
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="m5.22 8.22 4.25 4.25a.75.75 0 0 0 1.06 0l4.25-4.25a.75.75 0 0 0-1.06-1.06L10 10.94 6.28 7.16a.75.75 0 0 0-1.06 1.06Z" clip-rule="evenodd" /></svg>
                    </button>
                    <div class="filter-menu">
                        ${Object.entries(loaderFilterOptions).map(([key, value]) => html`<div class="filter-menu-item ${key === loader ? 'selected' : ''}" @click=${(e) => handleFilterMenuClick(e, 'loader', key)}>${value}</div>`)}
                    </div>
                </div>

                <!-- MINECRAFT -->
                <div class="filter-container">
                    <button class="filter-button" @click=${toggleFilterMenu}>
                        <span class="filter-label">Minecraft:</span><span class="filter-value">${mcVersionOptions[mcVersion] || mcVersion}</span>
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="m5.22 8.22 4.25 4.25a.75.75 0 0 0 1.06 0l4.25-4.25a.75.75 0 0 0-1.06-1.06L10 10.94 6.28 7.16a.75.75 0 0 0-1.06 1.06Z" clip-rule="evenodd" /></svg>
                    </button>
                    <div class="filter-menu" style="max-height: 400px;">
                        ${Object.entries(mcVersionOptions).map(([key, value]) => html`<div class="filter-menu-item ${key === mcVersion ? 'selected' : ''}" @click=${(e) => handleFilterMenuClick(e, 'mcVersion', key)}>${value}</div>`)}
                    </div>
                </div>
            </div>
        </div>

        <div id="version-grid-container">
            ${versionsForPage.length === 0 ? html`<div class="empty-state"><h3>Aucune version trouvée</h3></div>` : html`<div class="version-grid-fixed">${versionsForPage.map(v => VersionCard(v))}</div>`}
        </div>
        
        <div id="pagination-container">
            ${Pagination({ currentPage, totalPages, onPageChange: (newPage) => { currentPage = newPage; renderApp(); } })}
        </div>
      </div>
    </div>
  `;
}