// build/publish-release.js
const { execSync } = require('child_process');
const { version } = require('../package.json');
const fs = require('fs');

const TAG = `v${version}`;
const REPO_URL = "https://github.com/Dreyka-Oas/McreaHub/actions";

console.log(`\n🚀 PRÉPARATION DE LA RELEASE : ${TAG}\n`);

try {
    // 1. Validation des fichiers locaux (au cas où tu as oublié de save)
    console.log("📦 Validation des modifications locales...");
    execSync('git add .', { stdio: 'inherit' });
    try {
        execSync(`git commit -m "Release ${TAG}"`, { stdio: 'inherit' });
    } catch (e) {
        // On ignore l'erreur si y'avait rien à commiter
        console.log("   -> Rien à commiter, on continue.");
    }

    // 2. Nettoyage du Tag distant (Force Overwrite)
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
    execSync('git push origin main', { stdio: 'inherit' }); // Envoie le code
    execSync(`git push origin ${TAG}`, { stdio: 'inherit' }); // Envoie le tag (déclenche le build)

    console.log("\n✅ SUCCÈS ! Le build a été déclenché sur GitHub.");
    
    // 6. Ouverture du navigateur
    console.log("🌍 Ouverture de la page Actions...");
    execSync(`explorer "${REPO_URL}"`);

} catch (error) {
    console.error("\n❌ ERREUR PENDANT LE PROCESSUS :");
    console.error(error.message);
    process.exit(1);
}