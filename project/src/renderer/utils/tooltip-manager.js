// src/renderer/utils/tooltip-manager.js

let tooltipEl = null;
let currentTarget = null;
let hoverTimer = null;

// --- MODIFICATION : 3 SECONDES ---
const DELAY_MS = 3000; 
const OFFSET_X = 12;
const OFFSET_Y = 12;

function createTooltipElement() {
    if (document.getElementById('global-tooltip')) return;
    
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'global-tooltip';
    document.body.appendChild(tooltipEl);
}

function showTooltip(text, e) {
    if (!tooltipEl) return;
    tooltipEl.textContent = text;
    tooltipEl.classList.add('visible');
    updatePosition(e);
}

function hideTooltip() {
    if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
    }

    if (!tooltipEl) return;
    tooltipEl.classList.remove('visible');
    
    setTimeout(() => {
        if (!tooltipEl.classList.contains('visible')) {
            tooltipEl.textContent = '';
        }
    }, 100);
}

function updatePosition(e) {
    if (!tooltipEl || !tooltipEl.classList.contains('visible')) return;

    const tooltipRect = tooltipEl.getBoundingClientRect();
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    let x = e.clientX + OFFSET_X;
    let y = e.clientY + OFFSET_Y;

    if (x + tooltipRect.width > winWidth) {
        x = e.clientX - tooltipRect.width - OFFSET_X;
    }

    if (y + tooltipRect.height > winHeight) {
        y = e.clientY - tooltipRect.height - OFFSET_Y;
    }

    tooltipEl.style.transform = `translate(${x}px, ${y}px)`;
}

export function initTooltipSystem() {
    createTooltipElement();

    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[title]');
        
        if (target) {
            const text = target.getAttribute('title');
            if (text && text.trim() !== "") {
                target.setAttribute('data-tooltip', text);
                target.removeAttribute('title');
                
                currentTarget = target;
                
                if (hoverTimer) clearTimeout(hoverTimer);
                
                // On capture l'event pour la position
                const evt = e;
                hoverTimer = setTimeout(() => {
                    if (currentTarget === target) {
                        showTooltip(text, evt);
                    }
                }, DELAY_MS);
            }
        } 
        else {
            const processedTarget = e.target.closest('[data-tooltip]');
            if (processedTarget) {
                currentTarget = processedTarget;
                const text = processedTarget.getAttribute('data-tooltip');
                
                if (hoverTimer) clearTimeout(hoverTimer);
                
                const evt = e;
                hoverTimer = setTimeout(() => {
                    if (currentTarget === processedTarget) {
                        showTooltip(text, evt);
                    }
                }, DELAY_MS);
            }
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (currentTarget && (e.target === currentTarget || currentTarget.contains(e.target))) {
            if (!e.relatedTarget || !currentTarget.contains(e.relatedTarget)) {
                currentTarget = null;
                hideTooltip();
            }
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (currentTarget) {
            updatePosition(e);
        }
    });
    
    document.addEventListener('mousedown', () => {
        hideTooltip();
    });
}