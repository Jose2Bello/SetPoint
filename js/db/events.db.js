import { getDB } from './connection.js';

/**
 * Obtiene todos los eventos de un partido.
 * @param {number} matchId 
 * @returns {Promise<Array>}
 */
export function getEventsByMatch(matchId) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('events', 'readonly');
        const store = tx.objectStore('events');
        const index = store.index('matchId');
        const request = index.getAll(Number(matchId));
        
        request.onsuccess = () => {
            const raw = request.result || [];
            const seen = new Set();
            const unique = [];
            for (const ev of raw) {
                const key = `${ev.matchId}_${ev.playerId}_${ev.teamId}_${ev.type}_${ev.minute ?? 'null'}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    unique.push(ev);
                }
            }
            resolve(unique);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Obtiene todos los eventos asociados a un jugador.
 * @param {number} playerId 
 * @returns {Promise<Array>}
 */
export function getEventsByPlayer(playerId) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('events', 'readonly');
        const store = tx.objectStore('events');
        const index = store.index('playerId');
        const request = index.getAll(Number(playerId));
        
        request.onsuccess = () => {
            const raw = request.result || [];
            const seen = new Set();
            const unique = [];
            for (const ev of raw) {
                const key = `${ev.matchId}_${ev.playerId}_${ev.teamId}_${ev.type}_${ev.minute ?? 'null'}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    unique.push(ev);
                }
            }
            resolve(unique);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Crea un evento de partido.
 * @param {object} eventData 
 * @returns {Promise<number>}
 */
export function createEvent(eventData) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('events', 'readwrite');
        const store = tx.objectStore('events');
        
        const data = {
            matchId: Number(eventData.matchId),
            playerId: Number(eventData.playerId),
            teamId: Number(eventData.teamId),
            type: eventData.type || 'Gol',
            minute: eventData.minute ? Number(eventData.minute) : null,
            createdAt: new Date().toISOString()
        };
        
        const request = store.add(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Elimina un evento de partido y sus duplicados si existen.
 * @param {number} id 
 * @returns {Promise<void>}
 */
export function deleteEvent(id) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('events', 'readwrite');
        const store = tx.objectStore('events');
        const getReq = store.get(Number(id));
        
        getReq.onsuccess = () => {
            const targetEv = getReq.result;
            if (!targetEv) {
                resolve();
                return;
            }
            
            const index = store.index('matchId');
            const matchEventsReq = index.getAll(targetEv.matchId);
            matchEventsReq.onsuccess = () => {
                const allMatchEvents = matchEventsReq.result || [];
                const targetKey = `${targetEv.matchId}_${targetEv.playerId}_${targetEv.teamId}_${targetEv.type}_${targetEv.minute ?? 'null'}`;
                
                allMatchEvents.forEach(ev => {
                    const key = `${ev.matchId}_${ev.playerId}_${ev.teamId}_${ev.type}_${ev.minute ?? 'null'}`;
                    if (key === targetKey) {
                        store.delete(ev.id);
                    }
                });
            };
        };
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// Exportaciones nombradas alternativas para match-detail.view.js
export const createMatchEvent = createEvent;
export const getMatchEvents = getEventsByMatch;
export const getEventsByMatchId = getEventsByMatch;
export const deleteMatchEvent = deleteEvent;

// Compatibilidad con objeto eventsDb
export const eventsDb = {
    getByMatch: getEventsByMatch,
    getByPlayer: getEventsByPlayer,
    create: createEvent,
    delete: deleteEvent
};