// src/main/utils/file-system.js

import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs/promises';

const promisifiedExec = util.promisify(exec);

// --- SÉCURITÉ : Assainissement ---
export function sanitizeFileName(name) {
    if (!name) return 'unnamed';
    return name.replace(/[^a-zA-Z0-9.\-_]/g, '-').replace(/\.{2,}/g, '.'); 
}

// --- ROBUSTESSE : Suppression Forcée avec Retry (Anti-EBUSY) ---
export async function forceDeleteFolder(dirPath, retries = 5, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            // On tente la suppression
            await fs.rm(dirPath, { recursive: true, force: true });
            return; // Si ça passe, on sort
        } catch (error) {
            // Si c'est une erreur de "Ressource occupée" ou "Permission"
            if (error.code === 'EBUSY' || error.code === 'EPERM' || error.code === 'EACCES') {
                console.warn(`[FS_UTIL] Dossier verrouillé (${error.code}). Nouvelle tentative dans ${delay}ms... (${retries - i - 1} restants)`);
                
                // Si c'était la dernière tentative, on abandonne et on lance l'erreur
                if (i === retries - 1) throw error;
                
                // Sinon on attend avant de réessayer
                await new Promise(resolve => setTimeout(resolve, delay));
            } else if (error.code === 'ENOENT') {
                // Si le dossier n'existe pas/plus, c'est gagné
                return;
            } else {
                // Autre erreur imprévue, on crash
                throw error;
            }
        }
    }
}

// --- ROBUSTESSE : Lecture Auto-Réparatrice ---
export async function readJsonSafe(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        if (error.code === 'ENOENT') return null;

        console.warn(`[FS_UTIL] Corruption détectée dans ${filePath}. Tentative de restauration...`);
        const backupPath = `${filePath}.bak`;
        try {
            const backupContent = await fs.readFile(backupPath, 'utf-8');
            const data = JSON.parse(backupContent);
            await writeJsonAtomic(filePath, data);
            console.log(`[FS_UTIL] Fichier restauré avec succès.`);
            return data;
        } catch (backupError) {
            console.error(`[FS_UTIL] Échec critique : Fichier et backup perdus.`);
            return null;
        }
    }
}

// --- FIABILITÉ : Écriture Atomique ---
export async function writeJsonAtomic(filePath, data) {
    const tempPath = `${filePath}.tmp`;
    const backupPath = `${filePath}.bak`;
    const content = JSON.stringify(data, null, 2);
    
    try {
        try { await fs.copyFile(filePath, backupPath); } catch (e) {}
        await fs.writeFile(tempPath, content, 'utf-8');
        await fs.rename(tempPath, filePath);
        return true;
    } catch (error) {
        console.error(`[FS_UTIL] Erreur d'écriture atomique :`, error);
        try { await fs.unlink(tempPath); } catch (e) {} 
        throw error;
    }
}

async function getJavaProcesses() {
    try {
        const cmd = `powershell.exe -Command "Get-CimInstance -ClassName Win32_Process | Where-Object { $_.Name -eq 'java.exe' -or $_.Name -eq 'javaw.exe' } | Select-Object ProcessId, ExecutablePath | ConvertTo-Csv -NoTypeInformation"`;
        const { stdout } = await promisifiedExec(cmd);
        return stdout.trim().split(/\r?\n/).slice(1).map(l => {
            const [pid, exePath] = l.replace(/"/g, '').split(',');
            return { pid, path: exePath };
        });
    } catch (e) {
        try {
            const { stdout } = await promisifiedExec(`wmic process where "name='java.exe' or name='javaw.exe'" get ProcessID,ExecutablePath /format:csv`);
            return stdout.trim().split(/\r?\n/).slice(1).map(l => {
                const p = l.trim().split(',');
                return p.length >= 3 ? { pid: p[2], path: p[1] } : null;
            }).filter(Boolean);
        } catch (err) { return []; }
    }
}

export async function terminateProcessesInDirectory(dirPath) {
  const normalizedPath = path.normalize(dirPath).toLowerCase();
  if (process.platform !== 'win32') return;

  try {
    const processes = await getJavaProcesses();
    for (const p of processes) {
      if (p && p.path && p.path.toLowerCase().startsWith(normalizedPath)) {
        try { await promisifiedExec(`taskkill /PID ${p.pid} /F`); } catch (e) {}
      }
    }
  } catch (e) {}
}

export async function findMCreatorFiles(dir) {
    let list = [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const e of entries) {
            const fp = path.join(dir, e.name);
            if (e.isDirectory()) list = list.concat(await findMCreatorFiles(fp));
            else if (e.name.endsWith('.mcreator')) list.push(fp);
        }
    } catch (e) {}
    return list;
}

export async function containsMCreatorFileRecursive(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) { if (await containsMCreatorFileRecursive(fp)) return true; }
      else if (e.name.endsWith('.mcreator')) return true;
    }
  } catch (e) {}
  return false;
}