/* js/services/player.service.js */
import { playersDb } from '../db/players.db.js';
import { eventsDb } from '../db/events.db.js';

export const playerService = {
    /**
     * Checks if a player jersey number is already taken in the same team.
     * @param {number} teamId 
     * @param {number} number 
     * @param {number} [excludeId=null] 
     * @returns {Promise<boolean>}
     */
    async isNumberTaken(teamId, number, excludeId = null) {
        const players = await playersDb.getByTeam(teamId);
        return players.some(p => p.number === Number(number) && p.id !== Number(excludeId));
    },

    /**
     * Deletes a player after verifying they have no score events registered in matches.
     * @param {number} playerId 
     * @returns {Promise<void>}
     */
    async deletePlayer(playerId) {
        const id = Number(playerId);
        const player = await playersDb.getById(id);
        if (!player) throw new Error('Jugador no encontrado.');

        // Fetch events associated with this player
        const playerEvents = await eventsDb.getByMatch(0); // We will query checking if player index has any match event.
        // Wait, eventsDb has index `playerId`. Let's use it to search.
        const db = getDB(); // Note: we can import getDB or query events index directly
        const hasEvents = await new Promise((resolve, reject) => {
            try {
                // If getDB is not imported, let's query via eventsDb helper or import it.
                // Wait! Let's import getDB from db/connection.js
                // Let's write the query using eventsDb.
                const tx = db.transaction('events', 'readonly');
                const store = tx.objectStore('events');
                const index = store.index('playerId');
                const request = index.getKey(id); // Returns the key if exists
                request.onsuccess = () => resolve(request.result !== undefined);
                request.onerror = () => reject(request.error);
            } catch (err) {
                reject(err);
            }
        });

        if (hasEvents) {
            throw new Error('No se puede eliminar el jugador porque tiene goles o puntos registrados en partidos.');
        }

        await playersDb.delete(id);
    }
};

// Import getDB helper inside the file dynamically or directly
import { getDB } from '../db/connection.js';
