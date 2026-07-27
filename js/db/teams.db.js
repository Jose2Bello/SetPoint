/* js/db/teams.db.js */
import { getDB } from './connection.js';

export const teamsDb = {
    /**
     * Gets all teams belonging to a specific league.
     * @param {number} leagueId 
     * @returns {Promise<Array>}
     */
    getByLeague(leagueId) {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('teams', 'readonly');
            const store = tx.objectStore('teams');
            const index = store.index('leagueId');
            const request = index.getAll(Number(leagueId));
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Gets a team by its ID.
     * @param {number} id 
     * @returns {Promise<object|null>}
     */
    getById(id) {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('teams', 'readonly');
            const store = tx.objectStore('teams');
            const request = store.get(Number(id));
            
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Creates a new team in the database.
     * @param {object} team 
     * @returns {Promise<number>} Returns the new team ID
     */
    create(team) {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('teams', 'readwrite');
            const store = tx.objectStore('teams');
            
            const data = {
                leagueId: Number(team.leagueId),
                name: team.name.trim(),
                logo: team.logo || '', // <-- Cambiado de shield a logo
                primaryColor: team.primaryColor || '#3b82f6',
                secondaryColor: team.secondaryColor || '#1e3a8a',
                city: (team.city || '').trim(),
                stats: {
                    played: 0,
                    won: 0,
                    drawn: 0,
                    lost: 0,
                    goalsFor: 0,
                    goalsAgainst: 0,
                    goalsDiff: 0,
                    points: 0
                },
                createdAt: new Date().toISOString()
            };
            
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    update(id, teamUpdate) {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('teams', 'readwrite');
            const store = tx.objectStore('teams');
            
            const getReq = store.get(Number(id));
            getReq.onsuccess = () => {
                const data = getReq.result;
                if (!data) {
                    reject(new Error('Team not found'));
                    return;
                }
                
                data.name = teamUpdate.name.trim();
                data.logo = teamUpdate.logo || ''; // <-- Cambiado de shield a logo
                data.primaryColor = teamUpdate.primaryColor;
                data.secondaryColor = teamUpdate.secondaryColor;
                data.city = (teamUpdate.city || '').trim();
                
                const putReq = store.put(data);
                putReq.onsuccess = () => resolve();
                putReq.onerror = () => reject(putReq.error);
            };
            getReq.onerror = () => reject(getReq.error);
        });
    },

    /**
     * Deletes a team. (Note: Relational validation is handled by service layer).
     * @param {number} id 
     * @returns {Promise<void>}
     */
    delete(id) {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('teams', 'readwrite');
            const store = tx.objectStore('teams');
            const request = store.delete(Number(id));
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};
