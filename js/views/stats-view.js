// js/views/stats.view.js
import { getActiveLeague } from '../db/leagues.db.js';
import { getTeamsByLeague } from '../db/teams.db.js';
import { getAllPlayers } from '../db/players.db.js';
import { getAllMatches } from '../db/matches.db.js';
import { SPORTS } from '../sports-terms.js';

export async function renderStats(container) {
    container.textContent = '';
    const loading = document.createElement('loading-state');
    loading.setAttribute('message', 'Generando estadísticas y análisis...');
    container.appendChild(loading);

    const activeLeague = await getActiveLeague();
    if (!activeLeague) {
        container.textContent = '';
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';

        const h2 = document.createElement('h2');
        h2.textContent = 'No hay liga activa';
        emptyDiv.appendChild(h2);

        const p = document.createElement('p');
        p.textContent = 'Activa o crea una liga para visualizar sus estadísticas.';
        emptyDiv.appendChild(p);

        const a = document.createElement('a');
        a.href = '#leagues';
        a.className = 'btn btn-primary';
        a.textContent = 'Ir a Ligas';
        emptyDiv.appendChild(a);

        container.appendChild(emptyDiv);
        return;
    }

    const sportConfig = SPORTS[activeLeague.sport] || SPORTS.futbol;
    const teams = await getTeamsByLeague(activeLeague.id);
    const players = await getAllPlayers(activeLeague.id);
    const matches = await getAllMatches(activeLeague.id);

    // Cálculos estadísticos generales
    const finishedMatches = matches.filter(m => m.status === 'finished');
    const totalGoals = finishedMatches.reduce((acc, m) => acc + (m.homeScore || 0) + (m.awayScore || 0), 0);
    const avgGoals = finishedMatches.length ? (totalGoals / finishedMatches.length).toFixed(2) : '0.00';

    // Encontrar goleador / máximo anotador
    let topScorer = null;
    let maxGoals = -1;
    players.forEach(p => {
        const goals = p.stats?.goals || 0;
        if (goals > maxGoals) {
            maxGoals = goals;
            topScorer = p;
        }
    });

    container.textContent = '';

    // Cabecera
    const headerDiv = document.createElement('div');
    headerDiv.className = 'view-header';
    const h1 = document.createElement('h1');
    h1.textContent = 'Estadísticas y Análisis';
    const pSub = document.createElement('p');
    pSub.textContent = `Resumen general para la liga: `;
    const strongLeague = document.createElement('strong');
    strongLeague.textContent = activeLeague.name;
    pSub.appendChild(strongLeague);
    headerDiv.appendChild(h1);
    headerDiv.appendChild(pSub);
    container.appendChild(headerDiv);

    // Grid de Indicadores Clave (KPIs)
    const kpiGrid = document.createElement('div');
    kpiGrid.className = 'stats-overview-grid';

    const createKpiCard = (title, value, subtitle = '') => {
        const card = document.createElement('div');
        card.className = 'stat-card glass-panel';

        const h3 = document.createElement('h3');
        h3.textContent = title;
        card.appendChild(h3);

        const pNum = document.createElement('p');
        pNum.className = 'stat-number';
        pNum.textContent = value;
        card.appendChild(pNum);

        if (subtitle) {
            const pSubCard = document.createElement('p');
            pSubCard.className = 'text-muted text-sm';
            pSubCard.textContent = subtitle;
            card.appendChild(pSubCard);
        }
        return card;
    };

    kpiGrid.appendChild(createKpiCard('Partidos Jugados', `${finishedMatches.length} / ${matches.length}`, 'Completados en el calendario'));
    kpiGrid.appendChild(createKpiCard(`${sportConfig.scoreEvent}s Totales`, totalGoals, `Promedio de ${avgGoals} por partido`));
    kpiGrid.appendChild(createKpiCard('Equipos Inscritos', teams.length, 'Participantes activos'));
    kpiGrid.appendChild(createKpiCard('Atletas Registrados', players.length, 'Plantel total de la liga'));
    
    container.appendChild(kpiGrid);

    // Sección de Destacados Individuales
    const highlightsContainer = document.createElement('div');
    highlightsContainer.className = 'glass-panel section-container';
    
    const h2Highlights = document.createElement('h2');
    h2Highlights.textContent = 'Destacados del Torneo';
    highlightsContainer.appendChild(h2Highlights);

    const highlightsGrid = document.createElement('div');
    highlightsGrid.className = 'cards-grid';

    // Tarjeta de Máximo Anotador
    const scorerCard = document.createElement('div');
    scorerCard.className = 'card glass-panel';
    const h3Scorer = document.createElement('h3');
    h3Scorer.textContent = `Máximo ${sportConfig.scoreEvent}`;
    scorerCard.appendChild(h3Scorer);

    if (topScorer && maxGoals > 0) {
        const pName = document.createElement('p');
        pName.className = 'fw-bold text-lg';
        pName.textContent = topScorer.name;
        scorerCard.appendChild(pName);

        const pStats = document.createElement('p');
        pStats.className = 'text-muted';
        pStats.textContent = `Anotaciones: ${maxGoals} | Dorsal: #${topScorer.number}`;
        scorerCard.appendChild(pStats);
    } else {
        const pNone = document.createElement('p');
        pNone.className = 'text-muted';
        pNone.textContent = 'Aún no hay registros suficientes de anotaciones.';
        scorerCard.appendChild(pNone);
    }
    highlightsGrid.appendChild(scorerCard);

    highlightsContainer.appendChild(highlightsGrid);
    container.appendChild(highlightsContainer);
}