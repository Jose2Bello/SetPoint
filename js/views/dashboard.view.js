import { storage } from '../utils/storage.js';
import { leaguesDb } from '../db/leagues.db.js';
import { matchesDb } from '../db/matches.db.js';
import { teamsDb } from '../db/teams.db.js';
import { getAllPlayers } from '../db/players.db.js';
import { standingsService } from '../services/standings.service.js';
import { getSportConfig } from '../sports-terms.js';

export async function renderDashboard(container) {
    const rawId = storage.getActiveLeagueId();
    const activeLeagueId = rawId ? Number(rawId) : null;

    if (!activeLeagueId) {
        renderEmptyState(container, 'No hay ninguna liga activa seleccionada.');
        return;
    }

    const league = await leaguesDb.getById(activeLeagueId);
    if (!league) {
        renderEmptyState(container, 'La liga activa seleccionada ya no existe.');
        return;
    }

    const sportTerm = getSportConfig(league.sport);
    const totalMatchesIcon = {
        futbol: 'assets/partidos_totales%20icon.png',
        basquet: 'assets/partidos_totales_basket%20icon.png',
        voleibol: 'assets/partidos_totales%20volley%20icon.png'
    }[league.sport] || 'assets/partidos_totales%20icon.png';
    const finalizedMatchesIcon = {
        futbol: 'assets/partidos_finalizados_icon.png',
        basquet: 'assets/partidos_finalizados%20basket%20icon.png',
        voleibol: 'assets/partidos_finalizados%20voley%20icon.png'
    }[league.sport] || 'assets/partidos_finalizados_icon.png';
    const matches = await matchesDb.getByLeague(league.id);
    const teams = await teamsDb.getByLeague(league.id);
    const players = await getAllPlayers(league.id);

    const isBracketMode = league.mode === 'eliminacion' || league.mode === 'doble-eliminacion';
    const modeLabel = league.mode === 'eliminacion' ? 'Eliminación Directa' : (league.mode === 'doble-eliminacion' ? 'Doble Eliminación' : 'Liga Regular');

    // Obtener tabla calculada con tu servicio (solo puntos en modo liga)
    const standings = standingsService.getStandings(teams);

    // En modo bracket se calculan posiciones según la eliminación en el torneo
    const bracketStandings = isBracketMode ? computeBracketStandings(teams, matches) : [];

    // Top anotadores según el deporte (se actualizan en todos los modos)
    const topScorers = [...players]
        .map(p => ({ ...p, goals: p.stats?.goals || 0 }))
        .filter(p => p.goals > 0)
        .sort((a, b) => b.goals - a.goals);
    
    // Próximo y último partido según 'status' ('Programado' / 'Finalizado')
    const nextMatch = matches.find(m => m.status === 'Programado');
    const lastMatch = [...matches].reverse().find(m => m.status === 'Finalizado');

    const totalMatches = matches.length;
    const totalTeams = teams.length;
    const completedMatches = matches.filter(m => m.status === 'Finalizado').length;

    // 1. Inyectar HTML Base
    container.innerHTML = `
        <div class="dashboard-container">
            <div class="dashboard-header">
                <div>
                    <h1>${league.name}</h1>
                    <p class="text-sm text-muted" style="margin: 0.25rem 0 0 0;">Temporada: <strong>${league.season || 'Sin especificar'}</strong></p>
                </div>
                <div class="dashboard-header-info">
                    <span class="dashboard-badge">${sportTerm.icon} ${sportTerm.name}</span>
                    <a href="#leagues" class="btn btn-secondary text-sm">Cambiar Liga</a>
                </div>
            </div>

            <!-- Fila de Métricas Rápidas -->
            <div class="metrics-row">
                <div class="metric-card">
                    <div class="metric-icon"><img src="assets/teams_icon.png" alt="Equipos" class="metric-icon-img"></div>
                    <div>
                        <div class="metric-val">${totalTeams}</div>
                        <div class="metric-label">Equipos Registrados</div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon"><img src="${totalMatchesIcon}" alt="Partidos Totales" class="metric-icon-img"></div>
                    <div>
                        <div class="metric-val">${totalMatches}</div>
                        <div class="metric-label">Partidos Totales</div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon"><img src="${finalizedMatchesIcon}" alt="Partidos Finalizados" class="metric-icon-img metric-icon-img-sm"></div>
                    <div>
                        <div class="metric-val">${completedMatches}</div>
                        <div class="metric-label">Partidos Finalizados</div>
                    </div>
                </div>
            </div>

            <!-- Grid de Contenido -->
            <div class="dashboard-grid">
                <!-- Próximo Partido -->
                <div class="dashboard-card col-span-6">
                    <div class="dashboard-card-title">
                        <span> Próximo Partido</span>
                        <a href="#matches" class="text-sm text-primary" style="font-size: 0.8rem;">Ver todos &rarr;</a>
                    </div>
                    ${renderMatchCard(nextMatch, teams, 'No hay partidos programados')}
                </div>

                <!-- Último Partido -->
                <div class="dashboard-card col-span-6">
                    <div class="dashboard-card-title">
                        <span> Último Partido Finalizado</span>
                        <a href="#matches" class="text-sm text-primary" style="font-size: 0.8rem;">Ver todos &rarr;</a>
                    </div>
                    ${renderMatchCard(lastMatch, teams, 'No se ha jugado ningún partido')}
                </div>

                <!-- Mini Tabla / Resumen Torneo -->
                <div class="dashboard-card col-span-12">
                    <div class="dashboard-card-title">
                        <span>📊 ${isBracketMode ? 'Tabla de Posiciones del Torneo' : 'Resumen del Torneo'} (${modeLabel})</span>
                        ${isBracketMode
                            ? `<a href="#leagues" class="text-sm text-primary">Ver Bracket &rarr;</a>`
                            : `<a href="#stats" class="text-sm text-primary">Tabla Completa &rarr;</a>`}
                    </div>
                    ${isBracketMode ? renderBracketStandings(bracketStandings) : renderMiniStandings(standings, sportTerm)}
                </div>

                <!-- Gráfico 1: Top Anotadores -->
                <div class="dashboard-card col-span-4">
                    <div class="dashboard-card-title">${sportTerm.icon} Top ${sportTerm.rankingTitle}</div>
                    ${topScorers.length === 0
                        ? `<p class="text-muted text-sm" style="padding:1rem 0;">Aún no hay ${(sportTerm.scoreEventPlural || 'anotaciones').toLowerCase()} registrados.</p>`
                        : `<div class="chart-wrapper"><canvas id="chartPF"></canvas></div>`
                    }
                </div>

                <!-- Gráfico 2: Resultados Globales -->
                <div class="dashboard-card col-span-4">
                    <div class="dashboard-card-title">Distribución de Resultados</div>
                    <div class="chart-wrapper">
                        <canvas id="chartResults"></canvas>
                    </div>
                </div>

                <!-- Gráfico 3: Puntos Acumulados -->
                <div class="dashboard-card col-span-4">
                    <div class="dashboard-card-title">Evolución de Puntos</div>
                    <div class="chart-wrapper">
                        <canvas id="chartTimeline"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 2. Inicializar Gráficos con Chart.js
    initCharts(standings, matches, sportTerm, topScorers);
}

function renderEmptyState(container, message) {
    container.innerHTML = `
        <div class="empty-state-card glass-card text-center" style="padding: 3rem 1.5rem; margin-top: 2rem;">
            <h2 class="text-xl font-bold mb-2">¡Bienvenido a LeagueHub!</h2>
            <p class="text-secondary mb-4">${message}</p>
            <a href="#leagues" class="btn btn-primary">Ir a Gestión de Ligas</a>
        </div>
    `;
}

function renderMatchCard(match, teams, emptyText) {
    if (!match) return `<p class="text-muted text-sm" style="margin: 0.5rem 0;">${emptyText}</p>`;

    const home = teams.find(t => t.id === match.homeTeamId) || { name: 'Por definir' };
    const away = teams.find(t => t.id === match.awayTeamId) || { name: 'Por definir' };

    const scoreDisplay = match.status === 'Finalizado' 
        ? `${match.score?.home ?? 0} - ${match.score?.away ?? 0}` 
        : 'VS';

    return `
        <div class="dash-match-box">
            <div>
                <strong style="color: var(--color-text-primary); font-size: 1rem;">${home.name}</strong> 
                <span style="color: #64748b; margin: 0 0.25rem;">vs</span> 
                <strong style="color: var(--color-text-primary); font-size: 1rem;">${away.name}</strong>
                <div style="font-size: 0.78rem; color: var(--color-text-muted); margin-top: 0.35rem;">📅 ${match.date ? new Date(match.date).toLocaleDateString() : 'Fecha no definida'}</div>
            </div>
            <div class="dash-score-badge">
                ${scoreDisplay}
            </div>
        </div>
    `;
}

function renderMiniStandings(standings, sportTerm) {
    if (!standings || standings.length === 0) {
        return `<p class="text-muted text-sm">No hay equipos registrados en esta liga.</p>`;
    }

    const top5 = standings.slice(0, 5);
    return `
        <table class="dashboard-table">
            <thead>
                <tr>
                    <th style="width: 40px;">#</th>
                    <th>Equipo</th>
                    <th>PJ</th>
                    <th>${sportTerm.scoreLabelFor}</th>
                    <th>Pts</th>
                </tr>
            </thead>
            <tbody>
                ${top5.map((team, index) => {
                    const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-default';
                    return `
                        <tr>
                            <td><span class="rank-pill ${rankClass}">${index + 1}</span></td>
                            <td><strong style="color: var(--color-text-primary);">${team.name}</strong></td>
                            <td>${team.stats?.played || 0}</td>
                            <td>${team.stats?.goalsFor || 0}</td>
                            <td><strong style="color: #10b981; font-size: 0.95rem;">${team.stats?.points || 0}</strong></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

const BRACKET_ROUND_DEPTH = {
    'Gran Final': 0,
    'Final': 0,
    'Final Perdedores': 1,
    'Final Ganadores': 1,
    'Semifinal': 1,
    'Semifinal Ganadores': 1,
    'Cuartos de Final': 2,
    'Cuartos Ganadores': 2,
    'Octavos de Final': 3,
    'Octavos Ganadores': 3
};

function bracketRoundDepth(round) {
    if (!round) return 99;
    if (BRACKET_ROUND_DEPTH[round] !== undefined) return BRACKET_ROUND_DEPTH[round];
    const m = String(round).match(/Ronda\s+(\d+)/i);
    if (m) return 2 + Number(m[1]);
    return 4;
}

function computeBracketStandings(teams, matches) {
    const finished = matches.filter(m => m.status === 'Finalizado');
    const nonFinished = matches.filter(m => m.status !== 'Finalizado');
    const statsMap = new Map();

    teams.forEach(t => {
        statsMap.set(Number(t.id), {
            team: t,
            played: 0,
            wins: 0,
            losses: 0,
            elimDepth: null,
            isChampion: false,
            isRunnerUp: false,
            isActive: false
        });
    });

    const finalMatch = finished.find(m => m.round === 'Gran Final' || m.round === 'Final');
    if (finalMatch && finalMatch.winnerId) {
        const champ = statsMap.get(Number(finalMatch.winnerId));
        if (champ) champ.isChampion = true;

        const runnerId = Number(finalMatch.homeTeamId) === Number(finalMatch.winnerId)
            ? finalMatch.awayTeamId
            : finalMatch.homeTeamId;
        const runner = statsMap.get(Number(runnerId));
        if (runner) runner.isRunnerUp = true;
    }

    finished.forEach(m => {
        const homeId = Number(m.homeTeamId);
        const awayId = Number(m.awayTeamId);
        if (!homeId || !awayId) return;

        const home = statsMap.get(homeId);
        const away = statsMap.get(awayId);
        const winnerId = m.winnerId ? Number(m.winnerId) : null;
        const depth = bracketRoundDepth(m.round);

        [home, away].forEach((teamStats, idx) => {
            if (!teamStats) return;
            const teamId = idx === 0 ? homeId : awayId;
            teamStats.played++;
            if (winnerId === teamId) {
                teamStats.wins++;
            } else {
                teamStats.losses++;
                if (teamStats.elimDepth === null || depth < teamStats.elimDepth) {
                    teamStats.elimDepth = depth;
                }
            }
        });
    });

    nonFinished.forEach(m => {
        if (m.homeTeamId && statsMap.get(Number(m.homeTeamId))) statsMap.get(Number(m.homeTeamId)).isActive = true;
        if (m.awayTeamId && statsMap.get(Number(m.awayTeamId))) statsMap.get(Number(m.awayTeamId)).isActive = true;
    });

    const list = Array.from(statsMap.values());
    list.forEach(s => {
        if (s.isChampion) {
            s.elimDepth = null;
            s.isActive = false;
        } else if (s.isRunnerUp) {
            s.elimDepth = 0;
            s.isActive = false;
        } else if (s.isActive) {
            s.elimDepth = null;
        }
    });

    const sortOrder = s => s.isChampion ? 0 : s.isRunnerUp ? 1 : s.isActive ? 2 : 3;
    list.sort((a, b) => {
        const orderDiff = sortOrder(a) - sortOrder(b);
        if (orderDiff !== 0) return orderDiff;
        if (a.isActive && b.isActive) {
            return (b.wins - a.wins) || a.team.name.localeCompare(b.team.name, 'es');
        }
        return (a.elimDepth ?? 99) - (b.elimDepth ?? 99);
    });

    return list;
}

function bracketPositionLabel(s) {
    if (s.isChampion) return '1º';
    if (s.isRunnerUp) return '2º';
    if (s.isActive) return '—';
    const d = s.elimDepth ?? 99;
    if (d === 1) return '3º-4º';
    if (d === 2) return '5º-8º';
    if (d === 3) return '9º-16º';
    return 'Eliminado';
}

function bracketStatusBadge(s) {
    if (s.isChampion) return '<span class="badge-status badge-status-champion">🏆 Campeón</span>';
    if (s.isRunnerUp) return '<span class="badge-status badge-status-runnerup">🥈 Subcampeón</span>';
    if (s.isActive) return '<span class="badge-status badge-status-active">En competencia</span>';
    return '<span class="badge-status badge-status-eliminated">Eliminado</span>';
}

function renderBracketStandings(standings) {
    if (!standings || standings.length === 0) {
        return `<p class="text-muted text-sm">No hay equipos registrados en esta liga.</p>`;
    }

    return `
        <table class="dashboard-table">
            <thead>
                <tr>
                    <th style="width: 70px;">Pos.</th>
                    <th>Equipo</th>
                    <th>PJ</th>
                    <th>G</th>
                    <th>P</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${standings.map(s => {
                    const posColor = s.isChampion ? '#f59e0b' : s.isRunnerUp ? '#94a3b8' : s.isActive ? '#60a5fa' : '#64748b';
                    return `
                        <tr>
                            <td><strong style="color: ${posColor}; font-size: 0.9rem; white-space: nowrap;">${bracketPositionLabel(s)}</strong></td>
                            <td><strong style="color: var(--color-text-primary);">${s.team.name}</strong></td>
                            <td>${s.played}</td>
                            <td>${s.wins}</td>
                            <td>${s.losses}</td>
                            <td>${bracketStatusBadge(s)}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function initCharts(standings, matches, sportTerm, topScorers) {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js no está cargado');
        return;
    }

    const bodyStyles = getComputedStyle(document.body);
    const accentHex = (bodyStyles.getPropertyValue('--color-accent') || '#3b82f6').trim();
    const accentRgb = (bodyStyles.getPropertyValue('--color-accent-rgb') || '59, 130, 246').trim();

    const labels = standings.map(s => s.name);
    const scorePlural = sportTerm.scoreEventPlural || 'Anotaciones';

    // Gráfico 1: Top Anotadores (según deporte y liga activa)
    const ctxPF = document.getElementById('chartPF')?.getContext('2d');
    if (ctxPF) {
        const scorersTop = topScorers.slice(0, 8);
        new Chart(ctxPF, {
            type: 'bar',
            data: {
                labels: scorersTop.map(p => p.name ? `#${p.number} ${p.name}` : 'Jugador'),
                datasets: [{
                    label: scorePlural,
                    data: scorersTop.map(p => p.stats?.goals || 0),
                    backgroundColor: `rgba(${accentRgb}, 0.65)`,
                    borderColor: accentHex,
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });
    }

    // Gráfico 2: Torta de Resultados
    const finishedMatches = matches.filter(m => m.status === 'Finalizado');
    let winsHome = 0, winsAway = 0, draws = 0;
    
    finishedMatches.forEach(m => {
        const homeScore = m.score?.home || 0;
        const awayScore = m.score?.away || 0;
        if (homeScore > awayScore) winsHome++;
        else if (awayScore > homeScore) winsAway++;
        else draws++;
    });

    const ctxResults = document.getElementById('chartResults')?.getContext('2d');
    if (ctxResults) {
        new Chart(ctxResults, {
            type: 'doughnut',
            data: {
                labels: ['Victorias Local', 'Victorias Visitante', 'Empates'],
                datasets: [{
                    data: [winsHome, winsAway, draws],
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    
    const ctxTimeline = document.getElementById('chartTimeline')?.getContext('2d');
    if (ctxTimeline) {
        new Chart(ctxTimeline, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Puntos',
                    data: standings.map(s => s.stats?.points || 0),
                    borderColor: accentHex,
                    backgroundColor: `rgba(${accentRgb}, 0.2)`,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}