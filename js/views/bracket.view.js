/* js/views/bracket.view.js */
import { getLeagueById } from '../db/leagues.db.js';
import { getTeamsByLeague } from '../db/teams.db.js';
import { getAllMatches } from '../db/matches.db.js';
import { getSportConfig } from '../sports-terms.js';
import { renderBracketTab } from './leagues.view.js';

export async function renderBracketView(container, params) {
    const leagueId = Number(params.id);
    container.textContent = '';
    const loading = document.createElement('loading-state');
    loading.setAttribute('message', 'Cargando cuadro de eliminación...');
    container.appendChild(loading);

    const league = await getLeagueById(leagueId);
    if (!league) {
        container.textContent = '';
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';

        const h2 = document.createElement('h2');
        h2.textContent = 'Liga no encontrada';
        emptyDiv.appendChild(h2);

        const a = document.createElement('a');
        a.href = '#leagues';
        a.className = 'btn btn-primary';
        a.textContent = 'Ir a Ligas';
        emptyDiv.appendChild(a);

        container.appendChild(emptyDiv);
        return;
    }

    const sport = getSportConfig(league.sport) || { icon: '🏆', name: league.sport || 'Deporte' };
    const teams = await getTeamsByLeague(leagueId);
    const matches = await getAllMatches(leagueId);

    const modeLabel = league.mode === 'eliminacion'
        ? 'Eliminación Directa'
        : (league.mode === 'doble-eliminacion' ? 'Doble Eliminación' : 'Liga Regular');

    container.textContent = '';

    container.innerHTML = `
        <div class="league-detail-header">
            <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                    <span class="dashboard-badge">${sport.icon} ${sport.name}</span>
                    <span style="font-size: 0.8rem; color: var(--color-text-muted);">${modeLabel}</span>
                </div>
                <h1 style="margin: 0; font-size: 1.75rem; color: var(--color-text-primary);">${league.name}</h1>
                <p class="text-sm text-muted" style="margin: 0.25rem 0 0 0;">Temporada: ${league.season || 'N/A'}</p>
            </div>
            <a href="#leagues" class="btn btn-secondary text-sm">&larr; Volver a Ligas</a>
        </div>

        <div id="bracketContent" style="margin-top: 1.5rem;"></div>
    `;

    const bracketContainer = container.querySelector('#bracketContent');
    const refreshBracket = () => renderBracketView(container, params);
    renderBracketTab(bracketContainer, league, teams, matches, refreshBracket);
}
