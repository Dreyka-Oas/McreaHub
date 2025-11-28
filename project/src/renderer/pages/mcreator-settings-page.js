// src/renderer/pages/mcreator-settings-page.js

import { html } from '../../../node_modules/lit-html/lit-html.js';
import { until } from '../../../node_modules/lit-html/directives/until.js';
// --- AJOUT : Import nécessaire pour l'animation du texte ---
import { keyed } from '../../../node_modules/lit-html/directives/keyed.js';
import { renderApp } from '../app.js';
import { showNotification } from '../utils/notifications.js';

let mcreatorConfig = null;
let configPath = '';

// Icônes SVG
const iconGradle = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 3.416a1 1 0 01-.79 .79l-3.416.683a1 1 0 000 1.898l3.416.683a1 1 0 01.79.79l.683 3.416a1 1 0 001.898 0l.683-3.416a1 1 0 01.79-.79l3.416-.683a1 1 0 000-1.898l-3.416-.683a1 1 0 01-.79-.79l-.683-3.416z" /></svg>`;
const iconUI = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v8.5A2.25 2.25 0 0115.75 15h-3.105a3.501 3.501 0 001.1 1.677A.75.75 0 0113.26 18H6.74a.75.75 0 01-.484-1.323A3.501 3.501 0 007.355 15H4.25A2.25 2.25 0 012 12.75v-8.5zm1.5 0a.75.75 0 01.75-.75h11.5a.75.75 0 01.75.75v7.5a.75.75 0 01-.75.75H4.25a.75.75 0 01-.75-.75v-7.5z" clip-rule="evenodd" /></svg>`;
const iconCode = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6.28 5.22a.75.75 0 010 1.06L2.56 10l3.72 3.72a.75.75 0 01-1.06 1.06l-4.25-4.25a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0zm7.44 0a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 010-1.06zM11.377 2.011a.75.75 0 01.612.867l-2.5 14.5a.75.75 0 01-1.478-.255l2.5-14.5a.75.75 0 01.866-.612z" clip-rule="evenodd" /></svg>`;
const iconAdvanced = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.5 2A1.5 1.5 0 002 3.5V5c0 1.149.26 2.263.744 3.26a.75.75 0 010 .744A7.987 7.987 0 002 15v1.5A1.5 1.5 0 003.5 18h13A1.5 1.5 0 0018 16.5V15a7.987 7.987 0 00-.744-5.996.75.75 0 010-.744A7.987 7.987 0 0018 5V3.5A1.5 1.5 0 0016.5 2h-13zM3.5 16.5V15c0-1.236.315-2.429.892-3.5h11.216c.577 1.071.892 2.264.892 3.5v1.5h-13zM7.5 8A1.5 1.5 0 019 6.5h2A1.5 1.5 0 0112.5 8v2.5h-5V8z" clip-rule="evenodd" /></svg>`;
const iconConfig = html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.5 2A2.5 2.5 0 002 4.5v11A2.5 2.5 0 004.5 18h11a2.5 2.5 0 002.5-2.5v-11A2.5 2.5 0 0015.5 2h-11zm1 2.5a1 1 0 00-1 1v11a1 1 0 001 1h11a1 1 0 001-1v-11a1 1 0 00-1-1h-11zM13.25 9a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5a.75.75 0 01.75-.75zm-3.25 0a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5a.75.75 0 01.75-.75z" clip-rule="evenodd" /></svg>`;

export function resetConfigCache() {
    mcreatorConfig = null;
}

async function loadConfig() {
  [mcreatorConfig, configPath] = await Promise.all([
    window.electronAPI.getMCreatorConfig(),
    window.electronAPI.getMCreatorConfigPath()
  ]);
}

function handleConfigChange(section, key, value) {
    if (mcreatorConfig?.core[section] && mcreatorConfig.core[section][key] !== value) {
        mcreatorConfig.core[section][key] = value;
        window.electronAPI.setMCreatorConfig(mcreatorConfig);
        renderApp();
    }
}

