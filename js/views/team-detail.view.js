// js/views/team-detail.view.js
import { getTeamById, updateTeam, getTeamsByLeague } from '../db/teams.db.js';
import { getPlayersByTeam, updatePlayer } from '../db/players.db.js';
import { getAllMatches } from '../db/matches.db.js';
import { getActiveLeague } from '../db/leagues.db.js';
import { toast } from '../components/toast.js';
import { confirmAction } from '../components/confirm-dialog.js';
import { getSportConfig } from '../sports-terms.js';
import { openPlayerModal } from './players.view.js';
import {
    normalizeSport,
    getFieldImage,
    getDefaultFormationKey,
    getFormationPositions,
    getPositionLayoutSlot,
    FORMATIONS,
    SPORT_STARTERS_LIMIT
} from '../utils/tactical.js';

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
    
    // Forzamos la carga de jugadores por equipo
    const players = await getPlayersByTeam(teamId);
    const allLeagueMatches = activeLeague ? await getAllMatches(activeLeague.id) : [];
    const sportKey = normalizeSport(activeLeague?.sport);
    const sportConfig = getSportConfig(sportKey);
    const teams = activeLeague ? await getTeamsByLeague(activeLeague.id) : [];
    const teamMap = new Map(teams.map(t => [Number(t.id), t]));

    // Partidos específicos del equipo
    const teamMatches = allLeagueMatches.filter(m => Number(m.homeTeamId) === teamId || Number(m.awayTeamId) === teamId);
    const scheduledMatches = teamMatches.filter(m => m.status === 'scheduled' || m.status === 'Programado' || m.status === 'En Juego');
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

    const scoreWord = sportKey === 'futbol' ? 'Goles' : 'Puntos';
    statsGrid.appendChild(createStatItem('Posición', currentRank, true));
    statsGrid.appendChild(createStatItem('Puntos', stats.points, true));
    statsGrid.appendChild(createStatItem('Partidos Jugados', stats.played));
    statsGrid.appendChild(createStatItem('Partidos Ganados', stats.won));
    statsGrid.appendChild(createStatItem('Partidos Empatados', stats.drawn));
    statsGrid.appendChild(createStatItem('Partidos Perdidos', stats.lost));
    statsGrid.appendChild(createStatItem(`${scoreWord} a Favor`, stats.goalsFor));
    statsGrid.appendChild(createStatItem(`${scoreWord} en Contra`, stats.goalsAgainst));
    statsGrid.appendChild(createStatItem('Diferencia', (stats.goalsDiff > 0 ? `+${stats.goalsDiff}` : stats.goalsDiff) || 0));

    headerPanel.appendChild(statsGrid);
    container.appendChild(headerPanel);

    // Cuerpo de la vista: secciones con separación consistente
    const body = document.createElement('div');
    body.className = 'team-detail-body';
    container.appendChild(body);

    // ==========================================
    // PIZARRA TÁCTICA Y ALINEACIÓN (CUALQUIER DISCIPLINA)
    // ==========================================
    const tacticalSection = document.createElement('div');
    tacticalSection.className = 'glass-panel section-container tactical-section';
    body.appendChild(tacticalSection);

    renderTacticalBoard(tacticalSection, team, players, activeLeague);

    // ==========================================
    // PRÓXIMOS PARTIDOS (bajo la cancha)
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
            const rivalName = teamMap.get(Number(rivalId))?.name || 'Rival ID #' + rivalId;
            const matchCard = document.createElement('a');
            matchCard.href = `#match/${m.id}`;
            matchCard.className = 'match-list-item glass-panel';
            matchCard.innerHTML = `
                <div class="match-meta">
                    <span class="match-date">${m.date ? new Date(m.date).toLocaleDateString() : 'Por programar'}</span>
                    <span class="badge status-scheduled">Programado</span>
                </div>
                <div class="match-versus">
                    <span>${isHome ? team.name : rivalName}</span>
                    <strong class="vs">VS</strong>
                    <span>${!isHome ? team.name : rivalName}</span>
                </div>
            `;
            listNext.appendChild(matchCard);
        });
        nextMatchesSection.appendChild(listNext);
    }
    body.appendChild(nextMatchesSection);

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
    body.appendChild(graphSection);

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
    squadHeader.appendChild(h2Squad);

    const btnNewPlayer = document.createElement('button');
    btnNewPlayer.className = 'btn btn-primary';
    btnNewPlayer.textContent = '+ Nuevo Jugador';
    btnNewPlayer.addEventListener('click', () => {
        openPlayerModal(teams, activeLeague.id, sportConfig, {
            teamId: team.id,
            onSuccess: () => renderTeamDetail(container, params)
        });
    });
    squadHeader.appendChild(btnNewPlayer);
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
                fallbackCard.style.cssText = 'padding: 1rem; border-radius: 8px; display: flex; align-items: center; gap: 1rem;';
                fallbackCard.innerHTML = `
                    ${p.photo
                        ? `<img src="${p.photo}" onerror="this.style.display='none'" alt="${p.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #3b82f6; flex-shrink: 0;" />`
                        : `<div style="background: #3b82f6; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">#${p.number}</div>`
                    }
                    <div>
                        <strong style="display: block; color: var(--color-text-primary);">#${p.number} ${p.name}</strong>
                        <span class="text-muted" style="font-size: 0.85rem;">${p.position || 'Sin posición'}</span>
                    </div>
                `;
                playersGrid.appendChild(fallbackCard);
            }
        });
    }
    squadSection.appendChild(playersGrid);
    body.appendChild(squadSection);

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

            const rivalName = teamMap.get(Number(rivalId))?.name || 'Rival ID #' + rivalId;
            const matchCard = document.createElement('a');
            matchCard.href = `#match/${m.id}`;
            matchCard.className = 'match-list-item glass-panel';
            matchCard.innerHTML = `
                <div class="match-meta">
                    <span class="match-date">${m.date ? new Date(m.date).toLocaleDateString() : 'Finalizado'}</span>
                    <span class="badge ${resultBadge.class}">${resultBadge.text}</span>
                </div>
                <div class="match-versus">
                    <span class="${isHome ? 'fw-bold' : ''}">${isHome ? team.name : rivalName}</span>
                    <span class="match-score-pill">${m.homeScore ?? 0} - ${m.awayScore ?? 0}</span>
                    <span class="${!isHome ? 'fw-bold' : ''}">${!isHome ? team.name : rivalName}</span>
                </div>
            `;
            listPlayed.appendChild(matchCard);
        });
        playedMatchesSection.appendChild(listPlayed);
    }
    body.appendChild(playedMatchesSection);
}

