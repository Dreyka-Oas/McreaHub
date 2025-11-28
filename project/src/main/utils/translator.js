// src/main/utils/translator.js
import fetch from 'node-fetch';

// --- LISTE ÉPURÉE (Instances stables et moins strictes) ---
const ALL_INSTANCES = [
    'https://lingva.lunar.icu',          // Souvent la plus fiable
    'https://lingva.adminforge.de',      // Très robuste (Allemagne)
    'https://lingva.aksrm.com',          // Bon uptime
    'https://lingva.org.ru',             // Fonctionnelle
    'https://lingva.encrypted-data.xyz', // À retenter avec les nouveaux headers
    'https://lingva.reasley.com',
    'https://lingva.bednet.ru'
];

// Fallback en cas d'échec de la course
const RELIABLE_INSTANCES = [
    'https://lingva.lunar.icu',
    'https://lingva.adminforge.de'
];

// Camouflage : Navigateurs Récents (Avril 2024)
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:125.0) Gecko/20100101 Firefox/125.0'
];

const CONCURRENCY_LIMIT = 4;

function pickRandomInstances(count) {
    const shuffled = [...ALL_INSTANCES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function isTranslationValid(original, translated) {
    if (!translated) return false;
    const normOrig = original.trim().toLowerCase().replace(/\s+/g, ' ');
    const normTrans = translated.trim().toLowerCase().replace(/\s+/g, ' ');
    if (normTrans.length === 0) return false;
    if (normOrig.length > 15 && normOrig === normTrans) return false; 
    if (translated.includes('<!DOCTYPE') || translated.includes('<html')) return false;
    return true;
}

// Utilitaire pour combiner les signaux d'annulation
function anySignal(signals) {
    const controller = new AbortController();
    for (const signal of signals) {
        if (!signal) continue;
        if (signal.aborted) {
            controller.abort();
            return signal;
        }
        signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    return controller.signal;
}

async function tryTranslateOnInstance(text, instance, source, target, logger, parentSignal) {
    if (parentSignal && parentSignal.aborted) return null;

    const controller = new AbortController();
    const combinedSignal = anySignal([controller.signal, parentSignal]);
    // Timeout un peu plus court pour passer vite à la suite si ça bloque
    const timeoutId = setTimeout(() => controller.abort(), 6000); 

    const log = (msg) => { if (logger) logger(msg); else console.warn(msg); };

    try {
        const url = `${instance}/api/v1/${source}/${target}/${encodeURIComponent(text)}`;
        const ua = getRandomUserAgent();

        const response = await fetch(url, { 
            signal: combinedSignal,
            headers: {
                'User-Agent': ua,
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': instance + '/',
                'Origin': instance,
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'Connection': 'keep-alive'
            }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            // On ne loggue plus les 403/429/500 pour ne pas polluer, on sait que ça arrive
            return null;
        }
        
        const data = await response.json();
        
        if (!data || !data.translation) return null;

        if (isTranslationValid(text, data.translation)) {
            return data.translation;
        } else {
            return null;
        }
    } catch (e) {
        clearTimeout(timeoutId);
        return null;
    }
}

export async function translateStream(linesArray, targetLang, onProgress, logger = null, signal = null) {
    const source = 'en';
    const target = targetLang.split('-')[0].toLowerCase();

    if (source === target) return;

    const tasks = linesArray
        .map((line, index) => ({ line, index }))
        .filter(item => item.line && item.line.trim().length > 1);

    if (logger) logger(`[Translator] Démarrage optimisé sur ${tasks.length} lignes...`);

    let cursor = 0;

    const worker = async (workerId) => {
        while (true) {
            if (signal && signal.aborted) break;
            if (cursor >= tasks.length) break;
            
            const currentTask = tasks[cursor];
            cursor++;

            const { line, index } = currentTask;
            let finalTranslation = null;

            // PHASE 1 : COURSE (2 essais avec 2 serveurs)
            for (let raceAttempt = 0; raceAttempt < 2; raceAttempt++) {
                if (finalTranslation || (signal && signal.aborted)) break;
                
                const racers = pickRandomInstances(2);
                const promises = racers.map(url => tryTranslateOnInstance(line, url, source, target, logger, signal));
                
                try {
                    const result = await Promise.any(promises.map(p => p.then(res => {
                        if (!res) throw new Error("Fail");
                        return res;
                    })));
                    finalTranslation = result;
                } catch (e) {}
                
                // Délai aléatoire pour éviter d'être détecté comme un bot rythmé
                if (!finalTranslation) await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
            }

            // PHASE 2 : SECOURS (Serveurs solides uniquement)
            if (!finalTranslation && !(signal && signal.aborted)) {
                for (const reliableInstance of RELIABLE_INSTANCES) {
                    if (finalTranslation || (signal && signal.aborted)) break;
                    finalTranslation = await tryTranslateOnInstance(line, reliableInstance, source, target, logger, signal);
                }
            }

            if (signal && signal.aborted) break;

            const resultToSend = finalTranslation || line;
            onProgress({ indices: [index], lines: [resultToSend] });
        }
    };

    const workers = [];
    for (let i = 0; i < CONCURRENCY_LIMIT; i++) {
        workers.push(worker(i));
    }

    await Promise.all(workers);
    
    if (signal && signal.aborted) {
        if (logger) logger("[Translator] Annulé.");
    } else {
        if (logger) logger("[Translator] Terminé.");
    }
}

export async function translateTextWithPrivacy(text, target) {
    const res = await tryTranslateOnInstance(text, 'https://lingva.lunar.icu', 'en', target.split('-')[0], null, null);
    return res || text;
}