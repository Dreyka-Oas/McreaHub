# 📦 McreaHub - Le Gestionnaire Ultime pour MCreator

**McreaHub** est une application de bureau multi-plateforme conçue pour simplifier le flux de travail des développeurs de mods Minecraft utilisant MCreator. Elle permet d'installer plusieurs versions de MCreator côte à côte, de gérer des projets, de synchroniser le travail avec GitHub et de sécuriser les données via des sauvegardes locales.

![Electron](https://img.shields.io/badge/Electron-33.x-blue?logo=electron) ![Vite](https://img.shields.io/badge/Vite-5.x-purple?logo=vite) ![Lit](https://img.shields.io/badge/UI-Lit%20Html-orange) ![Platform](https://img.shields.io/badge/Platform-Win%20%7C%20Mac%20%7C%20Linux-lightgrey)

## 🚀 Fonctionnalités Principales

### 🛠️ Gestion Multi-Versions
*   **Installations isolées :** Installez et exécutez plusieurs versions de MCreator (ex: 2023.4 et 2024.1) sans conflits.
*   **Téléchargements concurrents :** Gestionnaire de téléchargement intégré capable de récupérer plusieurs versions en parallèle.
*   **Nettoyage intelligent :** Désinstallation propre incluant l'arrêt forcé des processus Java liés.

### 📂 Gestion de Projets & Git
*   **Détection automatique :** Scanne vos dossiers pour trouver les espaces de travail et identifie la version de MCreator requise.
*   **Intégration GitHub :**
    *   Clonez des dépôts directement depuis l'interface.
    *   Synchronisez vos changements (Push/Pull) sans ligne de commande.
    *   Gestion visuelle des statuts (fichiers modifiés, commits de retard/avance).
    *   Éditeur de `.gitignore` intégré.

### 🛡️ Sécurité & Sauvegardes
*   **Backups Locaux :** Système de sauvegarde zippée avec historique configurable (ex: garder les 5 dernières versions).
*   **Restauration en 1 clic :** Restaurez un projet à un état antérieur en cas de corruption ou d'erreur.
*   **Cloud Sync (Gist) :** Synchronisez vos paramètres, vos sources de projets et vos notes entre plusieurs ordinateurs via un Gist GitHub privé.

### 📝 Productivité (Extras)
*   **Notes & Tâches :** Prise de notes intégrée avec liaison possible vers des projets spécifiques.
*   **Changelog Traduit :** Visualisez les mises à jour de MCreator et traduisez-les automatiquement en français (via API Lingva respectueuse de la vie privée).
*   **Config MCreator :** Modifiez les `userpreferences` (RAM Gradle, Thème, etc.) directement depuis McreaHub.

## ⚙️ Architecture Technique

Le projet est construit sur une stack moderne et performante :

*   **Core :** Electron (Main Process) + Node.js.
*   **Bundler :** Vite (Compilation ultra-rapide).
*   **Renderer :** `lit-html` (Rendu léger sans Virtual DOM lourd).
*   **IPC :** Communication sécurisée Main/Renderer via `contextBridge`.
*   **Design :** CSS natif avec variables (Thèmes Sombre/Clair, Glassmorphism).

### Structure des dossiers

```text
project/
├── build/                 # Scripts de build et configuration Electron-Builder
├── src/
│   ├── main/              # Processus Principal (Node.js)
│   │   ├── managers/      # Logique métier (Git, Backup, Install, Notes...)
│   │   ├── utils/         # Utilitaires système (FS, Traduction, Formatage)
│   │   └── main.js        # Point d'entrée
│   ├── preload/           # Pont sécurisé (API expose)
│   └── renderer/          # Interface Utilisateur (Front-end)
│       ├── actions/       # Logique UI (Liaison avec le back-end)
│       ├── components/    # Composants réutilisables (Modales, Cartes, Sidebar)
│       ├── pages/         # Vues principales
│       └── css/           # Styles modulaires
├── electron.vite.config.js # Configuration de la compilation
└── package.json           # Dépendances et scripts
```

## 🛠️ Installation & Développement

### Prérequis
*   Node.js (v20 recommandé)
*   Git & Git LFS (pour les fonctionnalités de synchronisation)

### Commandes

1.  **Installation des dépendances :**
    ```bash
    cd project
    npm install
    ```

2.  **Lancer en mode développement :**
    ```bash
    npm run start
    ```

3.  **Compiler pour la production :**
    Le projet supporte plusieurs cibles de build (User, Pro, Extras) définies via des variables d'environnement.
    ```bash
    # Build standard (Windows/Mac/Linux selon l'OS)
    npm run build
    
    # Build spécifique (ex: version Pro)
    npm run build:pro
    ```

## 🧩 Gestion des Éditions

Le code source contient une logique pour gérer différentes éditions (`User`, `Pro`, `Extras`) via des *feature flags* injectés lors du build :

*   `__FEATURE_GITHUB__` : Active la synchronisation Git.
*   `__FEATURE_NOTES__` : Active le gestionnaire de notes.
*   `__FEATURE_BACKUPS__` : Active le système de sauvegarde.

## 🌍 Internationalisation (i18n)

L'application supporte nativement plusieurs langues (Anglais, Français).
*   Les fichiers de traduction se trouvent dans `src/renderer/locales/`.
*   Détection automatique de la langue du système.

## 📄 Licence

Ce projet est sous licence **ISC**.