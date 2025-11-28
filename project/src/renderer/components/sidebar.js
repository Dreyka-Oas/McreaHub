// src/renderer/components/sidebar.js

import { html } from '../../../node_modules/lit-html/lit-html.js';
import { classMap } from '../../../node_modules/lit-html/directives/class-map.js';
import { navigateTo } from '../actions/app-actions.js';
import { formatSpeed } from '../utils/formatters.js';
import { navConfig } from '../navigation-config.js';
import { state } from '../state.js';
import { renderApp } from '../app.js';

// --- NOUVELLES ICONES CLEAN (Heroicons Style) ---

// Téléchargement (Flèche vers le bas)
const iconDownload = html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 3v13.5m0 0L8.25 12m3.75 4.5L15.75 12" /></svg>`;

// Installation (Boîte / Archive)
const iconInstall = html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>`;

// Backup (Horloge / Remonter le temps)
const iconBackup = html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;

// Sync (Nuage avec flèches)
const iconSync = html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>`;

// Git (Branch)
const iconGit = html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`; 

// Restore (Retour arrière)
const iconRestore = html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>`;

// Chevron (Toggle)
const iconChevron = html`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>`;

// --- LOGIQUE DRAG & DROP ---
let draggedItemId = null;

function handleDragStart(e, id) {
    draggedItemId = id;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedItemId = null;
    document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
        el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const target = e.target.closest('.draggable-item');
    if (target) {
        const rect = target.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        target.classList.remove('drag-over-top', 'drag-over-bottom');
        if (e.clientY < midY) {
            target.classList.add('drag-over-top');
        } else {
            target.classList.add('drag-over-bottom');
        }
    }
}

function handleDragLeave(e) {
    const target = e.target.closest('.draggable-item');
    if (target) {
        target.classList.remove('drag-over-top', 'drag-over-bottom');
    }
}

async function handleDrop(e, targetId) {
    e.preventDefault();
    const target = e.target.closest('.draggable-item');
    let position = 'bottom';
    
    if (target) {
        if (target.classList.contains('drag-over-top')) position = 'top';
        target.classList.remove('drag-over-top', 'drag-over-bottom');
    }

    if (!draggedItemId || draggedItemId === targetId) return;

    const currentOrder = state.appSettings.sidebarOrder || navConfig.map(n => n.id);
    const validIds = navConfig.map(n => n.id);
    const cleanOrder = currentOrder.filter(id => validIds.includes(id));
    
    validIds.forEach(id => { if (!cleanOrder.includes(id)) cleanOrder.push(id); });

    const fromIndex = cleanOrder.indexOf(draggedItemId);
    const toIndex = cleanOrder.indexOf(targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
        const newOrder = [...cleanOrder];
        newOrder.splice(fromIndex, 1);
        let insertIndex = newOrder.indexOf(targetId);
        if (position === 'bottom') insertIndex++;
        newOrder.splice(insertIndex, 0, draggedItemId);
        
        state.appSettings.sidebarOrder = newOrder;
        await window.electronAPI.setSetting('sidebarOrder', newOrder);
        renderApp();
    }
}

function toggleStatusCard(type) {
    if (!state.ui.sidebarStatusCollapsed) state.ui.sidebarStatusCollapsed = {};
    state.ui.sidebarStatusCollapsed[type] = !state.ui.sidebarStatusCollapsed[type];
    renderApp();
}

function updateSidebarGlider() {
    const container = document.querySelector('.nav-items-container');
    if (!container) return;
    const activeBtn = container.querySelector('.nav-button.active');
    const glider = container.querySelector('.nav-glider');
    if (activeBtn && glider) {
        glider.style.top = `${activeBtn.offsetTop}px`;
        glider.style.height = `${activeBtn.offsetHeight}px`;
        glider.style.display = 'block';
    } else if (glider) {
        glider.style.display = 'none';
    }
}

window.addEventListener('resize', updateSidebarGlider);

