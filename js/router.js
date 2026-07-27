import { renderDashboard } from './views/dashboard.view.js';

const routes = {
    'dashboard': renderDashboard, // Registrar directamente la vista del dashboard
    'leagues': null,
    'teams': null,
    'team': null,     // expects parameter :id
    'players': null,
    'player': null,   // expects parameter :id
    'matches': null,
    'match': null,    // expects parameter :id
    'stats': null
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

    /**
     * Resolves the current hash, extracts params, and triggers rendering
     */
    async handleRouting() {
        if (!this.appContainer) return;

        let hash = window.location.hash.substring(1) || 'dashboard';
        
        // Remove trailing slashes and split by path separator
        const pathParts = hash.split('/').filter(Boolean);
        const routeName = pathParts[0] || 'dashboard';
        const parameter = pathParts[1] || null;

        // Show global loading state while switching views
        this.appContainer.innerHTML = '<loading-state></loading-state>';

        const renderFn = routes[routeName];
        if (typeof renderFn === 'function') {
            try {
                await renderFn(this.appContainer, parameter);
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
            // 404 / Route not found fallback
            this.appContainer.innerHTML = `
                <div class="glass-card text-center" style="margin-top: 50px;">
                    <h2>Vista no Encontrada (404)</h2>
                    <p class="text-secondary">La sección "#${routeName}" no existe o aún no está desarrollada.</p>
                    <a href="#dashboard" class="btn btn-primary" style="margin-top: 15px; display: inline-flex;">Volver al Dashboard</a>
                </div>
            `;
        }

        // Highlight active link in Navbar element
        const navbar = document.querySelector('league-navbar');
        if (navbar && typeof navbar.setActiveLink === 'function') {
            navbar.setActiveLink(routeName);
        }
    }
}

export const router = new Router();