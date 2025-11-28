// src/renderer/i18n.js

let translations = {};
let currentLocale = 'en';

// On utilise import.meta.glob pour que Vite puisse détecter tous les fichiers de langue
const locales = import.meta.glob('./locales/*.json', { eager: false });

/**
 * Charge un fichier de langue.
 * Gère les fallbacks (ex: 'fr-FR' -> 'fr' -> 'en').
 * @param {string} locale - Le code de la langue à charger (ex: 'fr-FR').
 */
export async function setLocale(locale) {
  currentLocale = locale;
  const langOnly = locale.split('-')[0];

  const pathForLocale = `./locales/${locale}.json`;
  const pathForLangOnly = `./locales/${langOnly}.json`;
  const pathForEnglish = './locales/en.json';

  let loader;

  if (locales[pathForLocale]) {
    loader = locales[pathForLocale];
    currentLocale = locale;
  } else if (locales[pathForLangOnly]) {
    // console.warn(`[i18n] Locale '${locale}' not found, falling back to '${langOnly}'.`); // Optionnel : on peut garder les warnings
    loader = locales[pathForLangOnly];
    currentLocale = langOnly;
  } else {
    console.error(`[i18n] Fallback locale '${langOnly}' not found. Defaulting to 'en'.`);
    loader = locales[pathForEnglish];
    currentLocale = 'en';
  }

  try {
    const module = await loader();
    translations = module.default;
  } catch (error) {
    console.error(`[i18n] Failed to load translations for '${currentLocale}':`, error);
    const enModule = await locales[pathForEnglish]();
    translations = enModule.default;
    currentLocale = 'en';
  }

  // --- LOG SUPPRIMÉ ICI COMME DEMANDÉ ---
}

export function t(key) {
  return key.split('.').reduce((obj, k) => {
    return obj && obj[k];
  }, translations) || key;
}

export function getCurrentLocale() {
    return currentLocale;
}