/* js/db/events.db.js */
import { getDB } from './connection.js';

export const eventsDb = {
    /**
     * Gets all events belonging to a specific match.
     * @param {number} matchId 
     * @returns {Promise<Array>}
     */
    getByMatch(matchId) {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('events', 'readonly');
            const store = tx.objectStore('events');
            const index = store.index('matchId');
            const request = index.getAll(Number(matchId));
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Creates a new match event.
     * @param {object} eventData 
     * @returns {Promise<number>} Returns the new event ID
     */
    create(eventData) {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('events', 'readwrite');
            const store = tx.objectStore('events');
            
            const data = {
                matchId: Number(eventData.matchId),
                playerId: Number(eventData.playerId),
                teamId: Number(eventData.teamId),
                type: eventData.type || 'Gol', // Terminology dependent
                minute: eventData.minute ? Number(eventData.minute) : null,
                createdAt: new Date().toISOString()
            };
            
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Deletes a match event.
     * @param {number} id 
     * @returns {Promise<void>}
     */
    delete(id) {
        return new Promise((resolve, reject) => {
            const db = getDB();
            const tx = db.transaction('events', 'readwrite');
            const store = tx.objectStore('events');
            const request = store.delete(Number(id));
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
};
