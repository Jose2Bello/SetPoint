/* js/db/connection.js */
const DB_NAME = 'leaguehub-db';
const DB_VERSION = 1;

let dbInstance = null;
let dbPromise = null;

/**
 * Initializes the IndexedDB database, sets up stores and indexes.
 * @returns {Promise<IDBDatabase>}
 */
export function initDB() {
    if (dbPromise) return dbPromise;
    
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            console.log(`Upgrading IndexedDB to version ${DB_VERSION}`);
            
            // Leagues store
            if (!db.objectStoreNames.contains('leagues')) {
                const leagueStore = db.createObjectStore('leagues', { keyPath: 'id', autoIncrement: true });
                leagueStore.createIndex('name', 'name', { unique: true });
                leagueStore.createIndex('isActive', 'isActive', { unique: false });
            }
            
            // Teams store
            if (!db.objectStoreNames.contains('teams')) {
                const teamStore = db.createObjectStore('teams', { keyPath: 'id', autoIncrement: true });
                teamStore.createIndex('leagueId', 'leagueId', { unique: false });
                teamStore.createIndex('name', 'name', { unique: false });
                teamStore.createIndex('league_name', ['leagueId', 'name'], { unique: true });
            }
            
            // Players store
            if (!db.objectStoreNames.contains('players')) {
                const playerStore = db.createObjectStore('players', { keyPath: 'id', autoIncrement: true });
                playerStore.createIndex('teamId', 'teamId', { unique: false });
                playerStore.createIndex('name', 'name', { unique: false });
                playerStore.createIndex('team_number', ['teamId', 'number'], { unique: true });
            }
            
            // Matches store
            if (!db.objectStoreNames.contains('matches')) {
                const matchStore = db.createObjectStore('matches', { keyPath: 'id', autoIncrement: true });
                matchStore.createIndex('leagueId', 'leagueId', { unique: false });
                matchStore.createIndex('homeTeamId', 'homeTeamId', { unique: false });
                matchStore.createIndex('awayTeamId', 'awayTeamId', { unique: false });
                matchStore.createIndex('date', 'date', { unique: false });
                matchStore.createIndex('status', 'status', { unique: false });
            }
            
            // MatchEvents store
            if (!db.objectStoreNames.contains('events')) {
                const eventStore = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
                eventStore.createIndex('matchId', 'matchId', { unique: false });
                eventStore.createIndex('playerId', 'playerId', { unique: false });
            }
        };
        
        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            console.log('IndexedDB connected successfully');
            
            dbInstance.onversionchange = () => {
                dbInstance.close();
                // Show an inline notification instead of blocking alert
                const banner = document.createElement('div');
                banner.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:1rem 1.5rem;background:#ef4444;color:#fff;text-align:center;font-weight:600;z-index:9999;';
                banner.textContent = '⚠️ La base de datos fue actualizada. Por favor recarga la página.';
                const btn = document.createElement('button');
                btn.textContent = 'Recargar';
                btn.style.cssText = 'margin-left:1rem;padding:0.25rem 0.75rem;background:#fff;color:#ef4444;border:none;border-radius:4px;cursor:pointer;font-weight:700;';
                btn.onclick = () => location.reload();
                banner.appendChild(btn);
                document.body.prepend(banner);
            };
            
            resolve(dbInstance);
        };
        
        request.onerror = (event) => {
            console.error('Failed to open IndexedDB:', event.target.error);
            dbPromise = null; // Reset promise on error to allow retry
            reject(event.target.error);
        };
    });
    
    return dbPromise;
}

export function getDB() {
    if (!dbInstance) {
        initDB(); 
        if (!dbInstance) {
            throw new Error('La conexión a IndexedDB aún no está inicializada. Usa "await initDB()" antes de acceder.');
        }
    }
    return dbInstance;
}