// build/publish-release.js
const { execSync } = require('child_process');
const { version } = require('../package.json');
const fs = require('fs');

const TAG = `v${version}`;
const REPO_URL = "https://github.com/Dreyka-Oas/McreaHub/actions";

console.log(`\n🚀 PRÉPARATION DE LA RELEASE : ${TAG}\n`);

try {
    // 1. Validation des fichiers locaux
    console.log("📦 Validation des modifications locales...");
    execSync('git add .', { stdio: 'inherit' });
    try {
        execSync(`git commit -m "Release ${TAG}"`, { stdio: 'inherit' });
    } catch (e) {
        console.log("   -> Rien à commiter, on continue.");
    }

    // 2. Nettoyage du Tag distant
    console.log(`🔥 Suppression de l'ancien tag ${TAG} sur GitHub (si existant)...`);
    try {
        execSync(`git push origin :refs/tags/${TAG}`, { stdio: 'inherit' });
    } catch (e) {
        console.log("   -> Le tag n'existait pas sur GitHub, c'est bon.");
    }

    // 3. Nettoyage du Tag local
    console.log(`🧹 Suppression du tag local ${TAG}...`);
    try {
        execSync(`git tag -d ${TAG}`, { stdio: 'inherit' });
    } catch (e) {
        console.log("   -> Le tag n'existait pas localement.");
    }

    // 4. Création du nouveau Tag
    console.log(`✨ Création du nouveau tag ${TAG}...`);
    execSync(`git tag ${TAG}`, { stdio: 'inherit' });

    // 5. Envoi Code + Tag
    console.log("🚀 Envoi vers GitHub...");
    execSync('git push origin main', { stdio: 'inherit' }); 
    execSync(`git push origin ${TAG}`, { stdio: 'inherit' }); 

    console.log("\n✅ SUCCÈS ! Le build a été déclenché sur GitHub.");
    
    // 6. Ouverture du navigateur (CORRIGÉ)
    console.log("🌍 Ouverture de la page Actions...");
    try {
        // Tentative d'ouverture propre selon l'OS
        const startCmd = process.platform === 'win32' ? 'start' : 'open';
        // On utilise 'start "" url' pour Windows pour être plus robuste
        const finalCmd = process.platform === 'win32' ? `start "" "${REPO_URL}"` : `open "${REPO_URL}"`;
        
        execSync(finalCmd, { stdio: 'ignore' });
    } catch (e) {
        // Si l'ouverture échoue, on affiche juste le lien sans planter le script
        console.log(`\n   --> Impossible d'ouvrir le navigateur automatiquement.`);
        console.log(`   --> Veuillez cliquer ici : ${REPO_URL}`);
    }

} catch (error) {
    console.error("\n❌ ERREUR CRITIQUE PENDANT LE PROCESSUS :");
    console.error(error.message);
    process.exit(1);
}