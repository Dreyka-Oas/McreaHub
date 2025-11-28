// src/preload.js

const { contextBridge, ipcRenderer } = require('electron');
const appConfig = __APP_CONFIG__;

contextBridge.exposeInMainWorld('APP_CONFIG', appConfig);

function createListener(channel, callback) {
    const subscription = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
}

const baseAPI = {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  getAppName: () => ipcRenderer.invoke('app:get-name'),
  getAppLocale: () => ipcRenderer.invoke('app:get-locale'),
  getSystemAccentColor: () => ipcRenderer.invoke('app:get-system-accent'),
  onLogMessage: (cb) => createListener('log-message', cb),
  onNotification: (cb) => createListener('app:notification', cb),
  getReleases: (force) => ipcRenderer.invoke('versions:get-releases', force),
  getInstalledVersions: () => ipcRenderer.invoke('versions:get-installed'),
  launchVersion: (v) => ipcRenderer.invoke('versions:launch', v),
  uninstallVersion: (v) => ipcRenderer.invoke('versions:uninstall', v),
  downloadVersion: (v) => ipcRenderer.send('versions:download', v),
  onDownloadProgress: (cb) => createListener('download:progress', cb),
  onDownloadComplete: (cb) => createListener('download:complete', cb),
  onDownloadError: (cb) => createListener('download:error', cb),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (k, v) => ipcRenderer.send('settings:set', k, v),
  getDefaultInstallPath: () => ipcRenderer.invoke('settings:get-default-install-path'),
  getMCreatorConfig: () => ipcRenderer.invoke('mcreator:get-config'),
  setMCreatorConfig: (c) => ipcRenderer.send('mcreator:set-config', c),
  getMCreatorConfigPath: () => ipcRenderer.invoke('mcreator:get-config-path'),
  checkMCreatorConfigExists: () => ipcRenderer.invoke('mcreator:check-config-exists'),
  getProjectSources: () => ipcRenderer.invoke('projects:get-sources'),
  addProjectSource: (s) => ipcRenderer.invoke('projects:add-source', s),
  removeProjectSource: (s) => ipcRenderer.invoke('projects:remove-source', s),
  scanForProjects: () => ipcRenderer.invoke('projects:scan-for-projects'),
  launchProject: (d) => ipcRenderer.invoke('projects:launch', d),
  createProjectFolder: (d) => ipcRenderer.invoke('projects:create-project-folder', d),
  createProjectSubfolder: (d) => ipcRenderer.invoke('projects:create-subfolder', d),
  deleteProjectVersion: (path) => ipcRenderer.invoke('projects:delete-version', path),
  deleteProject: (path) => ipcRenderer.invoke('projects:delete-project', path),
  onProjectsUpdated: (cb) => createListener('projects:updated', () => cb()),
  translateText: (d) => ipcRenderer.invoke('translate:text', d),
  translateStream: (d) => ipcRenderer.invoke('translate:stream', d),
  onTranslatePartial: (cb) => createListener('translate:partial', cb),
  abortTranslation: () => ipcRenderer.invoke('translate:abort'),
  selectDirectory: () => ipcRenderer.invoke('util:select-directory'),
  openPathInExplorer: (p) => ipcRenderer.invoke('util:open-path', p),
  getChangelog: (f) => ipcRenderer.invoke('changelog:get', f),
  openExternalUrl: (u) => ipcRenderer.invoke('util:open-external-url', u),
  onAppFocused: (cb) => createListener('app:focused', () => cb()),
  syncGlobal: (tokenOverride) => ipcRenderer.invoke('sync:global', tokenOverride),
};

if (__FEATURE_GITHUB__) {
  Object.assign(baseAPI, {
      checkGitInstalled: () => ipcRenderer.invoke('git:check-install'),
      validateToken: (t) => ipcRenderer.invoke('github:validate-token', t),
      gitClone: (d) => ipcRenderer.invoke('git:clone', d),
      onGitProgress: (cb) => createListener('git:progress', cb),
      getGitIgnoreContent: (p) => ipcRenderer.invoke('git:get-ignore', p),
      saveGitIgnoreContent: (p, c) => ipcRenderer.invoke('git:save-ignore', {path: p, content: c})
  });
}

if (__FEATURE_NOTES__) {
  Object.assign(baseAPI, {
      getNotes: () => ipcRenderer.invoke('notes:get'),
      saveNotes: (notes) => ipcRenderer.invoke('notes:save', notes),
  });
}

if (__FEATURE_BACKUPS__) {
    Object.assign(baseAPI, {
        listBackups: (p) => ipcRenderer.invoke('backup:list', p),
        createBackup: (d) => ipcRenderer.invoke('backup:create', d),
        deleteBackup: (p) => ipcRenderer.invoke('backup:delete', p),
        restoreBackup: (d) => ipcRenderer.invoke('backup:restore', d),
        onBackupProgress: (cb) => createListener('backup:progress', cb),
        onBackupRestoreProgress: (cb) => createListener('backup:restore-progress', cb)
    });
}

contextBridge.exposeInMainWorld('electronAPI', baseAPI);