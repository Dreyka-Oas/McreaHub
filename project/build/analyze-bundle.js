// build/analyze-bundle.js
const fs = require('fs');
const path = require('path');

function getDirectorySize(dirPath) {
  let size = 0;
  
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        size += getDirectorySize(filePath);
      } else {
        size += stats.size;
      }
    }
  } catch (err) {
    console.error(`Erreur lors de la lecture de ${dirPath}:`, err.message);
  }
  
  return size;
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

console.log('\n📊 Analyse de la taille des bundles\n');
console.log('='.repeat(50));

const outDir = path.join(__dirname, '..', 'out');
const releaseDir = path.join(__dirname, '..', 'release');

// Analyser le dossier out
if (fs.existsSync(outDir)) {
  const mainSize = getDirectorySize(path.join(outDir, 'main'));
  const preloadSize = getDirectorySize(path.join(outDir, 'preload'));
  const rendererSize = getDirectorySize(path.join(outDir, 'renderer'));
  const totalOutSize = mainSize + preloadSize + rendererSize;
  
  console.log('\n📁 Dossier "out" (source):');
  console.log(`  Main:     ${formatSize(mainSize)}`);
  console.log(`  Preload:  ${formatSize(preloadSize)}`);
  console.log(`  Renderer: ${formatSize(rendererSize)}`);
  console.log(`  TOTAL:    ${formatSize(totalOutSize)}`);
}

// Analyser le dossier release
if (fs.existsSync(releaseDir)) {
  const installers = fs.readdirSync(releaseDir).filter(f => f.endsWith('.exe'));
  
  if (installers.length > 0) {
    console.log('\n📦 Installeurs générés:');
    installers.forEach(installer => {
      const installerPath = path.join(releaseDir, installer);
      const stats = fs.statSync(installerPath);
      console.log(`  ${installer}: ${formatSize(stats.size)}`);
    });
  }
  
  const unpackedDir = path.join(releaseDir, 'win-unpacked');
  if (fs.existsSync(unpackedDir)) {
    const unpackedSize = getDirectorySize(unpackedDir);
    console.log(`\n📂 Taille décompressée: ${formatSize(unpackedSize)}`);
  }
}

console.log('\n' + '='.repeat(50) + '\n');
