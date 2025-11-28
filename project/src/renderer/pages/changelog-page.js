// src/renderer/pages/changelog-page.js

import { html } from '../../../node_modules/lit-html/lit-html.js';
import { keyed } from '../../../node_modules/lit-html/directives/keyed.js';
import { state } from '../state.js';
import { renderApp } from '../app.js';
import { showNotification } from '../utils/notifications.js';
import { t, getCurrentLocale } from '../i18n.js';

let allChangelogData = [];
let uniqueVersions = [];
let selectedVersion = null;
let isLoading = false;
let loadError = null;

// --- ÉTAT D'AFFICHAGE ---
let displayData = null; 
let isTranslatedMode = false;
let isTranslating = false;

// Mémoire pour éviter la boucle de relance automatique
const preventAutoTranslate = new Set();

// Icônes
const iconTranslate = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width:18px;height:18px"><path d="M7.75 2.75a.75.75 0 00-1.5 0v1.258a32.987 32.987 0 00-3.599.278.75.75 0 10.198 1.487A31.545 31.545 0 018.7 5.545 19.381 19.381 0 017 11.32a19.418 19.418 0 01-2.109-2.453.75.75 0 10-1.213.866c.484.678 1.033 1.323 1.641 1.918a19.58 19.58 0 01-5.293 3.72.75.75 0 00.795 1.285c1.29-.798 2.48-1.758 3.536-2.847A19.54 19.54 0 0111 17.25a.75.75 0 10.834-1.251c-1.35-1.498-2.48-3.175-3.34-4.977.23-.272.447-.555.652-.848.427-.606.793-1.254 1.083-1.93l.183.053a.75.75 0 00.42-1.44l-.33-.096a31.55 31.55 0 00-4.59-1.173V2.75z" /><path d="M16.5 6.5a.75.75 0 00-.75.75v9.5a.75.75 0 00.75.75h.75a.75.75 0 00.75-.75v-9.5a.75.75 0 00-.75-.75h-.75z" /></svg>`;
const iconFilter = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px"><path fill-rule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z" clip-rule="evenodd" /></svg>`;

// Cache local des versions DÉJÀ traduites
// Map<VersionString, Array<EntryObject>>
const translationCache = new Map();

// Listener global
let isListenerSetup = false;
let flatDisplayList = [];

function setupStreamListener() {
    if (isListenerSetup) return;
    
    window.electronAPI.onTranslatePartial((partialResult) => {
        if (!isTranslatedMode || !displayData) return;

        partialResult.indices.forEach((globalIndex, i) => {
            const newValue = partialResult.lines[i];
            if (globalIndex < flatDisplayList.length && newValue) {
                const ref = flatDisplayList[globalIndex];
                if (ref.type === 'change') {
                    ref.entry.changes[ref.idx] = newValue;
                } else if (ref.type === 'date') {
                    ref.entry.date = newValue;
                }
            }
        });
        renderApp();
    });
    isListenerSetup = true;
}

async function startTranslationStream(isManual = false) {
    if (isTranslating) return;
    
    const originalEntries = allChangelogData.filter(entry => entry.version === selectedVersion);
    if (originalEntries.length === 0) return;

    // --- CORRECTION 1 : Utilisation du Cache ---
    if (translationCache.has(selectedVersion)) {
        console.log("[Changelog] Chargement depuis le cache instantané.");
        // On clone pour éviter les mutations accidentelles
        displayData = JSON.parse(JSON.stringify(translationCache.get(selectedVersion)));
        isTranslatedMode = true;
        // On marque comme traité pour l'auto-trad
        preventAutoTranslate.add(selectedVersion);
        renderApp();
        if (isManual) showNotification("Traduction restaurée.", "success");
        return; // ON ARRÊTE ICI, pas de réseau !
    }

    preventAutoTranslate.add(selectedVersion);

    // Clone profond
    displayData = JSON.parse(JSON.stringify(originalEntries));
    isTranslatedMode = true;
    
    flatDisplayList = [];
    const linesToSend = [];

    displayData.forEach(entry => {
        flatDisplayList.push({ type: 'date', entry: entry });
        linesToSend.push(entry.date);

        entry.changes.forEach((change, idx) => {
            flatDisplayList.push({ type: 'change', entry: entry, idx: idx });
            linesToSend.push(change);
        });
    });

    isTranslating = true;
    renderApp();

    let targetLang = getCurrentLocale().split('-')[0];
    if (!targetLang || targetLang === 'en') targetLang = 'fr';

    try {
        setupStreamListener();
        const result = await window.electronAPI.translateStream({ lines: linesToSend, targetLang });
        
        if (result.success) {
            // --- CORRECTION 2 : Sauvegarde dans le cache à la fin ---
            // displayData a été muté en temps réel par le listener, il est maintenant complet (ou partiel mais lisible)
            translationCache.set(selectedVersion, JSON.parse(JSON.stringify(displayData)));
            
            if (isManual) showNotification("Traduction terminée.", "success");
        } else {
            console.warn("Traduction partielle:", result.error);
        }
    } catch (error) {
        console.error("Erreur stream:", error);
        if (isManual) showNotification("Erreur lors de la traduction.", 'error');
    } finally {
        isTranslating = false;
        renderApp();
    }
}

async function loadChangelogData() {
  isLoading = true; loadError = null; renderApp();
  try {
    const result = await window.electronAPI.getChangelog();
    if (result.success && result.data?.length > 0) {
      allChangelogData = result.data;
      uniqueVersions = [...new Set(allChangelogData.map(entry => entry.version))];
      if (!selectedVersion && uniqueVersions.length > 0) selectedVersion = uniqueVersions[0];
    } else { loadError = result.error || "Aucune donnée."; }
  } catch (error) { loadError = error.message; } 
  finally { isLoading = false; renderApp(); }
}

function toggleFilterMenu(event) {
    event.stopPropagation();
    const button = event.currentTarget;
    const menu = button.nextElementSibling;
    document.querySelectorAll('.filter-menu.active').forEach(m => { if (m !== menu) m.classList.remove('active'); });
    if (menu) {
        const isActive = menu.classList.toggle('active');
        if (isActive) {
            const closeMenu = () => { menu.classList.remove('active'); document.removeEventListener('click', closeMenu); };
            document.addEventListener('click', closeMenu);
            const selectedItem = menu.querySelector('.selected');
            if (selectedItem) setTimeout(() => selectedItem.scrollIntoView({ block: 'nearest', behavior: 'auto' }), 0);
        }
    }
}

async function selectVersion(version) {
    selectedVersion = version;
    displayData = null;
    isTranslatedMode = false;
    renderApp();
}

async function handleTranslateClick() {
    if (isTranslatedMode) {
        // Retour à l'original
        displayData = null;
        isTranslatedMode = false;
        preventAutoTranslate.add(selectedVersion); 
        renderApp();
    } else {
        // Traduction (ou restauration cache)
        await startTranslationStream(true);
    }
}

export function ChangelogPage() {
  if (allChangelogData.length === 0 && !isLoading && !loadError) loadChangelogData();

  const autoTranslateOn = state.appConfig.features.autoTranslateChangelog && state.appSettings.autoTranslateChangelog;
  
  // Si on a déjà le cache, on peut l'afficher directement sans "scintillement" si auto-trad est active
  if (autoTranslateOn && selectedVersion && translationCache.has(selectedVersion) && !isTranslatedMode && !preventAutoTranslate.has(selectedVersion)) {
      // Restauration immédiate silencieuse
      startTranslationStream(false);
  }
  else if (shouldAutoRun()) {
      // Sinon on lance le stream avec délai
      setTimeout(() => startTranslationStream(false), 200);
  }

  function shouldAutoRun() {
      return !isLoading && !isTranslating && !loadError && allChangelogData.length > 0 && selectedVersion && !isTranslatedMode && autoTranslateOn && !preventAutoTranslate.has(selectedVersion);
  }

  let content;
  if (isLoading) {
    content = html`<div class="empty-state"><div class="spinner-large"></div><p>Chargement...</p></div>`;
  } else if (loadError) {
    content = html`<div class="empty-state"><h3>Erreur</h3><p>${loadError}</p><button class="card-button btn-secondary" style="margin-top: 16px;" @click=${() => loadChangelogData()}>Réessayer</button></div>`;
  } else if (allChangelogData.length === 0) {
    content = html`<div class="empty-state"><h3>Vide</h3></div>`;
  } else {
    const dataToShow = isTranslatedMode && displayData 
        ? displayData 
        : (selectedVersion ? allChangelogData.filter(entry => entry.version === selectedVersion) : []);

    if (dataToShow.length === 0) {
        content = html`<div class="empty-state"><p>Aucun contenu.</p></div>`;
    } else {
        content = html`
          <div class="changelog-container">
            ${dataToShow.map((entry, index) => {
                const isLatest = entry.version === uniqueVersions[0];
                return html`
                <div class="changelog-card">
                    <div class="changelog-card-header">
                        <div class="version-info">
                            <span class="version-number">${entry.version}</span>
                            ${isLatest ? html`<span class="latest-badge">Dernière</span>` : ''}
                        </div>
                        <span class="version-date">${entry.date}</span>
                    </div>
                    <div class="changelog-body">
                        <ul class="changelog-list">
                            ${entry.changes.map(change => html`<li>${change}</li>`)}
                        </ul>
                    </div>
                </div>`;
            })}
          </div>
        `;
    }
  }

  const translateButtonText = isTranslatedMode ? t('changelogPage.showOriginalButton') : t('changelogPage.translateButton');
  const currentFilterLabel = selectedVersion || "Sélectionner...";

  return html`
    <div class="page" id="changelog-page">
      <div class="page-header">
        <div class="page-header-left">
            <h1 class="page-title">${t('changelogPage.title')}</h1>
        </div>
        <div class="page-header-right">
            ${!isLoading && !loadError && uniqueVersions.length > 0 ? html`
                <button class="card-button btn-secondary translate-btn" @click=${handleTranslateClick} ?disabled=${isTranslating}>
                    ${isTranslating 
                        ? html`<span class="spinner-small" style="display:inline-block; margin:0;"></span>`
                        : iconTranslate
                    }
                    <span>${isTranslating ? t('changelogPage.translatingButton') : translateButtonText}</span>
                </button>
                <div class="filter-container">
                    <button class="filter-button" style="min-width: 180px;" @click=${toggleFilterMenu}>
                        <div style="display:flex; align-items:center; gap:8px;">
                            ${iconFilter}
                            <span class="filter-label">${t('changelogPage.versionFilter')}</span>
                        </div>
                        ${keyed(currentFilterLabel, html`<span class="filter-value" style="text-align:right;">${currentFilterLabel}</span>`)}
                    </button>
                    <div class="filter-menu" style="max-height:400px;">
                        ${uniqueVersions.map(version => html`<div class="filter-menu-item ${selectedVersion === version ? 'selected' : ''}" @click=${() => selectVersion(version)}>${version}</div>`)}
                    </div>
                </div>
            ` : ''}
        </div>
      </div>
      <div class="page-content-scrollable">
        ${content}
      </div>
    </div>
  `;
}