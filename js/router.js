/* js/router.js */
import { renderDashboard } from './views/dashboard.view.js';
import { renderLeagues, renderLeagueDetail } from './views/leagues.view.js';
import { renderTeams } from './views/teams.view.js';
import { renderTeamDetail } from './views/team-detail.view.js';
import { renderMatches } from './views/matches.view.js';
import { renderMatchDetail } from './views/match-detail.view.js';
import { renderPlayersView } from './views/players.view.js'; 
import { renderPlayerDetail } from './views/player-detail.view.js';
import { renderStats } from './views/stats-view.js';
import { renderBracketView } from './views/bracket.view.js';
import { renderLandingView } from './views/landing.view.js';

const routes = {
    'landing': renderLandingView,
    'dashboard': renderDashboard, 
    'leagues': (container, params) => params?.id ? renderLeagueDetail(container, params) : renderLeagues(container),
    'teams': renderTeams, 
    'team': renderTeamDetail,
    'matches': renderMatches,
    'match': renderMatchDetail,
    'match-detail': renderMatchDetail,
    'players': renderPlayersView, 
    'player': renderPlayerDetail,   
    'stats': renderStats,
    'bracket': renderBracketView
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

    register(routeName, renderFn) {
        if (routeName in routes) {
            routes[routeName] = renderFn;
        } else {
            console.warn(`Attempted to register an unknown route: ${routeName}`);
        }
    }

    navigate(hash) {
        window.location.hash = hash;
    }

    async handleRouting() {
        if (!this.appContainer) return;

        let hash = window.location.hash.substring(1) || 'landing';
        
        const pathParts = hash.split('/').filter(Boolean);
        const routeName = pathParts[0] || 'landing';
        const rawParameter = pathParts[1] || null;

        const params = { id: rawParameter };

        this.appContainer.innerHTML = '<loading-state></loading-state>';

        const renderFn = routes[routeName];
        if (typeof renderFn === 'function') {
            try {
                if (routeName === 'landing') {
                    await renderLandingView(this.appContainer, () => {
                        this.navigate('dashboard');
                    });
                } else {
                    await renderFn(this.appContainer, params);
                }
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
                    <a href="#landing" class="btn btn-primary" style="margin-top: 15px; display: inline-flex;">Volver al Inicio</a>
                </div>
            `;
        }

        const navbar = document.querySelector('league-navbar');
        if (navbar && typeof navbar.setActiveLink === 'function') {
            // Si estamos en landing, pasamos null o un valor neutro para que ningún link del nav luzca activo por error
            navbar.setActiveLink(routeName === 'landing' ? '' : routeName);
        }
    }
}

export const router = new Router();