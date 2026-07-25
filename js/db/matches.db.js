/* js/db/matches.db.js */
import { getDB } from './connection.js';

export const matchesDb = {
    /**
     * Gets all matches belonging to a specific league.
     * @param {number} leagueId 
     * @returns {Promise<Array>}
     */
    getByLeague(leagueId) {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('matches', 'readonly');
            const store = tx.objectStore('matches');
            const index = store.index('leagueId');
            const request = index.getAll(Number(leagueId));
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Gets a match by its ID.
     * @param {number} id 
     * @returns {Promise<object|null>}
     */
    getById(id) {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('matches', 'readonly');
            const store = tx.objectStore('matches');
            const request = store.get(Number(id));
            
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Creates a new match.
     * @param {object} match 
     * @returns {Promise<number>} Returns the new match ID
     */
    create(match) {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('matches', 'readwrite');
            const store = tx.objectStore('matches');
            
            const data = {
                leagueId: Number(match.leagueId),
                homeTeamId: match.homeTeamId ? Number(match.homeTeamId) : null, // Can be null in templates/brackets "Por definir"
                awayTeamId: match.awayTeamId ? Number(match.awayTeamId) : null,
                date: match.date || null,
                status: match.status || 'Programado', // 'Programado' or 'Finalizado'
                score: match.score || { home: 0, away: 0 },
                round: match.round !== undefined ? match.round : null,
                nextMatchId: match.nextMatchId ? Number(match.nextMatchId) : null,
                nextMatchHomeSlot: match.nextMatchHomeSlot !== undefined ? match.nextMatchHomeSlot : null,
                winnerId: match.winnerId ? Number(match.winnerId) : null, // manually declared if draw in elimination
                createdAt: new Date().toISOString()
            };
            
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Updates an existing match (e.g. reschedule date/time).
     * @param {number} id 
     * @param {object} matchUpdate 
     * @returns {Promise<void>}
     */
    update(id, matchUpdate) {
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
                if (matchUpdate.score !== undefined) data.score = matchUpdate.score;
                if (matchUpdate.winnerId !== undefined) data.winnerId = matchUpdate.winnerId ? Number(matchUpdate.winnerId) : null;
                
                const putReq = store.put(data);
                putReq.onsuccess = () => resolve();
                putReq.onerror = () => reject(putReq.error);
            };
            getReq.onerror = () => reject(getReq.error);
        });
    },

    /**
     * Deletes a match. (Note: Relational validation is handled by service layer).
     * @param {number} id 
     * @returns {Promise<void>}
     */
    delete(id) {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('matches', 'readwrite');
            const store = tx.objectStore('matches');
            const request = store.delete(Number(id));
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};
