// src/renderer/utils/notifications.js

// On définit la limite en haut du fichier pour la modifier facilement plus tard si besoin.
const MAX_NOTIFICATIONS = 3;

/**
 * Affiche une notification temporaire en bas à droite de l'écran.
 * Gère une file d'attente pour n'afficher qu'un maximum de 3 notifications à la fois.
 * @param {string} message - Le message à afficher dans la notification.
 * @param {'info' | 'success' | 'error'} type - Le type de notification, qui détermine sa couleur.
 */
export function showNotification(message, type = 'info') {
  // Crée un conteneur pour les notifications s'il n'existe pas déjà
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    document.body.appendChild(container);
  }
  
  // --- MODIFICATION APPLIQUÉE ICI ---
  // Avant d'ajouter une nouvelle notification, on vérifie si la limite est atteinte.
  // On utilise une boucle `while` par sécurité, au cas où il y en aurait déjà plus que la limite.
  while (container.childElementCount >= MAX_NOTIFICATIONS) {
    // container.firstChild est la notification la plus ancienne. On la supprime immédiatement.
    if (container.firstChild) {
      container.firstChild.remove();
    }
  }

  // Crée le nouvel élément de notification
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;

  // Ajoute la nouvelle notification au conteneur
  container.appendChild(notification);
  
  // Force le "reflow" pour que l'animation d'entrée fonctionne correctement
  void notification.offsetWidth; 
  notification.classList.add('visible');

  // Planifie la disparition de la notification après 4 secondes
  setTimeout(() => {
    notification.classList.remove('visible');
    // Attend la fin de l'animation de sortie avant de supprimer l'élément du DOM
    notification.addEventListener('transitionend', () => {
      notification.remove();
      // Si le conteneur est vide après la suppression, on peut le retirer aussi
      if (container && container.childElementCount === 0) {
        container.remove();
      }
    });
  }, 4000);
}