export function Sidebar(activePage, downloads) {
  const canReorder = state.appConfig.features.sidebarReorder;
  const visibleItems = navConfig.filter(item => item.condition(state));
  
  let orderedItems = [];
  const savedOrder = state.appSettings.sidebarOrder;
  
  if (savedOrder && Array.isArray(savedOrder)) {
      orderedItems = savedOrder.map(id => visibleItems.find(item => item.id === id)).filter(item => item !== undefined);
      visibleItems.forEach(item => { if (!savedOrder.includes(item.id)) orderedItems.push(item); });
  } else {
      orderedItems = visibleItems;
  }

  const activeDownloads = Object.values(downloads).filter(d => d.status === 'downloading' || d.status === 'installing');
  const showDownloadProgress = activeDownloads.length > 0;
  let dlPercent = 0, dlSpeedStr = '', dlTitle = 'Téléchargement';
  let isInstalling = false; let dlIcon = iconDownload;
  if (showDownloadProgress) {
    const total = activeDownloads.length;
    if (activeDownloads.some(d => d.status === 'installing')) { isInstalling = true; dlTitle = total > 1 ? `Installation (${total})` : 'Installation'; dlIcon = iconInstall; } 
    else { dlTitle = total > 1 ? `Téléchargements (${total})` : 'Téléchargement'; }
    const sum = activeDownloads.reduce((acc, d) => acc + (d.percent || 0), 0);
    dlPercent = sum / total;
    const totalSpeed = activeDownloads.reduce((acc, d) => acc + (d.speed || 0), 0);
    dlSpeedStr = !isInstalling ? formatSpeed(totalSpeed) : 'Décompression...';
  }
  
  const activeBackups = Object.values(state.ui.activeBackups || {});
  const showBackupProgress = activeBackups.length > 0;
  const backupPercent = activeBackups.length > 0 ? (activeBackups[0].percent || 0) : 0;
  const isSyncing = state.ui.activeSync;
  const activeRestoration = state.ui.activeRestoration;
  const isRestoring = !!activeRestoration;
  const restorePercent = activeRestoration ? (activeRestoration.percent || 0) * 100 : 0;
  const activeGitOps = Object.values(state.ui.gitOperations || {});
  const showGitProgress = activeGitOps.length > 0;
  const currentGitOp = showGitProgress ? activeGitOps[0] : null;
  
  setTimeout(updateSidebarGlider, 0);

  return html`
    <nav id="sidebar">
      <h1 class="sidebar-title">McreaHub</h1>
      
      <div class="nav-items-container">
        <div class="nav-glider"></div>
        
        ${orderedItems.map(item => {
            const dragEvents = canReorder ? {
                draggable: "true",
                dragstart: (e) => handleDragStart(e, item.id),
                dragend: handleDragEnd,
                dragover: handleDragOver,
                dragleave: handleDragLeave,
                drop: (e) => handleDrop(e, item.id)
            } : {};

            const dragClass = canReorder ? 'draggable-item' : '';

            if (item.isSpacer) {
                return html`
                    <div class="nav-spacer ${dragClass}" 
                         draggable="${canReorder}"
                         @dragstart=${dragEvents.dragstart || null}
                         @dragend=${dragEvents.dragend || null}
                         @dragover=${dragEvents.dragover || null}
                         @dragleave=${dragEvents.dragleave || null}
                         @drop=${dragEvents.drop || null}>
                         <div class="spacer-line"></div>
                    </div>`;
            }
            
            return html`
                <button class="nav-button ${dragClass} ${activePage === item.id ? 'active' : ''}" 
                    @click=${() => navigateTo(item.id)}
                    draggable="${canReorder}"
                    @dragstart=${dragEvents.dragstart || null}
                    @dragend=${dragEvents.dragend || null}
                    @dragover=${dragEvents.dragover || null}
                    @dragleave=${dragEvents.dragleave || null}
                    @drop=${dragEvents.drop || null}>
                    ${item.icon}
                    <span>${item.label()}</span>
                </button>
            `;
        })}
      </div>

      <div class="sidebar-status-area">
          ${showGitProgress ? html`
            <div class="status-card git-card" @click=${() => toggleStatusCard('git')}>
                <div class="status-header">
                    <div class="status-icon-wrapper pulse">${iconGit}</div>
                    <div class="status-text"><div class="status-title">Git Push</div><div class="status-detail">${currentGitOp.phase}</div></div>
                    <div class="status-percent">${Math.round(currentGitOp.percent * 100)}%</div>
                </div>
                <div class="status-progress-wrapper" style="${state.ui.sidebarStatusCollapsed?.git ? 'max-height:0; margin:0; opacity:0;' : ''}">
                    <div class="status-progress-track"><div class="status-progress-fill fill-git" style="width: ${currentGitOp.percent * 100}%"></div></div>
                </div>
            </div>` : ''}

          ${isSyncing ? html`
            <div class="status-card sync-card" @click=${() => toggleStatusCard('sync')}>
                <div class="status-header">
                    <div class="status-icon-wrapper pulse">${iconSync}</div>
                    <div class="status-text"><div class="status-title">Synchronisation</div><div class="status-detail">En cours...</div></div>
                </div>
                <div class="status-progress-wrapper" style="${state.ui.sidebarStatusCollapsed?.sync ? 'max-height:0; margin:0; opacity:0;' : ''}">
                     <div class="status-progress-track"><div class="status-progress-fill fill-sync" style="width: 100%"></div></div>
                </div>
            </div>` : ''}

          ${isRestoring ? html`
            <div class="status-card restore-card" @click=${() => toggleStatusCard('restore')}>
                <div class="status-header">
                    <div class="status-icon-wrapper pulse">${iconRestore}</div>
                    <div class="status-text"><div class="status-title">Restauration</div><div class="status-detail">${activeRestoration.projectName}</div></div>
                    <div class="status-percent">${Math.round(restorePercent)}%</div>
                </div>
                <div class="status-progress-wrapper" style="${state.ui.sidebarStatusCollapsed?.restore ? 'max-height:0; margin:0; opacity:0;' : ''}">
                    <div class="status-progress-track"><div class="status-progress-fill fill-restore" style="width: ${restorePercent || 100}%"></div></div>
                </div>
            </div>` : ''}

          ${showBackupProgress ? html`
            <div class="status-card backup-card" @click=${() => toggleStatusCard('backups')}>
                <div class="status-header">
                    <div class="status-icon-wrapper spin">${iconBackup}</div>
                    <div class="status-text"><div class="status-title">Sauvegarde</div><div class="status-detail">En cours...</div></div>
                    <div class="status-percent">${Math.round(backupPercent)}%</div>
                </div>
                <div class="status-progress-wrapper" style="${state.ui.sidebarStatusCollapsed?.backups ? 'max-height:0; margin:0; opacity:0;' : ''}">
                    <div class="status-progress-track"><div class="status-progress-fill fill-backup" style="width: ${backupPercent}%"></div></div>
                </div>
            </div>` : ''}

          ${showDownloadProgress ? html`
            <div class="status-card ${isInstalling ? 'install-card' : 'download-card'}" @click=${() => toggleStatusCard('downloads')}>
                <div class="status-header">
                    <div class="status-icon-wrapper ${isInstalling ? 'pulse' : 'bounce'}">${dlIcon}</div>
                    <div class="status-text"><div class="status-title">${dlTitle}</div><div class="status-detail">${dlSpeedStr}</div></div>
                    <div class="status-percent">${Math.round(dlPercent * 100)}%</div>
                </div>
                <div class="status-progress-wrapper" style="${state.ui.sidebarStatusCollapsed?.downloads ? 'max-height:0; margin:0; opacity:0;' : ''}">
                    <div class="status-progress-track"><div class="status-progress-fill ${isInstalling ? 'fill-install' : 'fill-download'}" style="width: ${dlPercent * 100}%"></div></div>
                </div>
            </div>` : ''}
      </div>
    </nav>`;
}