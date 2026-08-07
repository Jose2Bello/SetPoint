import { getActiveLeague } from '../db/leagues.db.js';
import { getTeamsByLeague } from '../db/teams.db.js';
import { getAllPlayers } from '../db/players.db.js';
import { getAllMatches } from '../db/matches.db.js';
import { SPORTS, getSportConfig } from '../sports-terms.js';

// Instancias de gráficos activas para destruirlas antes de re-renderizar
let activeCharts = [];

function destroyActiveCharts() {
    activeCharts.forEach((c) => { try { c.destroy(); } catch (e) { /* noop */ } });
    activeCharts = [];
}

export async function renderStats(container) {
    container.textContent = '';
    destroyActiveCharts();
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

    const sportConfig = getSportConfig(activeLeague.sport);

    // Etiquetas de infracciones según el deporte (dinámicas por sportConfig.infractions)
    const infractionsConfig = sportConfig.infractions || [];
    const cleanShort = (s = '') => s.replace(/^\p{Extended_Pictographic}+\s*/u, '');
    const pluralize = (word) => /[aeiouáéíóú]$/i.test(word) ? word + 's' : word + 'es';
    const yellowLabel = pluralize(cleanShort(infractionsConfig[0]?.short || 'Amarilla'));
    const redLabel = pluralize(cleanShort(infractionsConfig[1]?.short || 'Roja'));

    const teams = await getTeamsByLeague(activeLeague.id);
    const teamMap = new Map(teams.map(t => [Number(t.id), t]));
    const players = await getAllPlayers(activeLeague.id);
    const matches = await getAllMatches(activeLeague.id);

    // Filtrar partidos finalizados
    const finishedMatches = matches.filter(m => m.status === 'finished' || m.status === 'Finalizado');
    const totalGoals = finishedMatches.reduce((acc, m) => {
        const homeScore = m.homeScore ?? m.score?.home ?? 0;
        const awayScore = m.awayScore ?? m.score?.away ?? 0;
        return acc + homeScore + awayScore;
    }, 0);
    const avgGoals = finishedMatches.length ? (totalGoals / finishedMatches.length).toFixed(2) : '0.00';

    // Top scorers ranking
    const topScorers = [...players]
        .map(p => ({ ...p, goals: p.stats?.goals || 0 }))
        .filter(p => p.goals > 0)
        .sort((a, b) => b.goals - a.goals);

    // Infractions ranking (yellow/red cards)
    const infractions = [...players]
        .map(p => ({
            ...p,
            yellow: p.stats?.yellowCards || 0,
            red: p.stats?.redCards || 0,
            totalCards: (p.stats?.yellowCards || 0) + (p.stats?.redCards || 0)
        }))
        .filter(p => p.totalCards > 0)
        .sort((a, b) => (b.red * 2 + b.yellow) - (a.red * 2 + a.yellow));

    const totalYellows = players.reduce((sum, p) => sum + (p.stats?.yellowCards || 0), 0);
    const totalReds = players.reduce((sum, p) => sum + (p.stats?.redCards || 0), 0);

    container.textContent = '';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'view-header';
    const h1 = document.createElement('h1');
    h1.textContent = 'Estadísticas y Análisis';
    const pSub = document.createElement('p');
    pSub.textContent = 'Resumen general de la liga: ';
    const strongLeague = document.createElement('strong');
    strongLeague.textContent = `${activeLeague.name}`;
    strongLeague.style.color = 'var(--color-text-primary)';
    pSub.appendChild(strongLeague);
    headerDiv.appendChild(h1);
    headerDiv.appendChild(pSub);
    container.appendChild(headerDiv);

    // KPI Cards
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
    kpiGrid.appendChild(createKpiCard(`${sportConfig.scoreEventPlural} Totales`, totalGoals, `Promedio de ${avgGoals} por partido`));
    kpiGrid.appendChild(createKpiCard('Infracciones Totales', `${totalYellows + totalReds}`, `${totalYellows} ${yellowLabel} · ${totalReds} ${redLabel}`));
    kpiGrid.appendChild(createKpiCard('Atletas Registrados', players.length, 'Plantel total de la liga'));
    
    container.appendChild(kpiGrid);

    // Main Stats Layout Grid
    const mainGrid = document.createElement('div');
    mainGrid.className = 'dashboard-grid';
    mainGrid.style.marginTop = '1.5rem';

    // Top Scorers Leaderboard Card
    const scorersCard = document.createElement('div');
    scorersCard.className = 'dashboard-card col-span-6';
    scorersCard.innerHTML = `
        <div class="dashboard-card-title">
            <span>Tabla de ${sportConfig.rankingTitle || 'Anotadores'}</span>
        </div>
        ${topScorers.length === 0 ? `<p class="text-muted text-sm" style="padding:1rem 0;">Aún no hay anotaciones registradas.</p>` : `
            <table class="dashboard-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Jugador</th>
                        <th>Equipo</th>
                        <th>${sportConfig.scoreEventPlural || 'Goles'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${topScorers.slice(0, 7).map((p, idx) => {
                        const team = teamMap.get(Number(p.teamId));
                        return `
                            <tr>
                                <td><strong>${idx + 1}</strong></td>
                                <td><strong style="color:var(--color-text-primary);">#${p.number} ${p.name}</strong></td>
                                <td>${team ? team.name : '-'}</td>
                                <td><strong style="color:#10b981; font-size:1rem;">${p.goals}</strong></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `}
    `;
    mainGrid.appendChild(scorersCard);

    // Infractions / Fair Play Card
    const infractionsCard = document.createElement('div');
    infractionsCard.className = 'dashboard-card col-span-6';
    infractionsCard.innerHTML = `
        <div class="dashboard-card-title">
            <span>Leaderboard de Infracciones (${yellowLabel} y ${redLabel})</span>
        </div>
        ${infractions.length === 0 ? `<p class="text-muted text-sm" style="padding:1rem 0;">¡Excelente Juego Limpio! No hay ${yellowLabel.toLowerCase()} ni ${redLabel.toLowerCase()} registradas.</p>` : `
            <table class="dashboard-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Jugador</th>
                        <th>Equipo</th>
                        <th>${yellowLabel}</th>
                        <th>${redLabel}</th>
                    </tr>
                </thead>
                <tbody>
                    ${infractions.slice(0, 7).map((p, idx) => {
                        const team = teamMap.get(Number(p.teamId));
                        return `
                            <tr>
                                <td><strong>${idx + 1}</strong></td>
                                <td><strong style="color:var(--color-text-primary);">#${p.number} ${p.name}</strong></td>
                                <td>${team ? team.name : '-'}</td>
                                <td><span style="color:#f59e0b; font-weight:700;">${p.yellow}</span></td>
                                <td><span style="color:#ef4444; font-weight:700;">${p.red}</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `}
    `;
    mainGrid.appendChild(infractionsCard);

    // Chart Graphic: Top Scorers Visual Bar Chart
    const chartCard = document.createElement('div');
    chartCard.className = 'dashboard-card col-span-12';
    chartCard.innerHTML = `
        <div class="dashboard-card-title">Gráfico Comparativo de Anotadores Principales</div>
        <div class="chart-wrapper" style="height: 260px;">
            <canvas id="chartStatsScorers"></canvas>
        </div>
    `;
    mainGrid.appendChild(chartCard);

    container.appendChild(mainGrid);

    // Render Chart.js visual
    if (typeof Chart !== 'undefined' && topScorers.length > 0) {
        setTimeout(() => {
            const canvasEl = document.getElementById('chartStatsScorers');
            const ctx = canvasEl?.getContext('2d');
            if (ctx) {
                // Evita "Canvas is already in use" si un render previo quedó en vuelo
                const existing = Chart.getChart(canvasEl);
                if (existing) existing.destroy();

                const bodyStyles = getComputedStyle(document.body);
                const accentHex = (bodyStyles.getPropertyValue('--color-accent') || '#10b981').trim();
                const accentRgb = (bodyStyles.getPropertyValue('--color-accent-rgb') || '16, 185, 129').trim();
                const top6 = topScorers.slice(0, 6);
                activeCharts.push(new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: top6.map(p => `#${p.number} ${p.name}`),
                        datasets: [{
                            label: `${sportConfig.scoreEventPlural || 'Anotaciones'}`,
                            data: top6.map(p => p.goals),
                            backgroundColor: `rgba(${accentRgb}, 0.65)`,
                            borderColor: accentHex,
                            borderWidth: 1,
                            borderRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: { beginAtZero: true, ticks: { precision: 0 } }
                        }
                    }
                }));
            }
        }, 50);
    }
}