// clean-artifacts.js
import { readdir, unlink } from 'fs/promises';
import { join } from 'path';

const releaseDir = './release';

async function cleanBlockmaps() {
  try {
    const files = await readdir(releaseDir);
    const blockmapFiles = files.filter(file => file.endsWith('.blockmap'));

    if (blockmapFiles.length === 0) {
      console.log('Aucun fichier .blockmap à supprimer.');
      return;
    }

    const deletePromises = blockmapFiles.map(file => {
      const filePath = join(releaseDir, file);
      console.log(`Suppression de : ${filePath}`);
      return unlink(filePath);
    });

    await Promise.all(deletePromises);
    console.log('Nettoyage des fichiers .blockmap terminé.');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Erreur lors du nettoyage des fichiers .blockmap :', error);
      process.exit(1);
    } else {
      console.log('Le dossier "release" n\'existe pas, rien à nettoyer.');
    }
  }
}

cleanBlockmaps();