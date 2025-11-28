// src/renderer/state.js

export let state = {
  appConfig: __APP_CONFIG__,
  activePage: 'projects',
  appSettings: {},
  allVersions: [],
  installedVersions: {},
  projectSources: [],
  projects: [],
  notes: [],
  githubUser: null,
  mcreatorConfigExists: false,
  
  gitInstalled: false,
  gitLfsInstalled: false,

  ui: {
    isLoading: true,
    downloads: {},
    activeBackups: {}, 
    activeSync: false,
    // --- AJOUT : État pour la restauration ---
    activeRestoration: null, // deviendra { projectName: "Nom" }
    
    gitOperations: {}, 
    sidebarStatusCollapsed: { downloads: true, backups: true, sync: true, git: true, restore: true },
    isModalOpen: false,
    launchingVersions: new Set(),
    uninstallingVersions: new Set(),
    gitStatuses: {},
    pageTransitionState: 'idle',
    versionsFilter: { searchQuery: '', type: 'stable', mcVersion: 'all', loader: 'all' },
    lastSyncInfo: { timestamp: 0, fromCache: false },
  },
};