/**
 * Renderiza la Pizarra Táctica interactiva con terreno de juego e imagen según la disciplina.
 */
function renderTacticalBoard(container, team, rawPlayers, activeLeague) {
    container.innerHTML = '';

    const rawSport = team.sport || team.discipline || activeLeague?.sport || activeLeague?.discipline || 'futbol';
    const sportKey = normalizeSport(rawSport);
    const bgImage = getFieldImage(sportKey);
    const maxStarters = SPORT_STARTERS_LIMIT[sportKey] || 11;
    const availableFormations = FORMATIONS[sportKey] || FORMATIONS.futbol;

    let currentFormationKey = team.formation && availableFormations[team.formation]
        ? team.formation
        : getDefaultFormationKey(sportKey);

    const hasAnyStarterSet = rawPlayers.some(p => p.isStarter !== undefined && p.isStarter !== null);

    // Clonación mutable de los datos locales de jugadores
    let localPlayers = rawPlayers.map((p, index) => {
        const isStarter = hasAnyStarterSet ? Boolean(p.isStarter) : (index < maxStarters);
        const savedX = p.pitchX !== undefined && p.pitchX !== null ? Number(p.pitchX) : null;
        const savedY = p.pitchY !== undefined && p.pitchY !== null ? Number(p.pitchY) : null;
        // Migración: coordenadas de fútbol guardadas en formato vertical -> horizontal
        let pitchX = savedX;
        let pitchY = savedY;
        if (sportKey === 'futbol' && savedX !== null && savedY !== null && !p.pitchLandscape) {
            pitchX = Math.round((100 - savedY) * 10) / 10;
            pitchY = Math.round(savedX * 10) / 10;
        }
        return {
            ...p,
            isStarter,
            pitchX,
            pitchY,
            pitchPosition: p.pitchPosition || p.position || ''
        };
    });

    // Asegura que los titulares tengan coordenadas según su etiqueta de posición
    applyPositionLayout(localPlayers, sportKey, currentFormationKey, false);

    const sportIcons = { futbol: '⚽ Fútbol', basquet: '🏀 Básquetbol', voleibol: '🏐 Vóleibol' };

    // ==========================================
    // BARRA DE CONTROLES SUPERIOR
    // ==========================================
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'tactical-controls';

    const leftControls = document.createElement('div');
    leftControls.className = 'tactical-controls-group';

    const sportBadge = document.createElement('span');
    sportBadge.className = 'tactical-sport-badge';
    sportBadge.textContent = sportIcons[sportKey] || '🏆 Deporte';
    leftControls.appendChild(sportBadge);

    const formSelectLabel = document.createElement('label');
    formSelectLabel.style.fontSize = '0.85rem';
    formSelectLabel.style.color = 'var(--color-text-muted)';
    formSelectLabel.textContent = 'Formación:';
    leftControls.appendChild(formSelectLabel);

    const selectFormation = document.createElement('select');
    selectFormation.className = 'tactical-formation-select';
    Object.keys(availableFormations).forEach(fKey => {
        const opt = document.createElement('option');
        opt.value = fKey;
        opt.textContent = fKey;
        if (fKey === currentFormationKey) opt.selected = true;
        selectFormation.appendChild(opt);
    });
    leftControls.appendChild(selectFormation);
    controlsDiv.appendChild(leftControls);

    const rightControls = document.createElement('div');
    rightControls.className = 'tactical-controls-group';

    const reorderBtn = document.createElement('button');
    reorderBtn.className = 'btn btn-secondary text-sm';
    reorderBtn.innerHTML = '🔀 Ordenar por Posición';
    reorderBtn.title = 'Acomoda a los titulares en el campo según su etiqueta (Portero, Defensa, Delantero, etc.)';
    reorderBtn.addEventListener('click', () => {
        applyPositionLayout(localPlayers, sportKey, currentFormationKey, true);
        updateDisplay();
        toast.info('Jugadores ordenados según su posición.');
    });
    rightControls.appendChild(reorderBtn);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary text-sm';
    saveBtn.innerHTML = '💾 Guardar Alineación';
    rightControls.appendChild(saveBtn);
    controlsDiv.appendChild(rightControls);

    container.appendChild(controlsDiv);

    // ==========================================
    // CAMPO / TERRENO DE JUEGO
    // ==========================================
    const pitchBoard = document.createElement('div');
    pitchBoard.className = `tactical-pitch-board tactical-pitch-${sportKey}`;
    pitchBoard.style.backgroundImage = `url("${bgImage}")`;

    const pitchOverlay = document.createElement('div');
    pitchOverlay.className = 'tactical-pitch-overlay';
    pitchBoard.appendChild(pitchOverlay);

    const hintBadge = document.createElement('div');
    hintBadge.className = 'tactical-pitch-hint';
    hintBadge.innerHTML = '<span>💡</span> <span>Arrastra a los titulares para moverlos en el campo o haz clic para opciones</span>';
    pitchBoard.appendChild(hintBadge);

    container.appendChild(pitchBoard);

    // ==========================================
    // PANEL DE SUPLENTES
    // ==========================================
    const benchPanel = document.createElement('div');
    benchPanel.className = 'tactical-bench-panel';
    container.appendChild(benchPanel);

    // Redibujar Fichas en el Terreno y Suplentes
    function updateDisplay() {
        // Limpiar tokens anteriores en el pitch
        const existingTokens = pitchBoard.querySelectorAll('.pitch-player-token');
        existingTokens.forEach(t => t.remove());

        const starters = localPlayers.filter(p => p.isStarter);
        const substitutes = localPlayers.filter(p => !p.isStarter);

        // 1. Renderizar Titulares sobre la Cancha
        starters.forEach(player => {
            const token = document.createElement('div');
            token.className = 'pitch-player-token';
            token.style.left = `${player.pitchX ?? 50}%`;
            token.style.top = `${player.pitchY ?? 50}%`;
            token.style.setProperty('--team-primary-color', team.primaryColor || '#3b82f6');
            token.dataset.playerId = player.id;

            const badge = document.createElement('div');
            badge.className = 'pitch-token-badge';
            if (player.photo) {
                const img = document.createElement('img');
                img.src = player.photo;
                img.alt = player.name;
                badge.appendChild(img);
            } else {
                const num = document.createElement('span');
                num.className = 'pitch-token-number';
                num.textContent = `#${player.number ?? '0'}`;
                badge.appendChild(num);
            }
            token.appendChild(badge);

            const posTag = document.createElement('span');
            posTag.className = 'pitch-token-pos-tag';
            posTag.textContent = player.pitchPosition || 'TIT';
            token.appendChild(posTag);

            const nameTag = document.createElement('span');
            nameTag.className = 'pitch-token-name';
            nameTag.textContent = player.name.split(' ')[0] || player.name;
            token.appendChild(nameTag);

            pitchBoard.appendChild(token);

            // Sistema de Arrastre (Drag and Drop con PointerEvents)
            let isDragging = false;
            let startX = 0, startY = 0;
            let initialX = player.pitchX ?? 50;
            let initialY = player.pitchY ?? 50;
            let hasMoved = false;

            const onPointerDown = (e) => {
                isDragging = true;
                hasMoved = false;
                startX = e.clientX;
                startY = e.clientY;
                initialX = player.pitchX ?? 50;
                initialY = player.pitchY ?? 50;
                token.classList.add('is-dragging');
                token.setPointerCapture(e.pointerId);
            };

            const onPointerMove = (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
                    hasMoved = true;
                }

                const rect = pitchBoard.getBoundingClientRect();
                let newX = ((e.clientX - rect.left) / rect.width) * 100;
                let newY = ((e.clientY - rect.top) / rect.height) * 100;

                // Limitar coordenadas al rango 5% - 95%
                newX = Math.max(5, Math.min(95, newX));
                newY = Math.max(5, Math.min(95, newY));

                token.style.left = `${newX}%`;
                token.style.top = `${newY}%`;

                player.pitchX = Math.round(newX * 10) / 10;
                player.pitchY = Math.round(newY * 10) / 10;
            };

            const onPointerUp = (e) => {
                if (!isDragging) return;
                isDragging = false;
                token.classList.remove('is-dragging');
                try {
                    token.releasePointerCapture(e.pointerId);
                } catch (_) {}

                if (!hasMoved) {
                    // Clic rápido -> Abrir Popover de Acciones del Jugador
                    openPlayerPopover(e, player);
                }
            };

            token.addEventListener('pointerdown', onPointerDown);
            token.addEventListener('pointermove', onPointerMove);
            token.addEventListener('pointerup', onPointerUp);
            token.addEventListener('pointercancel', onPointerUp);
        });

        // 2. Renderizar Panel de Suplentes (Banca)
        benchPanel.innerHTML = `
            <div class="tactical-bench-header">
                <div class="tactical-bench-title">
                    <span> Suplentes / Banca (${substitutes.length})</span>
                </div>
                <span class="text-xs text-muted">Titulares en campo: ${starters.length} / ${maxStarters}</span>
            </div>
        `;

        const benchGrid = document.createElement('div');
        benchGrid.className = 'bench-players-grid';

        if (substitutes.length === 0) {
            const pEmpty = document.createElement('p');
            pEmpty.className = 'text-muted text-xs';
            pEmpty.textContent = 'No hay jugadores suplentes en la banca.';
            benchGrid.appendChild(pEmpty);
        } else {
            substitutes.forEach(sub => {
                const card = document.createElement('div');
                card.className = 'bench-player-card';

                const info = document.createElement('div');
                info.className = 'bench-player-info';

                const num = document.createElement('div');
                num.className = 'bench-player-num';
                num.textContent = `#${sub.number ?? '0'}`;
                info.appendChild(num);

                const details = document.createElement('div');
                details.className = 'bench-player-details';

                const name = document.createElement('span');
                name.className = 'bench-player-name';
                name.textContent = sub.name;
                details.appendChild(name);

                const pos = document.createElement('span');
                pos.className = 'bench-player-pos';
                pos.textContent = sub.position || 'Sin posición';
                details.appendChild(pos);

                info.appendChild(details);
                card.appendChild(info);

                const actionBtn = document.createElement('button');
                actionBtn.className = 'btn btn-secondary btn-bench-action';
                actionBtn.innerHTML = '⬆️ + Titular';
                actionBtn.onclick = () => promoteToStarter(sub);
                card.appendChild(actionBtn);

                benchGrid.appendChild(card);
            });
        }
        benchPanel.appendChild(benchGrid);
    }

    // ==========================================
    // CAMBIO DE FORMACIÓN
    // ==========================================
    selectFormation.addEventListener('change', (e) => {
        currentFormationKey = e.target.value;
        applyPositionLayout(localPlayers, sportKey, currentFormationKey, true);
        updateDisplay();
        toast.info(`Formación cambiada a ${currentFormationKey}`);
    });

    // ==========================================
    // PROMOVER A TITULAR
    // ==========================================
    function promoteToStarter(player) {
        const starters = localPlayers.filter(p => p.isStarter);
        if (starters.length >= maxStarters) {
            toast.error(`La disciplina ${sportIcons[sportKey]} permite un máximo de ${maxStarters} titulares.`);
            return;
        }
        player.isStarter = true;
        applyPositionLayout(localPlayers, sportKey, currentFormationKey, false);
        updateDisplay();
        toast.success(`${player.name} ahora es Titular.`);
    }

    // ==========================================
    // POPOVER DE ACCIONES PARA TITULARES
    // ==========================================
    function openPlayerPopover(event, player) {
        // Remover popover previo si existe
        const oldPopover = document.querySelector('.tactical-popover');
        if (oldPopover) oldPopover.remove();

        const popover = document.createElement('div');
        popover.className = 'tactical-popover';

        // Posicionar el popover
        popover.style.left = `${Math.min(window.innerWidth - 200, Math.max(10, event.clientX - 90))}px`;
        popover.style.top = `${Math.min(window.innerHeight - 150, event.clientY + 15)}px`;

        const title = document.createElement('strong');
        title.style.fontSize = '0.85rem';
        title.style.color = 'var(--color-text-primary)';
        title.textContent = `${player.name} (#${player.number})`;
        popover.appendChild(title);

        // Opción: Mover a Suplentes
        const benchBtn = document.createElement('button');
        benchBtn.className = 'btn btn-secondary text-xs';
        benchBtn.style.textAlign = 'left';
        benchBtn.innerHTML = 'Mover a Suplentes';
        benchBtn.onclick = () => {
            player.isStarter = false;
            popover.remove();
            updateDisplay();
            toast.info(`${player.name} movido a Suplentes.`);
        };
        popover.appendChild(benchBtn);

        // Opción: Cambiar Etiqueta de Posición
        const editPosBtn = document.createElement('button');
        editPosBtn.className = 'btn btn-secondary text-xs';
        editPosBtn.style.textAlign = 'left';
        editPosBtn.innerHTML = 'Cambiar Posición (Etiqueta)';
        editPosBtn.onclick = async () => {
            popover.remove();
            const sportConfig = getSportConfig(sportKey);
            const candidates = [...(sportConfig.defaultPositions || [])];
            const result = await confirmAction(
                'Cambiar Posición (Etiqueta)',
                `Selecciona la nueva posición táctica para ${player.name}:`,
                {
                    confirmText: 'Aplicar',
                    choices: candidates.map(p => ({ value: p, label: p }))
                }
            );
            if (result && result.confirmed && result.value) {
                const abbr = (sportConfig.positionAbbreviations && sportConfig.positionAbbreviations[result.value]) || result.value;
                player.pitchPosition = String(abbr).trim().toUpperCase() || 'TIT';
                updateDisplay();
            }
        };
        popover.appendChild(editPosBtn);

        // Opción: Ver detalle del jugador (cierra el popover al navegar)
        const detailLink = document.createElement('a');
        detailLink.className = 'btn btn-secondary text-xs';
        detailLink.style.textAlign = 'left';
        detailLink.href = `#player/${player.id}`;
        detailLink.textContent = 'Ver Ficha de Jugador';
        detailLink.addEventListener('click', () => {
            popover.remove();
            document.removeEventListener('pointerdown', closeHandler);
        });
        popover.appendChild(detailLink);

        document.body.appendChild(popover);

        const closeHandler = (e) => {
            if (!popover.contains(e.target)) {
                popover.remove();
                document.removeEventListener('pointerdown', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('pointerdown', closeHandler), 10);
    }

    // ==========================================
    // GUARDAR EN BASE DE DATOS INDEXEDDB
    // ==========================================
    saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Guardando...';

        try {
            // 1. Actualizar formación del equipo
            await updateTeam(team.id, {
                ...team,
                formation: currentFormationKey
            });

            // 2. Actualizar cada jugador
            await Promise.all(localPlayers.map(p => {
                return updatePlayer(p.id, {
                    isStarter: p.isStarter,
                    pitchX: p.pitchX,
                    pitchY: p.pitchY,
                    pitchPosition: p.pitchPosition,
                    pitchLandscape: true
                });
            }));

            toast.success('¡Alineación y formación guardadas con éxito!');
        } catch (err) {
            console.error('Error guardando alineación:', err);
            toast.error('Ocurrió un error al guardar la alineación.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '💾 Guardar Alineación';
        }
    });

    // Inicializar visualización de la alineación
    updateDisplay();
}

