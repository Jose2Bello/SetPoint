import { getDB } from './connection.js';

/**
 * Obtiene todos los partidos pertenecientes a una liga específica.
 * @param {number} leagueId 
 * @returns {Promise<Array>}
 */
export function getAllMatches(leagueId) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('matches', 'readonly');
        const store = tx.objectStore('matches');
        const index = store.index('leagueId');
        const request = index.getAll(Number(leagueId));
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Obtiene un partido por su ID.
 * @param {number} id 
 * @returns {Promise<object|null>}
 */
export function getMatchById(id) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('matches', 'readonly');
        const store = tx.objectStore('matches');
        const request = store.get(Number(id));
        
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Crea un nuevo partido.
 * @param {object} match 
 * @returns {Promise<number>} Devuelve el ID del nuevo partido
 */
export function createMatch(match) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('matches', 'readwrite');
        const store = tx.objectStore('matches');
        
        const data = {
            leagueId: Number(match.leagueId),
            homeTeamId: match.homeTeamId ? Number(match.homeTeamId) : null,
            awayTeamId: match.awayTeamId ? Number(match.awayTeamId) : null,
            date: match.date || null,
            status: match.status || 'Programado',
            homeScore: match.homeScore !== undefined ? match.homeScore : 0,
            awayScore: match.awayScore !== undefined ? match.awayScore : 0,
            round: match.round !== undefined ? match.round : null,
            nextMatchId: match.nextMatchId ? Number(match.nextMatchId) : null,
            nextMatchHomeSlot: match.nextMatchHomeSlot !== undefined ? match.nextMatchHomeSlot : null,
            winnerId: match.winnerId ? Number(match.winnerId) : null,
            createdAt: new Date().toISOString()
        };
        
        const request = store.add(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Actualiza un partido existente.
 * @param {number} id 
 * @param {object} matchUpdate 
 * @returns {Promise<void>}
 */
export function updateMatch(id, matchUpdate) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('matches', 'readwrite');
        const store = tx.objectStore('matches');
        
        const getReq = store.get(Number(id));
        getReq.onsuccess = () => {
            const data = getReq.result;
            if (!data) {
                reject(new Error('Match not found'));
                return;
            }
            
            if (matchUpdate.homeTeamId !== undefined) data.homeTeamId = matchUpdate.homeTeamId ? Number(matchUpdate.homeTeamId) : null;
            if (matchUpdate.awayTeamId !== undefined) data.awayTeamId = matchUpdate.awayTeamId ? Number(matchUpdate.awayTeamId) : null;
            if (matchUpdate.date !== undefined) data.date = matchUpdate.date;
            if (matchUpdate.status !== undefined) data.status = matchUpdate.status;
            if (matchUpdate.homeScore !== undefined) data.homeScore = matchUpdate.homeScore;
            if (matchUpdate.awayScore !== undefined) data.awayScore = matchUpdate.awayScore;
            if (matchUpdate.winnerId !== undefined) data.winnerId = matchUpdate.winnerId ? Number(matchUpdate.winnerId) : null;
            
            const putReq = store.put(data);
            putReq.onsuccess = () => resolve();
            putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
    });
}

/**
 * Elimina un partido.
 * @param {number} id 
 * @returns {Promise<void>}
 */
export function deleteMatch(id) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('matches', 'readwrite');
        const store = tx.objectStore('matches');
        const request = store.delete(Number(id));
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Compatibilidad con imports de tipo objeto (matchesDb)
export const matchesDb = {
    getByLeague: getAllMatches,
    getById: getMatchById,
    create: createMatch,
    update: updateMatch,
    delete: deleteMatch
};