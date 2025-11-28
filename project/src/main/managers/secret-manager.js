// src/main/managers/secret-manager.js

import keytar from 'keytar';
import { app } from 'electron';

const ACCOUNT_NAME = 'githubToken';

class SecretManager {
    constructor() {
        // --- MODIFICATION : On ne détermine plus le nom du service ici. ---
        // L'ancien `this.serviceName = app.getName()` est supprimé.
        console.log('[SecretManager] Initialisé.');
    }

    /**
     * Méthode privée pour obtenir le nom du service dynamiquement.
     * Garantit que nous utilisons toujours le nom de l'application à jour.
     * @returns {string} Le nom de service correct (ex: "Mcreahub DEV" ou "Mcreahub").
     */
    _getServiceName() {
        return app.getName();
    }

    /**
     * Sauvegarde le token GitHub de manière sécurisée dans le trousseau du système.
     * @param {string} token - Le token à sauvegarder.
     * @returns {Promise<void>}
     */
    async setGithubToken(token) {
        const serviceName = this._getServiceName();
        if (!token) {
            return this.deleteGithubToken();
        }
        try {
            await keytar.setPassword(serviceName, ACCOUNT_NAME, token);
            console.log(`[SecretManager] Token GitHub sauvegardé dans le trousseau pour le service '${serviceName}'.`);
        } catch (error) {
            console.error('[SecretManager] Erreur lors de la sauvegarde du token :', error);
        }
    }

    /**
     * Récupère le token GitHub depuis le trousseau du système.
     * @returns {Promise<string|null>} Le token ou null s'il n'est pas trouvé.
     */
    async getGithubToken() {
        const serviceName = this._getServiceName();
        try {
            const token = await keytar.getPassword(serviceName, ACCOUNT_NAME);
            return token;
        } catch (error) {
            console.error('[SecretManager] Erreur lors de la récupération du token :', error);
            return null;
        }
    }

    /**
     * Supprime le token GitHub du trousseau du système.
     * @returns {Promise<boolean>}
     */
    async deleteGithubToken() {
        const serviceName = this._getServiceName();
        try {
            const success = await keytar.deletePassword(serviceName, ACCOUNT_NAME);
            if (success) {
                console.log(`[SecretManager] Token GitHub supprimé du trousseau pour le service '${serviceName}'.`);
            }
            return success;
        } catch (error) {
            console.error('[SecretManager] Erreur lors de la suppression du token :', error);
            return false;
        }
    }
}

export default SecretManager;