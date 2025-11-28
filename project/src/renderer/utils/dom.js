// src/renderer/utils/dom.js

function hexToRgb(hex) {
    // Supprime le # si présent
    hex = hex.replace(/^#/, '');
    
    // Support format court FFF
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return { r, g, b };
}

/**
 * Applique la couleur d'accentuation à toute l'application.
 * @param {'system' | 'manual'} mode - Le mode de couleur.
 * @param {string} manualColor - La couleur hexadécimale si mode manuel.
 */
export async function applyAccentColor(mode, manualColor) {
    let color = '#0A84FF'; // Bleu par défaut

    if (mode === 'system') {
        try {
            // Demande au main process la couleur système
            const sysColor = await window.electronAPI.getSystemAccentColor();
            if (sysColor) {
                // Electron renvoie parfois sans le # sur Windows
                color = sysColor.startsWith('#') ? sysColor : `#${sysColor}`;
            }
        } catch (e) {
            console.warn("Impossible de récupérer la couleur système, utilisation du défaut.");
        }
    } else if (mode === 'manual' && manualColor) {
        color = manualColor;
    }

    // Application de la couleur principale
    document.documentElement.style.setProperty('--color-accent-blue', color);

    // Calcul de la variante translucide (pour les survols, les fonds de selection)
    const rgb = hexToRgb(color);
    if (!isNaN(rgb.r)) {
        const translucent = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;
        document.documentElement.style.setProperty('--color-accent-blue-translucent', translucent);
        
        // Calcul d'une variante "hover" légèrement plus sombre ou claire selon le besoin
        // Pour faire simple, on garde la même ou on pourrait utiliser filter: brightness dans le CSS
        document.documentElement.style.setProperty('--color-accent-blue-hover', color); // Le CSS peut gérer le hover via filter
    }

    console.log(`[DOM] Accent Color appliqué : ${color} (${mode})`);
}

export function applyTheme(themeName) {
  const body = document.body;
  body.classList.remove('theme-light', 'theme-dark');

  let themeClass = 'theme-dark';
  if (themeName === 'System') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    themeClass = prefersDark ? 'theme-dark' : 'theme-light';
  } else if (themeName === 'Light') {
    themeClass = 'theme-light';
  }

  body.classList.add(themeClass);
  console.log(`[DOM] Thème appliqué: ${themeClass}`);
}

export function debounce(func, delay = 250) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

export function hideStartupLoader() {
  const loader = document.getElementById('startup-loader');
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => {
      if (loader.parentNode) {
        loader.parentNode.removeChild(loader);
      }
    }, 500);
  }
}

export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}