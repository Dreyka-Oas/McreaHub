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

  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'src/renderer/assets/icons/logo.ico',
    requestedExecutionLevel: 'asInvoker'
  },
  mac: { target: 'dmg', icon: 'src/renderer/assets/icons/logo.icns' },
  linux: { target: 'AppImage', icon: 'src/renderer/assets/icons/logo.icns' },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    perMachine: true, 
    allowElevation: true, 
    uninstallDisplayName: `${currentConfig.productName} Uninstaller`,
    
    // --- IMPORTANT : On désactive la suppression auto pour laisser le script NSH gérer ---
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