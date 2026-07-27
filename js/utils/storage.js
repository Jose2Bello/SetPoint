/* js/utils/storage.js */

const PREFIX = 'leaguehub_';

export const storage = {
    /**
     * Gets an item from LocalStorage.
     * @param {string} key 
     * @param {*} [defaultValue=null] 
     * @returns {*}
     */
    get(key, defaultValue = null) {
        try {
            const val = localStorage.getItem(PREFIX + key);
            if (val === null) return defaultValue;
            return JSON.parse(val);
        } catch (e) {
            console.error(`Error reading key ${key} from LocalStorage`, e);
            return defaultValue;
        }
    },

    /**
     * Sets an item in LocalStorage.
     * @param {string} key 
     * @param {*} value 
     */
    set(key, value) {
        try {
            localStorage.setItem(PREFIX + key, JSON.stringify(value));
        } catch (e) {
            console.error(`Error setting key ${key} in LocalStorage`, e);
        }
    },

    /**
     * Removes an item from LocalStorage.
     * @param {string} key 
     */
    remove(key) {
        localStorage.removeItem(PREFIX + key);
    },

    /**
     * Gets the active league ID.
     * @returns {number|string|null}
     */
    getActiveLeagueId() {
        return this.get('active_league_id', null);
    },

    /**
     * Sets the active league ID.
     * @param {number|string} id 
     */
    setActiveLeagueId(id) {
        if (id) {
            this.set('active_league_id', id);
        } else {
            this.remove('active_league_id');
        }
    },

    /**
     * Gets the visual theme preference.
     * @returns {string} 'dark' or 'light'
     */
    getTheme() {
        return this.get('theme', 'dark');
    },

    /**
     * Sets the visual theme preference.
     * @param {string} theme 'dark' or 'light'
     */
    setTheme(theme) {
        this.set('theme', theme);
    }
};

// --- Helpers de exportación nombrada para compatibilidad ---
export const getActiveLeagueFromStorage = () => storage.getActiveLeagueId();
export const setActiveLeagueInStorage = (id) => storage.setActiveLeagueId(id);