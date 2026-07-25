/* js/db/players.db.js */
import { getDB } from './connection.js';

export const playersDb = {
    /**
     * Gets all players belonging to a specific team.
     * @param {number} teamId 
     * @returns {Promise<Array>}
     */
    getByTeam(teamId) {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('players', 'readonly');
            const store = tx.objectStore('players');
            const index = store.index('teamId');
            const request = index.getAll(Number(teamId));
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Gets a player by its ID.
     * @param {number} id 
     * @returns {Promise<object|null>}
     */
    getById(id) {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('players', 'readonly');
            const store = tx.objectStore('players');
            const request = store.get(Number(id));
            
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Creates a new player in the database.
     * @param {object} player 
     * @returns {Promise<number>} Returns the new player ID
     */
    create(player) {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('players', 'readwrite');
            const store = tx.objectStore('players');
            
            const data = {
                teamId: Number(player.teamId),
                name: player.name.trim(),
                photo: (player.photo || '').trim(), // URL
                position: (player.position || '').trim(),
                number: Number(player.number), // unique within team
                // Initial aggregate player stats
                stats: {
                    played: 0,
                    goals: 0
                },
                createdAt: new Date().toISOString()
            };
            
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Updates an existing player.
     * @param {number} id 
     * @param {object} playerUpdate 
     * @returns {Promise<void>}
     */
    update(id, playerUpdate) {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('players', 'readwrite');
            const store = tx.objectStore('players');
            
            const getReq = store.get(Number(id));
            getReq.onsuccess = () => {
                const data = getReq.result;
                if (!data) {
                    reject(new Error('Player not found'));
                    return;
                }
                
                data.name = playerUpdate.name.trim();
                data.photo = (playerUpdate.photo || '').trim();
                data.position = (playerUpdate.position || '').trim();
                data.number = Number(playerUpdate.number);
                data.teamId = Number(playerUpdate.teamId); // Can transfer teams
                
                const putReq = store.put(data);
                putReq.onsuccess = () => resolve();
                putReq.onerror = () => reject(putReq.error);
            };
            getReq.onerror = () => reject(getReq.error);
        });
    },

    /**
     * Deletes a player. (Note: Relational validation is handled by service layer).
     * @param {number} id 
     * @returns {Promise<void>}
     */
    delete(id) {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('players', 'readwrite');
            const store = tx.objectStore('players');
            const request = store.delete(Number(id));
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};
