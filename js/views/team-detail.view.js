// js/views/team-detail.view.js
import { getTeamById } from '../db/teams.db.js';
import { getPlayersByTeam, createPlayer } from '../db/players.db.js';
import { getAllMatches } from '../db/matches.db.js';
import { getActiveLeague } from '../db/leagues.db.js';
import { SPORTS } from '../sports-terms.js';


export async function renderTeamDetail(container, params) {
    const teamId = Number(params.id);
    container.textContent = '';

    const loading = document.createElement('loading-state');
    loading.setAttribute('message', 'Cargando información del equipo...');
    container.appendChild(loading);

    const team = await getTeamById(teamId);
    if (!team) {
        container.textContent = '';
        const h2 = document.createElement('h2');
        h2.textContent = 'Equipo no encontrado';
        const a = document.createElement('a');
        a.href = '#teams';
        a.className = 'btn btn-primary';
        a.textContent = 'Volver a Equipos';
        container.appendChild(h2);
        container.appendChild(a);
        return;
    }

    const activeLeague = await getActiveLeague();
    const sportConfig = SPORTS[activeLeague?.sport] || SPORTS.futbol;
    
    // Forzamos la carga de jugadores por equipo
    const players = await getPlayersByTeam(teamId);
    const allLeagueMatches = activeLeague ? await getAllMatches(activeLeague.id) : [];

    // Partidos específicos del equipo
    const teamMatches = allLeagueMatches.filter(m => Number(m.homeTeamId) === teamId || Number(m.awayTeamId) === teamId);
    const scheduledMatches = teamMatches.filter(m => m.status === 'scheduled');
    const finishedMatches = teamMatches
        .filter(m => m.status === 'finished' || m.status === 'Finalizado')
        .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    // Cálculo de posición en la tabla de la liga
    let currentRank = '-';
    if (activeLeague) {
        const teamStatsMap = new Map();
        const allTeamsMatches = allLeagueMatches.filter(m => m.status === 'finished' || m.status === 'Finalizado');
        
        allTeamsMatches.forEach(m => {
            const hScore = m.homeScore ?? 0;
            const aScore = m.awayScore ?? 0;
            const homeId = Number(m.homeTeamId);
            const awayId = Number(m.awayTeamId);

            if (!teamStatsMap.has(homeId)) teamStatsMap.set(homeId, { points: 0, diff: 0, goalsFor: 0 });
            if (!teamStatsMap.has(awayId)) teamStatsMap.set(awayId, { points: 0, diff: 0, goalsFor: 0 });

            const hStats = teamStatsMap.get(homeId);
            const aStats = teamStatsMap.get(awayId);

            hStats.goalsFor += hScore;
            hStats.diff += (hScore - aScore);
            aStats.goalsFor += aScore;
            aStats.diff += (aScore - hScore);

            if (hScore > aScore) {
                hStats.points += 3;
            } else if (aScore > hScore) {
                aStats.points += 3;
            } else {
                hStats.points += 1;
                aStats.points += 1;
            }
        });

        const sortedTeams = Array.from(teamStatsMap.entries()).sort((a, b) => {
            if (b[1].points !== a[1].points) return b[1].points - a[1].points;
            if (b[1].diff !== a[1].diff) return b[1].diff - a[1].diff;
            return b[1].goalsFor - a[1].goalsFor;
        });

        // Aseguramos comparación numérica para obtener el puesto
        const rankIndex = sortedTeams.findIndex(([id]) => Number(id) === teamId);
        if (rankIndex !== -1) currentRank = `#${rankIndex + 1}`;
    }

    container.textContent = '';

    // Botón Volver
    const backNav = document.createElement('div');
    backNav.className = 'back-nav';
    const backLink = document.createElement('a');
    backLink.href = '#teams';
    backLink.className = 'btn btn-secondary';
    backLink.textContent = '← Volver a Equipos';
    backNav.appendChild(backLink);
    container.appendChild(backNav);

    // ==========================================
    // CABECERA DEL EQUIPO
    // ==========================================
    const headerPanel = document.createElement('div');
    headerPanel.className = 'team-detail-header glass-panel';
    headerPanel.style.borderLeft = `6px solid ${team.primaryColor || '#3b82f6'}`;

    const mainInfo = document.createElement('div');
    mainInfo.className = 'team-main-info';

    const logoContainer = document.createElement('div');
    logoContainer.className = 'team-logo-container';
    if (team.logo) {
        const img = document.createElement('img');
        img.src = team.logo;
        img.alt = team.name;
        img.className = 'team-logo-lg';
        logoContainer.appendChild(img);
    } else {
        const ph = document.createElement('div');
        ph.className = 'team-logo-placeholder-lg';
        ph.textContent = team.name.substring(0, 2).toUpperCase();
        ph.style.backgroundColor = team.primaryColor || '#3b82f6';
        logoContainer.appendChild(ph);
    }
    mainInfo.appendChild(logoContainer);

    const titleDetails = document.createElement('div');
    titleDetails.className = 'team-title-details';
    const h1 = document.createElement('h1');
    h1.textContent = team.name;
    titleDetails.appendChild(h1);

    const pMeta = document.createElement('p');
    pMeta.className = 'text-muted';
    pMeta.textContent = `Ciudad: ${team.city || 'No especificada'}`;
    titleDetails.appendChild(pMeta);

    const colorsDiv = document.createElement('div');
    colorsDiv.className = 'team-colors-display';
    const c1 = document.createElement('span');
    c1.className = 'color-dot';
    c1.style.backgroundColor = team.primaryColor || '#3b82f6';
    const c2 = document.createElement('span');
    c2.className = 'color-dot';
    c2.style.backgroundColor = team.secondaryColor || '#1e3a8a';
    colorsDiv.appendChild(c1);
    colorsDiv.appendChild(c2);
    titleDetails.appendChild(colorsDiv);

    mainInfo.appendChild(titleDetails);
    headerPanel.appendChild(mainInfo);

    // Estadísticas Resumidas
    const stats = team.stats || {};
    const statsGrid = document.createElement('div');
    statsGrid.className = 'team-stats-summary-grid';

    const createStatItem = (label, val, highlight = false) => {
        const box = document.createElement('div');
        box.className = `stat-box ${highlight ? 'highlight' : ''}`;
        const lbl = document.createElement('span');
        lbl.className = 'stat-box-label';
        lbl.textContent = label;
        const num = document.createElement('span');
        num.className = 'stat-box-value';
        num.textContent = val ?? 0;
        box.appendChild(lbl);
        box.appendChild(num);
        return box;
    };

    statsGrid.appendChild(createStatItem('Posición', currentRank, true));
    statsGrid.appendChild(createStatItem('Puntos', stats.points, true));
    statsGrid.appendChild(createStatItem('PJ', stats.played));
    statsGrid.appendChild(createStatItem('PG', stats.won));
    statsGrid.appendChild(createStatItem('PE', stats.drawn));
    statsGrid.appendChild(createStatItem('PP', stats.lost));
    statsGrid.appendChild(createStatItem('PF', stats.goalsFor));
    statsGrid.appendChild(createStatItem('PC', stats.goalsAgainst));
    statsGrid.appendChild(createStatItem('DIF', (stats.goalsDiff > 0 ? `+${stats.goalsDiff}` : stats.goalsDiff) || 0));

    headerPanel.appendChild(statsGrid);
    container.appendChild(headerPanel);

    // ==========================================
    // MINI GRÁFICO DEL EQUIPO
    // ==========================================
    const graphSection = document.createElement('div');
    graphSection.className = 'glass-panel section-container';
    const h2Graph = document.createElement('h2');
    h2Graph.textContent = 'Evolución de Puntos';
    graphSection.appendChild(h2Graph);

    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'chart-container';
    const canvas = document.createElement('canvas');
    canvas.id = 'points-evolution-chart';
    canvasContainer.appendChild(canvas);
    graphSection.appendChild(canvasContainer);
    container.appendChild(graphSection);

    setTimeout(() => renderPointsChart(canvas, finishedMatches, teamId), 50);

    // ==========================================
    // PLANTILLA DE JUGADORES
    // ==========================================
    const squadSection = document.createElement('div');
    squadSection.className = 'glass-panel section-container';

    const squadHeader = document.createElement('div');
    squadHeader.className = 'section-header-flex';
    const h2Squad = document.createElement('h2');
    h2Squad.textContent = `Plantilla de Jugadores (${players.length})`;
    const btnAddPlayer = document.createElement('button');
    btnAddPlayer.className = 'btn btn-primary';
    btnAddPlayer.textContent = '+ Agregar Jugador';
    squadHeader.appendChild(h2Squad);
    squadHeader.appendChild(btnAddPlayer);
    squadSection.appendChild(squadHeader);

    const playersGrid = document.createElement('div');
    playersGrid.className = 'cards-grid';

    if (players.length === 0) {
        const emptyP = document.createElement('p');
        emptyP.className = 'text-muted';
        emptyP.textContent = 'Aún no hay jugadores registrados en este equipo.';
        playersGrid.appendChild(emptyP);
    } else {
        players.forEach(p => {
            // Intentamos usar custom element y si no, renderizamos tarjeta HTML estándar de respaldo
            if (customElements.get('player-card')) {
                const card = document.createElement('player-card');
                card.setAttribute('player-id', p.id);
                card.setAttribute('name', p.name);
                card.setAttribute('position', p.position);
                card.setAttribute('number', p.number);
                card.setAttribute('team-name', team.name);
                if (p.photo) card.setAttribute('photo', p.photo);
                playersGrid.appendChild(card);
            } else {
                const fallbackCard = document.createElement('div');
                fallbackCard.className = 'glass-panel player-card-fallback';
                fallbackCard.style.cssText = 'padding: 1rem; border-radius: 8px; display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;';
                fallbackCard.innerHTML = `
                    <div style="background: #3b82f6; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                        #${p.number}
                    </div>
                    <div>
                        <strong style="display: block; color: #f8fafc;">${p.name}</strong>
                        <span class="text-muted" style="font-size: 0.85rem;">${p.position || 'Sin posición'}</span>
                    </div>
                `;
                playersGrid.appendChild(fallbackCard);
            }
        });
    }
    squadSection.appendChild(playersGrid);
    container.appendChild(squadSection);

    // ==========================================
    // PRÓXIMOS PARTIDOS
    // ==========================================
    const nextMatchesSection = document.createElement('div');
    nextMatchesSection.className = 'glass-panel section-container';
    const h2Next = document.createElement('h2');
    h2Next.textContent = 'Próximos Partidos';
    nextMatchesSection.appendChild(h2Next);

    if (scheduledMatches.length === 0) {
        const pNoNext = document.createElement('p');
        pNoNext.className = 'text-muted';
        pNoNext.textContent = 'No hay partidos programados actualmente.';
        nextMatchesSection.appendChild(pNoNext);
    } else {
        const listNext = document.createElement('div');
        listNext.className = 'matches-list';
        scheduledMatches.forEach(m => {
            const isHome = Number(m.homeTeamId) === teamId;
            const rivalId = isHome ? m.awayTeamId : m.homeTeamId;
            const matchCard = document.createElement('a');
            matchCard.href = `#match/${m.id}`;
            matchCard.className = 'match-list-item glass-panel';
            matchCard.innerHTML = `
                <div class="match-meta">
                    <span class="match-date">${m.date ? new Date(m.date).toLocaleDateString() : 'Por programar'}</span>
                    <span class="badge status-scheduled">Programado</span>
                </div>
                <div class="match-versus">
                    <span>${isHome ? team.name : 'Rival ID #' + rivalId}</span>
                    <strong class="vs">VS</strong>
                    <span>${!isHome ? team.name : 'Rival ID #' + rivalId}</span>
                </div>
            `;
            listNext.appendChild(matchCard);
        });
        nextMatchesSection.appendChild(listNext);
    }
    container.appendChild(nextMatchesSection);

    // ==========================================
    // PARTIDOS JUGADOS
    // ==========================================
    const playedMatchesSection = document.createElement('div');
    playedMatchesSection.className = 'glass-panel section-container';
    const h2Played = document.createElement('h2');
    h2Played.textContent = 'Historial de Partidos';
    playedMatchesSection.appendChild(h2Played);

    if (finishedMatches.length === 0) {
        const pNoPlayed = document.createElement('p');
        pNoPlayed.className = 'text-muted';
        pNoPlayed.textContent = 'Aún no se han disputado partidos.';
        playedMatchesSection.appendChild(pNoPlayed);
    } else {
        const listPlayed = document.createElement('div');
        listPlayed.className = 'matches-list';

        finishedMatches.forEach(m => {
            const isHome = Number(m.homeTeamId) === teamId;
            const myScore = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
            const rivalScore = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
            const rivalId = isHome ? m.awayTeamId : m.homeTeamId;

            let resultBadge = { text: 'E', class: 'badge-draw' };
            if (myScore > rivalScore) {
                resultBadge = { text: 'V', class: 'badge-win' };
            } else if (myScore < rivalScore) {
                resultBadge = { text: 'D', class: 'badge-loss' };
            }

            const matchCard = document.createElement('a');
            matchCard.href = `#match/${m.id}`;
            matchCard.className = 'match-list-item glass-panel';
            matchCard.innerHTML = `
                <div class="match-meta">
                    <span class="match-date">${m.date ? new Date(m.date).toLocaleDateString() : 'Finalizado'}</span>
                    <span class="badge ${resultBadge.class}">${resultBadge.text}</span>
                </div>
                <div class="match-versus">
                    <span class="${isHome ? 'fw-bold' : ''}">${isHome ? team.name : 'Rival ID #' + rivalId}</span>
                    <span class="match-score-pill">${m.homeScore ?? 0} - ${m.awayScore ?? 0}</span>
                    <span class="${!isHome ? 'fw-bold' : ''}">${!isHome ? team.name : 'Rival ID #' + rivalId}</span>
                </div>
            `;
            listPlayed.appendChild(matchCard);
        });
        playedMatchesSection.appendChild(listPlayed);
    }
    container.appendChild(playedMatchesSection);

    // ==========================================
    // MODAL AGREGAR JUGADOR
    // ==========================================
    const modal = document.createElement('div');
    modal.className = 'modal hidden';
    modal.innerHTML = `
        <div class="modal-content glass-panel">
            <h3>Agregar Jugador a ${team.name}</h3>
            <form id="team-player-form">
                <div class="form-group">
                    <label>Nombre Completo *</label>
                    <input type="text" name="name" required class="form-control" />
                </div>
                <div class="form-group">
                    <label>URL de Foto (Opcional)</label>
                    <input type="url" name="photo" class="form-control" placeholder="https://..." />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Posición *</label>
                        <select name="position" required class="form-control">
                            ${(sportConfig.positions || ['Jugador']).map(p => `<option value="${p}">${p}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Dorsal / Número *</label>
                        <input type="number" name="number" required min="1" max="99" class="form-control" />
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" id="btn-cancel-player" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar Jugador</button>
                </div>
            </form>
        </div>
    `;
    container.appendChild(modal);

    btnAddPlayer.addEventListener('click', () => modal.classList.remove('hidden'));
    modal.querySelector('#btn-cancel-player').addEventListener('click', () => modal.classList.add('hidden'));

    modal.querySelector('#team-player-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const newPlayer = {
            teamId: Number(teamId),
            name: formData.get('name'),
            photo: formData.get('photo'),
            position: formData.get('position'),
            number: Number(formData.get('number'))
        };

        try {
            await createPlayer(newPlayer);
            modal.classList.add('hidden');
            
            // Re-renderizamos la vista en lugar de reload completo para mayor rapidez
            renderTeamDetail(container, params);
        } catch (err) {
            alert(err.message || 'Error al registrar jugador');
        }
    });
}

function renderPointsChart(canvas, finishedMatches, teamId) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth || 600;
    const height = canvas.height = 200;

    const chronologicalMatches = [...finishedMatches].reverse();
    
    let currentPoints = 0;
    const dataPoints = [0];

    chronologicalMatches.forEach(m => {
        const isHome = Number(m.homeTeamId) === teamId;
        const myScore = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
        const rivalScore = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);

        if (myScore > rivalScore) currentPoints += 3;
        else if (myScore === rivalScore) currentPoints += 1;
        
        dataPoints.push(currentPoints);
    });

    if (dataPoints.length <= 1) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sin datos suficientes para graficar la evolución.', width / 2, height / 2);
        return;
    }

    const padding = 30;
    const maxVal = Math.max(...dataPoints, 5);
    const stepX = (width - padding * 2) / (dataPoints.length - 1);

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();

    dataPoints.forEach((pts, i) => {
        const x = padding + i * stepX;
        const y = (height - padding) - (pts / maxVal) * (height - padding * 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    dataPoints.forEach((pts, i) => {
        const x = padding + i * stepX;
        const y = (height - padding) - (pts / maxVal) * (height - padding * 2);

        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${pts}p`, x, y - 10);
    });
}