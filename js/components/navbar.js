/* js/components/navbar.js */
import { storage } from '../utils/storage.js';
import { leaguesDb } from '../db/leagues.db.js';
import { SPORTS } from '../sports-terms.js';
import { initDB } from '../db/connection.js'; 

class LeagueNavbar extends HTMLElement {
    constructor() {
        super();
        this.activeRoute = 'dashboard';
    }

    connectedCallback() {
        
        this.render().catch(err => console.error('Error renderizando navbar:', err));
    
        this._boundHandleLeagueActivation = () => {
            this.render().catch(err => console.error('Error al actualizar navbar por liga activada:', err));
        };
        window.addEventListener('league-activated', this._boundHandleLeagueActivation);
    }

    disconnectedCallback() {
        window.removeEventListener('league-activated', this._boundHandleLeagueActivation);
    }

    setActiveLink(routeName) {
        this.activeRoute = routeName;
        const links = this.querySelectorAll('.nav-links a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${routeName}`) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    async render() {
        try {
            await initDB();
        } catch (e) {
            console.warn('La base de datos aún no está disponible para Navbar');
        }

        const activeLeagueId = storage.getActiveLeagueId();
        let leagueInfo = 'Ninguna Liga Activa';
        let sportConfig = null;

        if (activeLeagueId) {
            try {
                const league = await leaguesDb.getById(activeLeagueId);
                if (league) {
                    sportConfig = SPORTS[league.sport];
                    const sportIcon = sportConfig ? sportConfig.icon : '🏆';
                    leagueInfo = `${sportIcon} ${league.name} (${league.season})`;
                }
            } catch (e) {
                console.error('Error al obtener datos de la liga activa en Navbar:', e);
            }
        }

        this.innerHTML = `
        <header class="header-container">
            <!-- 1. Marca (Izquierda) -->
            <div class="nav-brand">
                <a href="#dashboard" class="flex align-center gap-sm">
                    <span class="brand-logo"></span>
                    <span class="brand-title font-bold">SetPoint</span>
                </a>
            </div>
            
            <!-- 2. Navegación (Centro) -->
            <nav class="nav-links flex gap-md">
                <a href="#dashboard" class="${this.activeRoute === 'dashboard' ? 'active' : ''}">Inicio</a>
                <a href="#leagues" class="${this.activeRoute === 'leagues' ? 'active' : ''}">Ligas</a>
                <a href="#teams" class="${this.activeRoute === 'teams' ? 'active' : ''}">Equipos</a>
                <a href="#players" class="${this.activeRoute === 'players' ? 'active' : ''}">Jugadores</a>
                <a href="#matches" class="${this.activeRoute === 'matches' ? 'active' : ''}">Partidos</a>
                <a href="#stats" class="${this.activeRoute === 'stats' ? 'active' : ''}">Estadísticas</a>
            </nav>

            <!-- 3. Información de Liga Activa (Derecha) -->
            <div class="nav-league-info text-secondary font-medium">
                ${leagueInfo}
            </div>
        </header>
        `;
    }
}

customElements.define('league-navbar', LeagueNavbar);