/**
 * Ajusta las posiciones en el terreno según la formación seleccionada,
 * asignando a cada titular el casillero que coincide con la posición
 * registrada al crear el jugador (Portero -> casillero del portero,
 * Delantero -> casillero de ataque, etc.). Los jugadores sin posición
 * conocida ocupan los casilleros libres restantes de la alineación.
 */
function applyPositionLayout(playersList, sportKey, formationKey, forceResetAll = false) {
    const formationSlots = getFormationPositions(sportKey, formationKey);
    const starters = playersList.filter(p => p.isStarter);

    const toPlace = starters.filter(p => forceResetAll || p.pitchX === null || p.pitchY === null);
    if (toPlace.length === 0) return;

    const classifySlot = (slot) =>
        (getPositionLayoutSlot(sportKey, slot.title) || getPositionLayoutSlot(sportKey, slot.pos))?.area || null;

    const classifyPlayer = (p) => {
        const label = (p.position || '').trim() || (p.pitchPosition || '').trim() || '';
        return getPositionLayoutSlot(sportKey, label)?.area || null;
    };

    // Casilleros de la formación con su banda y estado de uso
    const slotPool = formationSlots.map(slot => ({ ...slot, band: classifySlot(slot), used: false }));
    const slotsByBand = new Map();
    slotPool.forEach(slot => {
        if (!slot.band) return;
        if (!slotsByBand.has(slot.band)) slotsByBand.set(slot.band, []);
        slotsByBand.get(slot.band).push(slot);
    });

    // Jugadores por banda usando la posición con la que fueron creados
    const playersByBand = new Map();
    const leftovers = [];
    toPlace.forEach(p => {
        const band = classifyPlayer(p);
        if (band) {
            if (!playersByBand.has(band)) playersByBand.set(band, []);
            playersByBand.get(band).push(p);
        } else {
            leftovers.push(p);
        }
    });

    // 1) Asignar cada jugador al casillero de su banda (en orden)
    playersByBand.forEach((players, band) => {
        const slots = slotsByBand.get(band) || [];
        players.forEach((p, i) => {
            const slot = slots[i];
            if (slot) {
                slot.used = true;
                p.pitchX = slot.x;
                p.pitchY = slot.y;
                p.pitchPosition = slot.pos;
            } else {
                leftovers.push(p);
            }
        });
    });

    // 2) Excedentes y jugadores sin posición → casilleros libres restantes
    const unusedSlots = slotPool.filter(s => !s.used);
    leftovers.forEach((p, i) => {
        const slot = unusedSlots[i];
        if (slot) {
            slot.used = true;
            p.pitchX = slot.x;
            p.pitchY = slot.y;
            p.pitchPosition = slot.pos;
        } else {
            p.pitchX = 50;
            p.pitchY = 50;
            p.pitchPosition = 'TIT';
        }
    });
}

function renderPointsChart(canvas, finishedMatches, teamId) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth || 600;
    const height = canvas.height = 200;

    const bodyStyles = getComputedStyle(document.body);
    const accentColor = (bodyStyles.getPropertyValue('--color-accent') || '#3b82f6').trim();
    const textPrimary = (bodyStyles.getPropertyValue('--color-text-primary') || '#f8fafc').trim();
    const textMuted = (bodyStyles.getPropertyValue('--color-text-muted') || '#94a3b8').trim();
    const borderStrong = (bodyStyles.getPropertyValue('--color-border-strong') || '#334155').trim();

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
        ctx.fillStyle = textMuted;
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sin datos suficientes para graficar la evolución.', width / 2, height / 2);
        return;
    }

    const padding = 30;
    const maxVal = Math.max(...dataPoints, 5);
    const stepX = (width - padding * 2) / (dataPoints.length - 1);

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = borderStrong;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    ctx.strokeStyle = accentColor;
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

        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = textPrimary;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${pts}p`, x, y - 10);
    });
}