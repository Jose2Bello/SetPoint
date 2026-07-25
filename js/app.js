/* js/app.js */
import { initDB } from './db/connection.js';
import { router } from './router.js';
import { storage } from './utils/storage.js';
import { leaguesDb } from './db/leagues.db.js';

import './components/navbar.js';
import './components/footer.js';
import './components/loading-state.js';
import './components/confirm-dialog.js';
import './components/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Set Visual Theme Class (Dark mode is default)
    const theme = storage.getTheme();
    document.body.classList.add(theme === 'light' ? 'light-theme' : 'dark-theme');
    
    try {
        // 2. Initialize Database connection
        await initDB();
        
        // Dispatch success status to database status badges
        window.dispatchEvent(new CustomEvent('db-status-change', { detail: 'connected' }));
        
        // 3. Fetch active league and configure layout theme
        await updateSportTheme();
        
        // 4. Start Router
        const appContainer = document.getElementById('app');
        router.init(appContainer);
        
    } catch (error) {
        console.error('Error initializing LeagueHub application:', error);
        window.dispatchEvent(new CustomEvent('db-status-change', { detail: 'error' }));
        
        const appContainer = document.getElementById('app');
        if (appContainer) {
            appContainer.innerHTML = `
                <div class="glass-card text-center" style="margin-top: 80px; max-width: 600px; margin-left: auto; margin-right: auto;">
                    <h2 class="text-error">Error al Inicializar IndexedDB</h2>
                    <p class="text-secondary" style="margin-top: 10px;">
                        No pudimos conectar con la base de datos local en tu navegador.
                        Por favor, asegúrate de que no estás navegando en modo incógnito estricto que bloquee IndexedDB.
                    </p>
                    <p class="text-muted" style="margin-top: 15px; font-size: 0.85rem;">
                        Detalle del error: ${error.message || error}
                    </p>
                    <button class="btn btn-primary" onclick="window.location.reload()" style="margin-top: 20px;">Reintentar</button>
                </div>
            `;
        }
    }
});

/**
 * Reads active league from storage and updates body sport class for styling.
 */
export async function updateSportTheme() {
    const activeLeagueId = storage.getActiveLeagueId();
    
    // Clear existing sport classes
    document.body.classList.remove('sport-futbol', 'sport-basquet', 'sport-voleibol');
    
    if (activeLeagueId) {
        try {
            const league = await leaguesDb.getById(activeLeagueId);
            if (league) {
                const sportClass = `sport-${league.sport}`;
                document.body.classList.add(sportClass);
            }
        } catch (e) {
            console.error('Error loading league theme:', e);
        }
    }
}

// Global listener to update style theme when active league changes
window.addEventListener('league-activated', async () => {
    await updateSportTheme();
    // Re-render Navbar to show new active league
    const navbar = document.querySelector('league-navbar');
    if (navbar && typeof navbar.render === 'function') {
        await navbar.render();
    }
});