function handleInteractiveChange(event) {
    const target = event.target;
    const { section, key } = target.dataset;
    let value;

    if (target.type === 'checkbox') value = target.checked;
    else if (target.type === 'number') value = Number(target.value);
    else value = target.value;
    
    handleConfigChange(section, key, value);
}

// --- CORRECTION 1 : SCROLL INTELLIGENT ---
function handleNumberScroll(event) {
    event.preventDefault();
    const input = event.target;
    const { section, key } = input.dataset;
    
    // Si c'est Xmx (Mémoire), on saute de 64 en 64
    // Sinon (ex: fontSize), on saute de 1 en 1
    const step = (key === 'Xmx') ? 64 : 1;
    
    let val = parseInt(input.value) || 0;
    if (event.deltaY < 0) val += step; 
    else val -= step;
    
    if (val < 0) val = 0; // Pas de négatif
    
    input.value = val;
    handleConfigChange(section, key, val);
}

function toggleMenu(event) {
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
                setTimeout(() => selectedItem.scrollIntoView({ block: 'nearest', behavior: 'auto' }), 0);
            }
        }
    }
}

const createToggle = (section, key, label, desc = '') => html`
  <div class="setting-row">
    <div class="setting-text"><div class="setting-label">${label}</div>${desc ? html`<div class="setting-description">${desc}</div>` : ''}</div>
    <div class="setting-control"><label class="switch"><input type="checkbox" .checked=${mcreatorConfig.core[section]?.[key]} data-section=${section} data-key=${key} @change=${handleInteractiveChange}><span class="slider"></span></label></div>
  </div>`;

const createNumberInput = (section, key, label, desc = '') => html`
  <div class="setting-row">
    <div class="setting-text"><div class="setting-label">${label}</div>${desc ? html`<div class="setting-description">${desc}</div>` : ''}</div>
    <div class="setting-control">
        <input type="number" class="setting-input" 
               .value=${mcreatorConfig.core[section]?.[key]} 
               data-section=${section} data-key=${key} 
               @input=${handleInteractiveChange}
               @wheel=${handleNumberScroll}>
    </div>
  </div>`;

// --- CORRECTION 2 : ANIMATION DU TEXTE (KEYED) ---
const createFilterSelect = (section, key, label, options, desc = '') => {
  const currentValue = mcreatorConfig.core[section]?.[key];
  const displayValue = options[currentValue] || 'Choisir...';

  return html`
  <div class="setting-row">
    <div class="setting-text"><div class="setting-label">${label}</div>${desc ? html`<div class="setting-description">${desc}</div>` : ''}</div>
    <div class="setting-control filter-container">
      <button class="filter-button" @click=${toggleMenu}>
        <!-- La directive 'keyed' force la recréation du span quand la valeur change -->
        <!-- Cela déclenche l'animation CSS 'slideInText' définie dans forms.css -->
        ${keyed(displayValue, html`<span class="filter-value">${displayValue}</span>`)}
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="m5.22 8.22 4.25 4.25a.75.75 0 0 0 1.06 0l4.25-4.25a.75.75 0 0 0-1.06-1.06L10 10.94 6.28 7.16a.75.75 0 0 0-1.06 1.06Z" clip-rule="evenodd" /></svg>
      </button>
      <div class="filter-menu">
        ${Object.entries(options).map(([value, text]) => html`
          <div class="filter-menu-item ${currentValue === value ? 'selected' : ''}" @click=${() => handleConfigChange(section, key, value)}>
            ${text}
          </div>
        `)}
      </div>
    </div>
  </div>`;
};

