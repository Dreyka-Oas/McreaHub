// src/renderer/utils/formatters.js

/**
 * Formate un nombre d'octets en une chaîne de caractères lisible (Ko, Mo, Go).
 * @param {number} bytes - Le nombre d'octets à formater.
 * @param {number} decimals - Le nombre de décimales à afficher.
 * @returns {string} La taille formatée.
 */
export function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'Ko', 'Mo', 'Go', 'To'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Formate une chaîne de date ISO (ex: "2025-10-12T15:44:30.790Z")
 * en une date lisible pour l'utilisateur (ex: "12 oct. 2025").
 * @param {string} dateString - La date au format ISO.
 * @returns {string} La date formatée.
 */
export function formatDate(dateString) {
  if (!dateString) return 'Date inconnue';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formate un timestamp en une heure lisible (ex: "15:44:30").
 * @param {number} timestamp - Le timestamp (en millisecondes).
 * @returns {string} L'heure formatée.
 */
export function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Formate une vitesse en octets/seconde en une chaîne lisible (KB/s, MB/s, etc.).
 * @param {number} bytesPerSecond - La vitesse en octets par seconde.
 * @returns {string} La vitesse formatée.
 */
export function formatSpeed(bytesPerSecond) {
  if (!+bytesPerSecond || bytesPerSecond < 0) return '0 B/s';

  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
  // Gère le cas où la vitesse est inférieure à 1 Ko/s
  if (bytesPerSecond < k) {
      return `${bytesPerSecond.toFixed(0)} ${sizes[0]}`;
  }
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));

  return `${parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}