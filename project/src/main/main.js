// src/main/main.js

import { app, BrowserWindow, Tray, Menu, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeIpcHandlers } from './ipc-handlers.js';
import SettingsManager from './managers/settings-manager.js';
import ProjectManager from './managers/project-manager.js';
import InstallationManager from './managers/installation-manager.js';
import GitHubApiManager from './managers/github-api-manager.js';
import SecretManager from './managers/secret-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- NOTE : LE BLOC "MODE PORTABLE" A ÉTÉ SUPPRIMÉ ---
// L'application utilisera désormais le dossier standard %APPDATA%/Mcreahub
// pour stocker ses données, ce qui est requis pour une installation dans Program Files.

// --- LOGIQUE DE NETTOYAGE ---
if (process.argv.includes('--cleanup-token')) {
  const isDevArg = process.argv.includes('--is-dev');
  app.setName(isDevArg ? 'Mcreahub DEV' : 'Mcreahub');

  console.log(`[Cleanup Mode] Démarrage du nettoyage pour le service : ${app.getName()}`);
  
  const secretManager = new SecretManager();
  secretManager.deleteGithubToken().then(() => {
    console.log('[Cleanup Mode] Nettoyage terminé.');
    app.quit();
  }).catch(err => {
    console.error('[Cleanup Mode] Erreur lors du nettoyage :', err);
    app.quit(1);
  });
} 
// --- DÉBUT DE LA LOGIQUE D'APPLICATION NORMALE ---
else {

  const config = __APP_CONFIG__;

  const logger = {
    log: (...args) => config.enableLogging && console.log(...args),
    error: (...args) => config.enableLogging && console.error(...args),
    warn: (...args) => config.enableLogging && console.warn(...args),
  };

  const isPackaged = app.isPackaged;
  let isDevBuild = false;
  if (isPackaged) {
    try {
      const packageJsonPath = path.join(app.getAppPath(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      isDevBuild = packageJson.isDevBuild || false;
    } catch (error) {
      logger.error("Impossible de lire le package.json packagé pour déterminer le mode de build.", error);
    }
  }
  const isDev = !isPackaged || isDevBuild;
  const productName = isDev ? 'Mcreahub DEV' : 'Mcreahub';

  app.setName(productName);

  if (isDev) {
      const devUserDataPath = path.join(app.getPath('appData'), productName);
      app.setPath('userData', devUserDataPath);
  }

  app.on('before-ready', () => {
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    app.commandLine.appendSwitch('enable-zero-copy');
    app.commandLine.appendSwitch('enable-features', 'UseSkiaRenderer');
    app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
  });

  let mainWindow;
  let tray = null;
  let projectManager = null;
  let installationManager = null; 
  const settingsManager = new SettingsManager(app.getPath('userData'));
  let currentSettings = null;
  let saveWindowTimer = null;

  const startMinimized = process.argv.includes('--hidden');

  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }

  app.on('before-quit', async (event) => {
      console.log('[Main] Événement before-quit détecté. Nettoyage...');
      if (installationManager) {
          await installationManager.cancelAllDownloadsAndCleanup();
          await installationManager.terminateAllRunningInstances();
      }
  });


  function configureLoginItem(isEnabled) {
    if (process.platform === 'win32' || process.platform === 'darwin') {
      const settings = {
        openAtLogin: isEnabled,
        path: app.getPath('exe'),
        args: isEnabled ? ['--hidden'] : []
      };
      app.setLoginItemSettings(settings);
      logger.log(`[Main] Lancement au démarrage ${isEnabled ? 'activé' : 'désactivé'}.`);
    }
  }

  function logToRenderer(message) {
    if (mainWindow?.webContents && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send('log-message', message);
    }
  }
  
  function saveWindowState() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) return;

    const isMaximized = mainWindow.isMaximized();
    const bounds = mainWindow.getBounds();
    
    settingsManager.setWindowState({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized: isMaximized
    });
  }
  
  function debounceSaveWindowState() {
      if (saveWindowTimer) clearTimeout(saveWindowTimer);
      saveWindowTimer = setTimeout(saveWindowState, 1000);
  }

  async function createWindow() {
    projectManager = new ProjectManager(app.getPath('userData'));
    currentSettings = await settingsManager.getSettings();
    
    const windowState = settingsManager.getWindowState();

    configureLoginItem(currentSettings.startWithSystem);

    mainWindow = new BrowserWindow({
      width: windowState.width || 1600,
      height: windowState.height || 1000,
      x: windowState.x,
      y: windowState.y,
      minWidth: 1400,
      minHeight: 800,
      title: productName,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
      show: false,
      autoHideMenuBar: true,
    });
    
    if (windowState.isMaximized) {
        mainWindow.maximize();
    }

    mainWindow.on('resize', debounceSaveWindowState);
    mainWindow.on('move', debounceSaveWindowState);

    const githubApiManager = new GitHubApiManager(settingsManager, app.getPath('userData'), logToRenderer);
    installationManager = new InstallationManager(settingsManager, app.getPath('userData'), mainWindow, githubApiManager);

    if (process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
    } else {
      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    if (startMinimized && currentSettings.runInBackground) {
      logger.log('[Main] Démarrage en arrière-plan détecté. Création du tray uniquement.');
      createTray();
    } else {
      logger.log('[Main] Démarrage normal. Affichage de la fenêtre...');
      mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        if (isDev || config.showDevTools) {
          mainWindow.webContents.openDevTools();
        }
      });
    }
    
    mainWindow.on('close', (event) => {
      saveWindowState();
      if (currentSettings.runInBackground && !app.isQuitting) {
        event.preventDefault();
        mainWindow.hide();
        if (!tray) createTray();
      }
    });
    
    mainWindow.on('focus', () => {
      if (mainWindow?.webContents && !mainWindow.webContents.isDestroyed()) {
        console.log('[Main] Fenêtre réactivée, envoi de la notification de mise à jour.');
        mainWindow.webContents.send('app:focused');
      }
    });

    initializeIpcHandlers(mainWindow, settingsManager, installationManager, logToRenderer, config);

    projectManager.initialize(mainWindow);
  }

  function createTray() {
      if (tray) return;

      const iconPath = isPackaged
        ? path.join(process.resourcesPath, 'icons/logo.ico')
        : path.resolve('src/renderer/assets/icons/logo.ico');
          
      tray = new Tray(iconPath);
      const contextMenu = Menu.buildFromTemplate([
          { label: `Ouvrir ${productName}`, click: () => {
              mainWindow.show();
              mainWindow.focus();
          }},
          { type: 'separator' },
          { label: 'Quitter définitivement', click: () => {
              app.isQuitting = true;
              app.quit();
          }}
      ]);
      tray.setToolTip(productName);
      tray.setContextMenu(contextMenu);
      tray.on('double-click', () => {
          mainWindow.show();
          mainWindow.focus();
      });
  }

  app.whenReady().then(() => {
      createWindow();
      
      settingsManager.on('setting-changed', ({ key, value }) => {
        if (currentSettings && typeof currentSettings[key] !== 'undefined') {
          currentSettings[key] = value;
          logger.log(`[Main] Paramètre en mémoire mis à jour : ${key} = ${value}`);
        }

        if (key === 'startWithSystem') {
          configureLoginItem(value);
        }
      });
  });

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  app.on('window-all-closed', () => {
      if (projectManager) projectManager.close();
      if (process.platform !== 'darwin' || app.isQuitting) app.quit();
  });
}