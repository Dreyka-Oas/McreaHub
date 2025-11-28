// build/build-script.mjs
import cliProgress from 'cli-progress';
import { execa } from 'execa';

// Définition des étapes du build et de leur "poids" dans la progression
const steps = [
  { title: 'Compilation du code (Vite)...', command: 'npm', args: ['run', '_vite-build'], weight: 40 },
  { title: 'Empaquetage de l\'application (Electron Builder)...', command: 'npm', args: ['run', '_electron-builder-pro'], weight: 50 },
  { title: 'Nettoyage des artefacts...', command: 'npm', args: ['run', 'clean:artifacts'], weight: 5 },
  { title: 'Nettoyage des fichiers transpilés...', command: 'npm', args: ['run', 'clean:out'], weight: 5 },
];

const totalWeight = steps.reduce((sum, step) => sum + step.weight, 0);

// Création d'une nouvelle barre de progression
const progressBar = new cliProgress.SingleBar({
  format: 'Build en cours (PRO) | {bar} | {percentage}% | {task}',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true
});

async function main() {
  console.log('Démarrage du processus de build McreaHub (PRO)...');
  progressBar.start(totalWeight, 0, { task: 'Initialisation...' });

  let currentProgress = 0;

  try {
    for (const step of steps) {
      progressBar.update(currentProgress, { task: step.title });
      
      await execa(step.command, step.args);
      
      currentProgress += step.weight;
      progressBar.update(currentProgress);
    }

    progressBar.stop();
    console.log('\n✅ Build (PRO) terminé avec succès !');

  } catch (e) {
    progressBar.stop();
    console.error('\n\n❌ Le build (PRO) a échoué à l\'étape :', progressBar.payload.task);
    console.error('-------------------- LOGS DE L\'ERREUR --------------------');
    console.error(e.stdout);
    console.error(e.stderr);
    console.error('---------------------------------------------------------');
    process.exit(1);
  }
}

main();