// build/electron-builder.cjs

const { execSync } = require('child_process');

function getCommitHash() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    return 'nohash';
  }
}

const buildTarget = process.env.BUILD_TARGET || 'user';

const targetConfigs = {
  user: { productName: 'Mcreahub', appId: 'com.dreykaoas.mcreahub' },
  pro: { productName: 'Mcreahub Pro', appId: 'com.dreykaoas.mcreahub.pro' },
  extras: { productName: 'Mcreahub Extras', appId: 'com.dreykaoas.mcreahub.extras' },
  dev: { productName: 'Mcreahub DEV', appId: 'com.dreykaoas.mcreahub.dev' }
};

const currentConfig = targetConfigs[buildTarget];

const config = {
  appId: currentConfig.appId,
  productName: currentConfig.productName,
  directories: { output: 'release' },
  artifactName: '${productName}-Setup-${version}-${os}-${arch}.${ext}',
  
  files: [
    'out/**/*',
    'package.json',
    '!**/*.map',
    '!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}',
    '!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}',
    '!**/node_modules/*.d.ts',
    '!**/node_modules/.bin',
    '!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}',
    '!.editorconfig',
    '!**/._*',
    '!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}',
    '!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}',
    '!**/{appveyor.yml,.travis.yml,circle.yml}',
    '!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}'
  ],
  
  asarUnpack: ['**/node_modules/keytar/**/*'],
  asar: true,

  // --- WINDOWS ---
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'src/renderer/assets/icons/logo.ico',
    requestedExecutionLevel: 'asInvoker'
  },

  // --- MAC (CORRIGÉ) ---
  mac: { 
    target: 'dmg', 
    icon: 'src/renderer/assets/icons/logo.icns',
    // CRITIQUE : Désactive la signature de code pour éviter l'erreur sur GitHub Actions
    identity: null 
  },

  // --- LINUX (CORRIGÉ) ---
  linux: { 
    target: 'AppImage', 
    // Linux préfère souvent les PNG. Assure-toi d'avoir ce fichier (512x512 ou 1024x1024)
    icon: 'src/renderer/assets/icons/logo.png',
    category: 'Game' 
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    perMachine: true, 
    allowElevation: true, 
    uninstallDisplayName: `${currentConfig.productName} Uninstaller`,
    deleteAppDataOnUninstall: false,
    warningsAsErrors: false,
    installerLanguages: ['fr', 'en'],
    language: '1036',
    differentialPackage: true,
    include: 'build/installer.nsh'
  },
  
  compression: 'maximum',
  nodeGypRebuild: false,
  buildDependenciesFromSource: false,
  extraMetadata: { main: 'out/main/index.js' }
};

module.exports = config;