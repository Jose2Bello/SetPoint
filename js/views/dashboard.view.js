import { storage } from '../utils/storage.js';
import { leaguesDb } from '../db/leagues.db.js';
import { matchesDb } from '../db/matches.db.js';
import { teamsDb } from '../db/teams.db.js';
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
    const matches = await matchesDb.getByLeague(league.id);
    const teams = await teamsDb.getByLeague(league.id);

    // Obtener tabla calculada con tu servicio
    const standings = standingsService.getStandings(teams);
    
    // Próximo y último partido según 'status' ('Programado' / 'Finalizado')
    const nextMatch = matches.find(m => m.status === 'Programado');
    const lastMatch = [...matches].reverse().find(m => m.status === 'Finalizado');

    // 1. Inyectar HTML Base
    container.innerHTML = `
        <div class="dashboard-header">
            <div>
                <h1 class="text-2xl font-bold">${league.name}</h1>
                <p class="text-sm text-muted">Temporada: ${league.season || 'Sin especificar'}</p>
            </div>
            <div class="dashboard-header-info">
                <span class="dashboard-badge">${sportTerm.icon} ${sportTerm.name}</span>
                <a href="#leagues" class="btn btn-secondary text-sm">Cambiar Liga</a>
            </div>
        </div>

        <div class="dashboard-grid">
            <!-- Próximo Partido -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">Próximo Partido</div>
                ${renderMatchCard(nextMatch, teams, 'No hay partidos programados')}
            </div>

            <!-- Último Partido -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">Último Partido Finalizado</div>
                ${renderMatchCard(lastMatch, teams, 'No se ha jugado ningún partido')}
            </div>

            <!-- Mini Tabla / Resumen Torneo -->
            <div class="dashboard-card" style="grid-column: span 1 / -1;">
                <div class="dashboard-card-title">
                    <span>Resumen del Torneo (${league.mode === 'eliminacion' ? 'Eliminación Directa' : 'Liga'})</span>
                    <a href="#stats" class="text-sm text-primary">Ver completo &rarr;</a>
                </div>
                ${renderMiniStandings(standings, sportTerm)}
            </div>

            <!-- Gráfico 1: Puntos a Favor -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">Anotaciones A Favor (${sportTerm.scoreLabelFor})</div>
                <div class="chart-wrapper">
                    <canvas id="chartPF"></canvas>
                </div>
            </div>

            <!-- Gráfico 2: Resultados Globales -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">Distribución de Resultados</div>
                <div class="chart-wrapper">
                    <canvas id="chartResults"></canvas>
                </div>
            </div>

            <!-- Gráfico 3: Puntos Acumulados -->
            <div class="dashboard-card">
                <div class="dashboard-card-title">Evolución de Puntos</div>
                <div class="chart-wrapper">
                    <canvas id="chartTimeline"></canvas>
                </div>
            </div>
        </div>
    `;

    // 2. Inicializar Gráficos con Chart.js
    initCharts(standings, matches);
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
    if (!match) return `<p class="text-muted text-sm">${emptyText}</p>`;

    const home = teams.find(t => t.id === match.homeTeamId) || { name: 'Por definir' };
    const away = teams.find(t => t.id === match.awayTeamId) || { name: 'Por definir' };

    const scoreDisplay = match.status === 'Finalizado' 
        ? `${match.score?.home ?? 0} - ${match.score?.away ?? 0}` 
        : 'VS';

    return `
        <div class="flex-between align-center">
            <div>
                <strong>${home.name}</strong> vs <strong>${away.name}</strong>
                <div class="text-xs text-muted">${match.date ? new Date(match.date).toLocaleDateString() : 'Fecha no definida'}</div>
            </div>
            <div class="font-bold text-lg">
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
        <table class="table-compact" style="width: 100%;">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Equipo</th>
                    <th>PJ</th>
                    <th>${sportTerm.scoreLabelFor}</th>
                    <th>Pts</th>
                </tr>
            </thead>
            <tbody>
                ${top5.map((team, index) => `
                    <tr>
                        <td><strong>${index + 1}</strong></td>
                        <td>${team.name}</td>
                        <td>${team.stats?.played || 0}</td>
                        <td>${team.stats?.goalsFor || 0}</td>
                        <td><strong>${team.stats?.points || 0}</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function initCharts(standings, matches) {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js no está cargado');
        return;
    }

    const labels = standings.map(s => s.name);

    // Gráfico 1: Barras PF (Anotaciones a favor)
    const ctxPF = document.getElementById('chartPF')?.getContext('2d');
    if (ctxPF) {
        new Chart(ctxPF, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Anotaciones',
                    data: standings.map(s => s.stats?.goalsFor || 0),
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
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

    // Gráfico 3: Líneas (Puntos Acumulados)
    const ctxTimeline = document.getElementById('chartTimeline')?.getContext('2d');
    if (ctxTimeline) {
        new Chart(ctxTimeline, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Puntos',
                    data: standings.map(s => s.stats?.points || 0),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}