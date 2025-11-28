// src/renderer/navigation-config.js

import { html } from '../../node_modules/lit-html/lit-html.js';
import { t } from './i18n.js';

/**
 * Configuration centralisée pour les éléments de la barre de navigation.
 */
export const navConfig = [
  // 1. Mes Projets
  { 
    id: 'projects', 
    label: () => t('sidebar.projects'), 
    icon: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M3.505 2.322a.75.75 0 0 1 .844.22l.14.168a.75.75 0 0 1-.22.844l-1.378.919a.75.75 0 0 0-.22.844l.14.168a.75.75 0 0 0 .844.22l1.379-.919a.75.75 0 0 1 .844.22l.14.168a.75.75 0 0 1-.22.844L6.2 15.31a.75.75 0 0 0-.22.844l.14.168a.75.75 0 0 0 .844.22l7.378-4.918a.75.75 0 0 0 .22-.844l-.14-.168a.75.75 0 0 0-.844-.22l-1.379.919a.75.75 0 0 1-.844-.22l-.14-.168a.75.75 0 0 1 .22-.844l1.378-.919a.75.75 0 0 0 .22-.844l-.14-.168a.75.75 0 0 0-.844-.22L8.8 3.79a.75.75 0 0 1-.844-.22l-.14-.168a.75.75 0 0 1 .22-.844L11.414.22a.75.75 0 0 0 .22-.844L11.495.22A.75.75 0 0 0 10.65.0l-7.378 4.918a.75.75 0 0 0-.22.844l.14.168a.75.75 0 0 0 .844.22l1.379-.919a.75.75 0 0 1 .844-.22l.14-.168a.75.75 0 0 1-.22-.844L3.505 2.322Z" /></svg>`,
    condition: () => true
  },
  // 2. Versions Installées
  { 
    id: 'installed', 
    label: () => t('sidebar.installed'), 
    icon: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm.75-11.25a.75.75 0 0 0-1.5 0v4.59L7.3 9.24a.75.75 0 0 0-1.1 1.02l3.25 3.5a.75.75 0 0 0 1.1 0l3.25-3.5a.75.75 0 1 0-1.1-1.02l-1.95 2.1V6.75z" clip-rule="evenodd" /></svg>`,
    condition: (state) => Object.keys(state.installedVersions).length > 0
  },
  // 3. Mes Notes
  { 
    id: 'notes', 
    label: () => t('sidebar.notes'), 
    icon: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.5 2A1.5 1.5 0 0 0 4 3.5v13A1.5 1.5 0 0 0 5.5 18h9a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 10.378 2H5.5ZM6 6.75A.75.75 0 0 1 6.75 6h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 6 6.75Zm.75 2.5a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5h-3.5Z" clip-rule="evenodd" /></svg>`,
    condition: (state) => state.appConfig.features.notes
  },
  // 4. Cfg. MCreator
  { 
    id: 'mcreatorSettings', 
    label: () => t('sidebar.mcreatorSettings'), 
    icon: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M11.25 6.536A4.493 4.493 0 0 0 9.5 6.25a4.5 4.5 0 0 0-2.946 7.82.75.75 0 0 1 .158.825l-.042.063a.75.75 0 0 1-.976.244 6 6 0 0 1-3.21-9.92.75.75 0 0 1 .633.021l.05.033a.75.75 0 0 1 .244.976l-.063.042a4.493 4.493 0 0 0 1.825 1.536.75.75 0 0 1 .374.83l-.033.05a.75.75 0 0 1-.95.317A4.5 4.5 0 0 0 13.75 9.5a4.493 4.493 0 0 0-1.536-3.32.75.75 0 0 1 .158-.825l.042.063a.75.75 0 0 1-.244.976L11.25 6.536Z" /></svg>`,
    condition: (state) => state.mcreatorConfigExists
  },
  // 5. Toutes les versions
  { 
    id: 'versions', 
    label: () => t('sidebar.versions'), 
    icon: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0z" /></svg>`,
    condition: () => true
  },
  // 6. Changelog
  { 
    id: 'changelog', 
    label: () => t('sidebar.changelog'), 
    icon: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm2.75 3.75a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H5.5a.75.75 0 0 1-.75-.75Zm0 4.5a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H5.5a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd" /></svg>`,
    condition: () => true
  },
  // 7. Paramètres
  { 
    id: 'settings', 
    label: () => t('sidebar.settings'), 
    icon: html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17a.75.75 0 0 1 .75.75v.515a.75.75 0 0 1-1.5 0V3.92a.75.75 0 0 1 .75-.75zM10 5.25a.75.75 0 0 1 .75.75v2a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75zM7.752 4.228a.75.75 0 0 1 .47 1.328l-.348.19a.75.75 0 0 1-1.04-1.04l.19-.348a.75.75 0 0 1 .58-.13zM12.248 4.228a.75.75 0 0 1 .58.13l.348.19a.75.75 0 1 1-1.04 1.04l-.19-.348a.75.75 0 0 1 .132-.47zM10 12.25a.75.75 0 0 1 .75.75v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 1 .75-.75zM11.49 16.83a.75.75 0 0 1 .75.75v.515a.75.75 0 0 1-1.5 0v-.515a.75.75 0 0 1 .75-.75z" clip-rule="evenodd" /></svg>`,
    condition: () => true
  },
  // --- NOUVEAU : ESPACEUR ---
  {
    id: 'spacer-1',
    isSpacer: true,
    label: () => '',
    icon: html``,
    condition: () => true
  }
];