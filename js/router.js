import { renderDashboard } from './views/dashboard.view.js';
import { renderLeagues } from './views/leagues.view.js';
import { renderTeams } from './views/teams.view.js';
import { renderTeamDetail } from './views/team-detail.view.js';
import { renderMatches } from './views/matches.view.js';
import { renderMatchDetail } from './views/match-detail.view.js';
import { renderPlayersView } from './views/players.view.js'; 
import { renderPlayerDetail } from './views/player-detail.view.js';
import { renderStats } from './views/stats-view.js';

const routes = {
    'dashboard': renderDashboard, 
    'leagues': renderLeagues,
    'teams': renderTeams, 
    'team': renderTeamDetail,
    'matches': renderMatches,
    'match': renderMatchDetail,      
    'players': renderPlayersView, 
    'player': renderPlayerDetail,   
    'stats': renderStats
};

class Router {
    constructor() {
        this.appContainer = null;
        window.addEventListener('hashchange', () => this.handleRouting());
    }

    init(container) {
        this.appContainer = container;
        this.handleRouting();
    }

    /**
     * Set rendering function for a specific view
     * @param {string} routeName 
     * @param {function} renderFn 
     */
    register(routeName, renderFn) {
        if (routeName in routes) {
            routes[routeName] = renderFn;
        } else {
            console.warn(`Attempted to register an unknown route: ${routeName}`);
        }
    }

    /**
     * Navigates to a specific hash route programmatically.
     * @param {string} hash 
     */
    navigate(hash) {
        window.location.hash = hash;
    }

  
    
    async handleRouting() {
        if (!this.appContainer) return;

        let hash = window.location.hash.substring(1) || 'dashboard';
        
      
        const pathParts = hash.split('/').filter(Boolean);
        const routeName = pathParts[0] || 'dashboard';
        const rawParameter = pathParts[1] || null;


        const params = { id: rawParameter };

        
        this.appContainer.innerHTML = '<loading-state></loading-state>';

        const renderFn = routes[routeName];
        if (typeof renderFn === 'function') {
            try {
                
                await renderFn(this.appContainer, params);
            } catch (err) {
                console.error(`Error rendering route "${routeName}":`, err);
                this.appContainer.innerHTML = `
                    <div class="glass-card text-center" style="margin-top: 50px;">
                        <h2 class="text-error">Error al Cargar la Vista</h2>
                        <p class="text-secondary">${err.message || 'Ocurrió un error inesperado al renderizar esta sección.'}</p>
                        <button class="btn btn-primary" onclick="window.location.reload()" style="margin-top: 15px;">Recargar Página</button>
                    </div>
                `;
            }
        } else {
         
            this.appContainer.innerHTML = `
                <div class="glass-card text-center" style="margin-top: 50px;">
                    <h2>Vista no Encontrada (404)</h2>
                    <p class="text-secondary">La sección "#${routeName}" no existe o aún no está desarrollada.</p>
                    <a href="#dashboard" class="btn btn-primary" style="margin-top: 15px; display: inline-flex;">Volver al Dashboard</a>
                </div>
            `;
        }

   
        const navbar = document.querySelector('league-navbar');
        if (navbar && typeof navbar.setActiveLink === 'function') {
            navbar.setActiveLink(routeName);
        }
    }
}

export const router = new Router();