function renderPageContent() {
  if (!mcreatorConfig) {
    return html`<div class="page-content-scrollable"><div class="empty-state"><h3>Fichier introuvable</h3><p>Le fichier 'userpreferences' n'a pas pu être trouvé.</p></div></div>`;
  }

  return html`
    <div class="page-content-scrollable">
      <div class="settings-page-content">
        
        <div class="warning-banner">
            <svg style="width:24px;height:24px;flex-shrink:0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg>
            <span><strong>Attention :</strong> Ces réglages sont appliqués à toutes les versions de MCreator sur votre système.</span>
        </div>

        <div class="config-status-card">
            <div class="config-icon-wrapper">${iconConfig}</div>
            <div class="config-info">
                <div class="config-title">Fichier de configuration global</div>
                <div class="config-path" title="${configPath}">${configPath}</div>
            </div>
            <div class="config-actions">
                <button class="card-button btn-secondary" @click=${() => window.electronAPI.openPathInExplorer(configPath)}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;margin-right:6px"><path d="M2 6a2 2 0 0 1 2-2h5.25a2 2 0 0 1 1.77.88l1.44 2.16a1 1 0 0 0 .88.44H16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z"></path></svg>
                    Explorer
                </button>
            </div>
        </div>

        <div class="settings-grid">
            <!-- PERFORMANCE -->
            <div class="settings-group-card">
                <div class="group-header">
                    <div class="group-icon">${iconGradle}</div>
                    <span class="group-title">Gradle & Performance</span>
                </div>
                ${createToggle('gradle', 'buildOnSave', 'Compiler à la sauvegarde', 'Lance un build Gradle à chaque CTRL+S.')}
                ${createToggle('gradle', 'offline', 'Mode hors ligne', 'Force Gradle à utiliser le cache.')}
                ${createNumberInput('gradle', 'Xmx', 'Mémoire Gradle (Mo)', 'RAM allouée aux processus de build.')}
            </div>

            <!-- UI & LANGUE -->
            <div class="settings-group-card">
                <div class="group-header">
                    <div class="group-icon">${iconUI}</div>
                    <span class="group-title">Interface Utilisateur</span>
                </div>
                ${createFilterSelect('ui', 'language', 'Langue', { 'en_US': 'English', 'fr_FR': 'Français', 'de_DE': 'Deutsch', 'es_ES': 'Español' })}
                ${createToggle('ui', 'nativeFileChooser', 'Sélecteur natif', 'Utiliser les fenêtres Windows pour ouvrir les fichiers.')}
                ${createToggle('gradle', 'passLangToMinecraft', 'Langue dans le jeu', 'Lancer le client de test dans la langue de MCreator.')}
            </div>

            <!-- ÉDITEUR -->
            <div class="settings-group-card">
                <div class="group-header">
                    <div class="group-icon">${iconCode}</div>
                    <span class="group-title">Éditeur de Code</span>
                </div>
                ${createFilterSelect('ide', 'editorTheme', 'Thème', { 'MCreator': 'MCreator', 'Dark': 'Sombre', 'Monokai': 'Monokai' })}
                ${createFilterSelect('ide', 'autocompleteMode', 'Autocomplétion', { 'Smart': 'Intelligent', 'Basic': 'Basique', 'Off': 'Désactivé' })}
                ${createNumberInput('ide', 'fontSize', 'Taille de police', 'Taille du texte dans l\'éditeur de code.')}
            </div>

            <!-- AVANCÉ -->
            <div class="settings-group-card">
                <div class="group-header">
                    <div class="group-icon">${iconAdvanced}</div>
                    <span class="group-title">Avancé</span>
                </div>
                ${createToggle('ui', 'discordRichPresenceEnable', 'Discord Rich Presence', 'Afficher votre activité MCreator sur Discord.')}
                ${createToggle('hidden', 'enableJavaPlugins', 'Plugins Java', 'Activer le support expérimental des plugins.')}
            </div>
        </div>

      </div>
    </div>
  `;
}

export function MCreatorSettingsPage() {
  if (mcreatorConfig) {
      return html`
        <div class="page" id="mcreator-settings-page">
          <div class="page-header"><h1 class="page-title">Paramètres MCreator</h1></div>
          ${renderPageContent()}
        </div>
      `;
  }

  const contentPromise = loadConfig();
  return html`
    <div class="page" id="mcreator-settings-page">
      <div class="page-header"><h1 class="page-title">Paramètres MCreator</h1></div>
      ${until(contentPromise.then(() => renderPageContent()), html`<div class="empty-state"><div class="spinner-large"></div></div>`)}
    </div>
  `;
}