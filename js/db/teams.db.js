import { getDB } from './connection.js';

/**
 * Obtiene todos los equipos de una liga.
 * @param {number} leagueId 
 * @returns {Promise<Array>}
 */
export function getTeamsByLeague(leagueId) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('teams', 'readonly');
        const store = tx.objectStore('teams');
        const index = store.index('leagueId');
        const request = index.getAll(Number(leagueId));
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Obtiene un equipo por su ID.
 * @param {number} id 
 * @returns {Promise<object|null>}
 */
export function getTeamById(id) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('teams', 'readonly');
        const store = tx.objectStore('teams');
        const request = store.get(Number(id));
        
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Crea un nuevo equipo.
 * @param {object} team 
 * @returns {Promise<number>}
 */
export function createTeam(team) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('teams', 'readwrite');
        const store = tx.objectStore('teams');
        
        const data = {
            leagueId: Number(team.leagueId),
            name: team.name.trim(),
            logo: team.logo || '',
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
}

/**
 * Actualiza un equipo existente.
 * @param {number} id 
 * @param {object} teamUpdate 
 * @returns {Promise<void>}
 */
export function updateTeam(id, teamUpdate) {
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
            data.logo = teamUpdate.logo || '';
            data.primaryColor = teamUpdate.primaryColor;
            data.secondaryColor = teamUpdate.secondaryColor;
            data.city = (teamUpdate.city || '').trim();
            
            const putReq = store.put(data);
            putReq.onsuccess = () => resolve();
            putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
    });
}

/**
 * Elimina un equipo.
 * @param {number} id 
 * @returns {Promise<void>}
 */
export function deleteTeam(id) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('teams', 'readwrite');
        const store = tx.objectStore('teams');
        const request = store.delete(Number(id));
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Compatibilidad objeto
export const teamsDb = {
    getByLeague: getTeamsByLeague,
    getById: getTeamById,
    create: createTeam,
    update: updateTeam,
    delete: deleteTeam
};