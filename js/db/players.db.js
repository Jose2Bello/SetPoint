import { getDB } from './connection.js';
import { getTeamsByLeague } from './teams.db.js';

/**
 * Obtiene todos los jugadores pertenecientes a una liga.
 * @param {number} leagueId 
 * @returns {Promise<Array>}
 */
export async function getAllPlayers(leagueId) {
    const teams = await getTeamsByLeague(leagueId);
    const teamIds = new Set(teams.map(t => t.id));
    
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('players', 'readonly');
        const store = tx.objectStore('players');
        const request = store.getAll();
        
        request.onsuccess = () => {
            const allPlayers = request.result || [];
            const filtered = allPlayers.filter(p => teamIds.has(p.teamId));
            resolve(filtered);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Obtiene todos los jugadores pertenecientes a un equipo.
 * @param {number} teamId 
 * @returns {Promise<Array>}
 */
export function getPlayersByTeam(teamId) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('players', 'readonly');
        const store = tx.objectStore('players');
        const index = store.index('teamId');
        const request = index.getAll(Number(teamId));
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Obtiene un jugador por su ID.
 * @param {number} id 
 * @returns {Promise<object|null>}
 */
export function getPlayerById(id) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('players', 'readonly');
        const store = tx.objectStore('players');
        const request = store.get(Number(id));
        
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Crea un nuevo jugador.
 * @param {object} player 
 * @returns {Promise<number>}
 */
export function createPlayer(player) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('players', 'readwrite');
        const store = tx.objectStore('players');
        
        const data = {
            teamId: Number(player.teamId),
            name: player.name.trim(),
            photo: (player.photo || '').trim(),
            position: (player.position || '').trim(),
            number: Number(player.number),
            stats: {
                played: 0,
                matchesPlayed: 0,
                goals: 0
            },
            createdAt: new Date().toISOString()
        };
        
        const request = store.add(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Actualiza un jugador existente.
 * @param {number} id 
 * @param {object} playerUpdate 
 * @returns {Promise<void>}
 */
export function updatePlayer(id, playerUpdate) {
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
            data.teamId = Number(playerUpdate.teamId);
            
            const putReq = store.put(data);
            putReq.onsuccess = () => resolve();
            putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
    });
}

/**
 * Elimina un jugador.
 * @param {number} id 
 * @returns {Promise<void>}
 */
export function deletePlayer(id) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('players', 'readwrite');
        const store = tx.objectStore('players');
        const request = store.delete(Number(id));
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Compatibilidad objeto
export const playersDb = {
    getAll: getAllPlayers,
    getByTeam: getPlayersByTeam,
    getById: getPlayerById,
    create: createPlayer,
    update: updatePlayer,
    delete: deletePlayer
};