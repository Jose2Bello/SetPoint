import { getDB } from './connection.js';

/**
 * Obtiene todas las ligas de IndexedDB.
 * @returns {Promise<Array>}
 */
export function getAllLeagues() {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('leagues', 'readonly');
        const store = tx.objectStore('leagues');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Obtiene la liga activa actualmente.
 * @returns {Promise<object|null>}
 */
export function getActiveLeague() {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('leagues', 'readonly');
        const store = tx.objectStore('leagues');
        const request = store.getAll();
        
        request.onsuccess = () => {
            const active = request.result.find(league => league.isActive);
            resolve(active || null);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Obtiene una liga por su ID.
 * @param {number} id 
 * @returns {Promise<object|null>}
 */
export function getLeagueById(id) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('leagues', 'readonly');
        const store = tx.objectStore('leagues');
        const request = store.get(Number(id));
        
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Crea una nueva liga.
 * @param {object} league 
 * @returns {Promise<number>} Devuelve el ID de la nueva liga
 */
export function createLeague(league) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('leagues', 'readwrite');
        const store = tx.objectStore('leagues');
        
        const data = {
            name: league.name.trim(),
            sport: league.sport,
            mode: league.mode, // 'liga' o 'eliminacion'
            rounds: league.mode === 'liga' ? (league.rounds || '1') : null,
            bracketTeamsCount: (league.mode === 'eliminacion' || league.mode === 'doble-eliminacion') ? Number(league.bracketTeamsCount) : null,
            season: league.season.trim(),
            description: (league.description || '').trim(),
            isActive: false,
            createdAt: new Date().toISOString()
        };
        
        const request = store.add(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Actualiza una liga existente.
 * @param {number} id 
 * @param {object} leagueUpdate 
 * @returns {Promise<void>}
 */
export function updateLeague(id, leagueUpdate) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('leagues', 'readwrite');
        const store = tx.objectStore('leagues');
        
        const getReq = store.get(Number(id));
        getReq.onsuccess = () => {
            const data = getReq.result;
            if (!data) {
                reject(new Error('League not found'));
                return;
            }
            
            data.name = leagueUpdate.name.trim();
            data.season = leagueUpdate.season.trim();
            data.description = (leagueUpdate.description || '').trim();
            if (leagueUpdate.isActive !== undefined) data.isActive = leagueUpdate.isActive;
            
            const putReq = store.put(data);
            putReq.onsuccess = () => resolve();
            putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
    });
}

// Compatibilidad con imports tipo objeto (leaguesDb)
export const leaguesDb = {
    getAll: getAllLeagues,
    getActive: getActiveLeague,
    getById: getLeagueById,
    create: createLeague,
    update: updateLeague
};