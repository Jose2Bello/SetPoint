/* js/db/players.db.js */
import { getDB } from './connection.js';

/**
 * Obtiene todos los jugadores pertenecientes a la liga activa (o sin equipo/liga explícita).
 * @param {number} leagueId 
 * @returns {Promise<Array>}
 */
export function getAllPlayers(leagueId) {
    return new Promise((resolve, reject) => {
        try {
            const db = getDB();
            const tx = db.transaction(['players', 'teams'], 'readonly');
            const playerStore = tx.objectStore('players');
            const teamStore = tx.objectStore('teams');

            const playersReq = playerStore.getAll();
            const teamsReq = teamStore.getAll();

            let playersRes = null;
            let teamsRes = null;

            const checkComplete = () => {
                if (playersRes !== null && teamsRes !== null) {
                    const safePlayers = Array.isArray(playersRes) ? playersRes : [];
                    const safeTeams = Array.isArray(teamsRes) ? teamsRes : [];

                    const leagueTeamIds = new Set(
                        safeTeams
                            .filter(t => Number(t.leagueId) === Number(leagueId))
                            .map(t => Number(t.id))
                    );

                    const filtered = safePlayers.filter(p => {
                        const matchesLeagueId = p.leagueId && Number(p.leagueId) === Number(leagueId);
                        const matchesTeamLeague = p.teamId && leagueTeamIds.has(Number(p.teamId));
                        return matchesLeagueId || matchesTeamLeague || (!p.leagueId && !p.teamId);
                    });

                    resolve(filtered);
                }
            };

            playersReq.onsuccess = () => {
                playersRes = playersReq.result || [];
                checkComplete();
            };
            playersReq.onerror = () => reject(playersReq.error);

            teamsReq.onsuccess = () => {
                teamsRes = teamsReq.result || [];
                checkComplete();
            };
            teamsReq.onerror = () => reject(teamsReq.error);
        } catch (error) {
            console.error("Error en getAllPlayers:", error);
            reject(error);
        }
    });
}

/**
 * Obtiene un jugador por su ID.
 * @param {number} id 
 * @returns {Promise<object|null>}
 */
export function getPlayerById(id) {
    return new Promise((resolve, reject) => {
        try {
            const db = getDB();
            const tx = db.transaction('players', 'readonly');
            const store = tx.objectStore('players');
            const request = store.get(Number(id));

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        } catch (error) {
            console.error("Error en getPlayerById:", error);
            reject(error);
        }
    });
}

/**
 * Obtiene los jugadores pertenecientes a un equipo específico.
 * @param {number} teamId 
 * @returns {Promise<Array>}
 */
export function getPlayersByTeam(teamId) {
    return new Promise((resolve, reject) => {
        try {
            const db = getDB();
            const tx = db.transaction('players', 'readonly');
            const store = tx.objectStore('players');

            if (store.indexNames.contains('teamId')) {
                const index = store.index('teamId');
                const request = index.getAll(Number(teamId));
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            } else {
                const request = store.getAll();
                request.onsuccess = () => {
                    const all = request.result || [];
                    resolve(all.filter(p => Number(p.teamId) === Number(teamId)));
                };
                request.onerror = () => reject(request.error);
            }
        } catch (error) {
            console.error("Error en getPlayersByTeam:", error);
            reject(error);
        }
    });
}

/**
 * Crea y guarda un nuevo jugador en la base de datos IndexedDB.
 * @param {object} playerData 
 * @returns {Promise<number>} ID del nuevo jugador
 */
export function createPlayer(playerData) {
    return new Promise((resolve, reject) => {
        try {
            const db = getDB();
            const tx = db.transaction('players', 'readwrite');
            const store = tx.objectStore('players');

            const newPlayer = {
                name: (playerData.name || '').trim(),
                number: playerData.number !== undefined && playerData.number !== null ? String(playerData.number) : '0',
                teamId: Number(playerData.teamId),
                leagueId: playerData.leagueId ? Number(playerData.leagueId) : null,
                position: playerData.position || 'Jugador',
                photo: playerData.photo || null,
                stats: playerData.stats || { 
                    goals: 0, 
                    matchesPlayed: 0,
                    yellowCards: 0,
                    redCards: 0
                },
                createdAt: new Date().toISOString()
            };

            const request = store.add(newPlayer);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (error) {
            console.error("Error en createPlayer:", error);
            reject(error);
        }
    });
}

/**
 * Actualiza un jugador existente.
 * @param {number} id 
 * @param {object} updatedData 
 * @returns {Promise<object>}
 */
export function updatePlayer(id, updatedData) {
    return new Promise((resolve, reject) => {
        try {
            const db = getDB();
            const tx = db.transaction('players', 'readwrite');
            const store = tx.objectStore('players');

            const getReq = store.get(Number(id));
            getReq.onsuccess = () => {
                const existingPlayer = getReq.result;
                if (!existingPlayer) {
                    reject(new Error(`Jugador con ID ${id} no encontrado.`));
                    return;
                }

                const playerToUpdate = {
                    ...existingPlayer,
                    ...updatedData,
                    updatedAt: new Date().toISOString()
                };

                const putReq = store.put(playerToUpdate);
                putReq.onsuccess = () => resolve(playerToUpdate);
                putReq.onerror = () => reject(putReq.error);
            };
            getReq.onerror = () => reject(getReq.error);
        } catch (error) {
            console.error("Error en updatePlayer:", error);
            reject(error);
        }
    });
}

/**
 * Elimina un jugador de la base de datos.
 * @param {number} id 
 * @returns {Promise<void>}
 */
export function deletePlayer(id) {
    return new Promise((resolve, reject) => {
        try {
            const db = getDB();
            const tx = db.transaction('players', 'readwrite');
            const store = tx.objectStore('players');

            const request = store.delete(Number(id));
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        } catch (error) {
            console.error("Error en deletePlayer:", error);
            reject(error);
        }
    });
}

export const playersDb = {
    getAllPlayers,
    getPlayerById,
    getById: getPlayerById,
    getPlayersByTeam,
    getByTeam: getPlayersByTeam,
    createPlayer,
    create: createPlayer,
    updatePlayer,
    update: updatePlayer,
    deletePlayer,
    delete: deletePlayer
};