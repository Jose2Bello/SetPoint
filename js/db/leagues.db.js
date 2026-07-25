/* js/db/leagues.db.js */
import { getDB } from './connection.js';

export const leaguesDb = {
    /**
     * Gets all leagues from IndexedDB.
     * @returns {Promise<Array>}
     */
    getAll() {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('leagues', 'readonly');
            const store = tx.objectStore('leagues');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Gets a league by its ID.
     * @param {number} id 
     * @returns {Promise<object|null>}
     */
    getById(id) {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('leagues', 'readonly');
            const store = tx.objectStore('leagues');
            const request = store.get(Number(id));
            
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Creates a new league.
     * @param {object} league 
     * @returns {Promise<number>} Returns the new league ID
     */
    create(league) {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('leagues', 'readwrite');
            const store = tx.objectStore('leagues');
            
            // Clean up league object and ensure default active state is false
            const data = {
                name: league.name.trim(),
                sport: league.sport,
                mode: league.mode, // 'liga' or 'eliminacion'
                rounds: league.mode === 'liga' ? (league.rounds || '1') : null, // '1' or '2' for league, or null
                bracketTeamsCount: league.mode === 'eliminacion' ? Number(league.bracketTeamsCount) : null, // 4, 8 or 16
                season: league.season.trim(),
                description: (league.description || '').trim(),
                isActive: false,
                createdAt: new Date().toISOString()
            };
            
            const request = store.add(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Updates an existing league (only name, season, description).
     * @param {number} id 
     * @param {object} leagueUpdate 
     * @returns {Promise<void>}
     */
    update(id, leagueUpdate) {
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
                
                const putReq = store.put(data);
                putReq.onsuccess = () => resolve();
                putReq.onerror = () => reject(putReq.error);
            };
            getReq.onerror = () => reject(getReq.error);
        });
    }
};
