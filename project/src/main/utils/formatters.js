// src/main/utils/formatters.js

export function formatMCreatorVersion(versionInt) {
  if (!versionInt) {
    return "Inconnue";
  }

  const s = String(versionInt).padStart(12, '0');

  const year = s.substring(0, 4);
  const major = Number(s.substring(4, 7));
  const build = s.substring(7);

  return `${year}.${major}.${build}`;
}

export function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'Ko', 'Mo', 'Go', 'To'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}