// build-tools/build-config-loader.cjs

const fs = require('fs');
const path = require('path');

function loadBuildConfig() {
  // Détermine la cible de build. 'user' est la valeur par défaut si non spécifié.
  const buildTarget = process.env.BUILD_TARGET || 'user';

  // Charge le fichier de configuration de base
  const configPath = path.resolve(__dirname, './build-config.json');
  const baseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // Trouve l'indice de niveau de notre cible actuelle
  const targetLevelIndex = baseConfig.levels.indexOf(buildTarget);

  if (targetLevelIndex === -1) {
    throw new Error(`Cible de build invalide : "${buildTarget}". Doit être une des valeurs suivantes : ${baseConfig.levels.join(', ')}`);
  }

  // Construit la configuration finale
  const finalConfig = {
    name: buildTarget,
    features: {}
  };

  // Parcourt chaque fonctionnalité définie dans la configuration de base
  for (const featureName in baseConfig.features) {
    const requiredLevel = baseConfig.features[featureName];
    const requiredLevelIndex = baseConfig.levels.indexOf(requiredLevel);

    if (requiredLevelIndex === -1) {
      console.warn(`[BuildConfig] Niveau requis "${requiredLevel}" pour la fonctionnalité "${featureName}" n'existe pas.`);
      finalConfig.features[featureName] = false;
      continue;
    }

    // La fonctionnalité est activée si le niveau de notre cible est égal ou supérieur au niveau requis.
    finalConfig.features[featureName] = (targetLevelIndex >= requiredLevelIndex);
  }

  // Les anciennes propriétés sont maintenant sous "features" pour la cohérence
  finalConfig.showDevTools = finalConfig.features.showDevTools;
  finalConfig.enableLogging = finalConfig.features.enableLogging;

  console.log(`[BuildConfig Loader] Configuration générée pour le niveau "${finalConfig.name}"`);

  return finalConfig;
}

module.exports = { loadBuildConfig };