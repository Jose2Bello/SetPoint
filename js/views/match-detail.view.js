import { getMatchById } from '../db/matches.db.js';
import { getTeamById } from '../db/teams.db.js';
import { getPlayersByTeam } from '../db/players.db.js';
import { getEventsByMatch, createMatchEvent, deleteMatchEvent } from '../db/events.db.js';
import { getActiveLeague } from '../db/leagues.db.js';
import { finalizeMatch, undoMatch } from '../db/transactions.js';
import { SPORTS } from '../sports-terms.js';
import { toast } from '../components/toast.js';
import { confirmAction } from '../components/confirm-dialog.js';

export async function renderMatchDetail(container, params) {
    const matchId = Number(params.id);
    container.textContent = '';
    const loading = document.createElement('loading-state');
    loading.setAttribute('message', 'Cargando detalles del partido...');
    container.appendChild(loading);

    const match = await getMatchById(matchId);
    if (!match) {
        container.textContent = '';
        const h2 = document.createElement('h2');
        h2.textContent = 'Partido no encontrado';
        const a = document.createElement('a');
        a.href = '#matches';
        a.className = 'btn';
        a.textContent = 'Volver';
        container.appendChild(h2);
        container.appendChild(a);
        return;
    }

    const activeLeague = await getActiveLeague();
    const sportConfig = SPORTS[activeLeague?.sport] || SPORTS.futbol;
    const homeTeam = match.homeTeamId ? await getTeamById(match.homeTeamId) : null;
    const awayTeam = match.awayTeamId ? await getTeamById(match.awayTeamId) : null;
    const homePlayers = match.homeTeamId ? await getPlayersByTeam(match.homeTeamId) : [];
    const awayPlayers = match.awayTeamId ? await getPlayersByTeam(match.awayTeamId) : [];
    const events = await getEventsByMatch(matchId);

    const isFinished = match.status === 'finished' || match.status === 'Finalizado';
    const homeScore = match.homeScore ?? match.score?.home ?? 0;
    const awayScore = match.awayScore ?? match.score?.away ?? 0;

    container.textContent = '';

    // Navegación
    const backNav = document.createElement('div');
    backNav.className = 'back-nav';
    const backLink = document.createElement('a');
    backLink.href = '#matches';
    backLink.className = 'btn btn-secondary';
    backLink.textContent = '← Volver al Calendario';
    backNav.appendChild(backLink);
    container.appendChild(backNav);

    // Cabecera del partido
    const header = document.createElement('div');
    header.className = 'match-detail-header glass-panel';

    const teamsRow = document.createElement('div');
    teamsRow.className = 'match-teams-display';

    const homeDiv = document.createElement('div');
    homeDiv.className = 'team-box';
    const hName = document.createElement('h2');
    hName.textContent = homeTeam ? homeTeam.name : 'Por definir';
    homeDiv.appendChild(hName);

    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score-box';

    // Helper to check if event type is an infraction
    const isInfraction = (type) => {
        if (!type) return false;
        const lower = String(type).toLowerCase();
        return lower.includes('tarjeta') || lower.includes('falta') || lower.includes('amarilla') || lower.includes('roja') || lower.includes('técnica') || lower.includes('expulsi');
    };

    // Calculate current live score from registered non-infraction events
    const liveHomeScore = events.filter(ev => ev.teamId === homeTeam?.id && !isInfraction(ev.type)).length;
    const liveAwayScore = events.filter(ev => ev.teamId === awayTeam?.id && !isInfraction(ev.type)).length;

    const displayHomeScore = isFinished ? homeScore : liveHomeScore;
    const displayAwayScore = isFinished ? awayScore : liveAwayScore;

    const bigScoreSpan = document.createElement('span');
    bigScoreSpan.className = 'big-score';
    bigScoreSpan.textContent = `${displayHomeScore} - ${displayAwayScore}`;
    scoreDiv.appendChild(bigScoreSpan);

    const statusBadge = document.createElement('span');
    statusBadge.className = `badge status-${match.status}`;
    statusBadge.textContent = isFinished ? 'Finalizado' : (events.length > 0 ? 'En Juego' : 'Programado');
    scoreDiv.appendChild(statusBadge);

    const awayDiv = document.createElement('div');
    awayDiv.className = 'team-box';
    const aName = document.createElement('h2');
    aName.textContent = awayTeam ? awayTeam.name : 'Por definir';
    awayDiv.appendChild(aName);

    teamsRow.appendChild(homeDiv);
    teamsRow.appendChild(scoreDiv);
    teamsRow.appendChild(awayDiv);
    header.appendChild(teamsRow);
    container.appendChild(header);

    // Infractions configuration for active sport
    const infractions = sportConfig.infractions || [
        { type: 'Tarjeta Amarilla', label: '🟨 Tarjeta Amarilla' },
        { type: 'Tarjeta Roja', label: '🟥 Tarjeta Roja' }
    ];

    // Map players by ID for easy lookup
    const allPlayersMap = new Map([...homePlayers, ...awayPlayers].map(p => [p.id, p]));

    // Panel de control si no está finalizado
    if (!isFinished && homeTeam && awayTeam) {
        const controlPanel = document.createElement('div');
        controlPanel.className = 'glass-panel control-panel';

        const h3Control = document.createElement('h3');
        h3Control.textContent = `Registrar Anotación o Infracción`;
        controlPanel.appendChild(h3Control);

        const form = document.createElement('form');
        form.id = 'event-form';
        form.className = 'event-form-grid';

        // Team Select
        const groupTeam = document.createElement('div');
        groupTeam.className = 'form-group';
        const labelTeam = document.createElement('label');
        labelTeam.textContent = 'Equipo';
        const teamSelect = document.createElement('select');
        teamSelect.id = 'event-team-select';
        teamSelect.required = true;
        teamSelect.className = 'form-control';

        const optHome = document.createElement('option');
        optHome.value = 'home';
        optHome.textContent = homeTeam.name;
        teamSelect.appendChild(optHome);

        const optAway = document.createElement('option');
        optAway.value = 'away';
        optAway.textContent = awayTeam.name;
        teamSelect.appendChild(optAway);

        groupTeam.appendChild(labelTeam);
        groupTeam.appendChild(teamSelect);
        form.appendChild(groupTeam);

        // Player Select
        const groupPlayer = document.createElement('div');
        groupPlayer.className = 'form-group';
        const labelPlayer = document.createElement('label');
        labelPlayer.textContent = 'Jugador';
        const playerSelect = document.createElement('select');
        playerSelect.id = 'event-player-select';
        playerSelect.name = 'playerId';
        playerSelect.required = true;
        playerSelect.className = 'form-control';
        groupPlayer.appendChild(labelPlayer);
        groupPlayer.appendChild(playerSelect);
        form.appendChild(groupPlayer);

        // Event Type Select (Score vs Infractions)
        const groupType = document.createElement('div');
        groupType.className = 'form-group';
        const labelType = document.createElement('label');
        labelType.textContent = 'Tipo de Evento';
        const typeSelect = document.createElement('select');
        typeSelect.id = 'event-type-select';
        typeSelect.name = 'eventType';
        typeSelect.className = 'form-control';

        const optScore = document.createElement('option');
        optScore.value = sportConfig.scoreEvent;
        optScore.textContent = `${sportConfig.icon || '⚽'} ${sportConfig.scoreEvent} (Anotación)`;
        typeSelect.appendChild(optScore);

        infractions.forEach(inf => {
            const optInf = document.createElement('option');
            optInf.value = inf.type;
            optInf.textContent = inf.label;
            typeSelect.appendChild(optInf);
        });

        groupType.appendChild(labelType);
        groupType.appendChild(typeSelect);
        form.appendChild(groupType);

        // Minute Input
        const groupMin = document.createElement('div');
        groupMin.className = 'form-group';
        const labelMin = document.createElement('label');
        labelMin.textContent = 'Minuto';
        const inputMin = document.createElement('input');
        inputMin.type = 'number';
        inputMin.name = 'minute';
        inputMin.min = '1';
        inputMin.max = '120';
        inputMin.placeholder = 'Ej: 45';
        inputMin.className = 'form-control';
        groupMin.appendChild(labelMin);
        groupMin.appendChild(inputMin);
        form.appendChild(groupMin);

        const btnSubmitEv = document.createElement('button');
        btnSubmitEv.type = 'submit';
        btnSubmitEv.className = 'btn btn-primary align-self-end';
        btnSubmitEv.textContent = '+ Registrar';
        form.appendChild(btnSubmitEv);

        controlPanel.appendChild(form);

        const actionsBar = document.createElement('div');
        actionsBar.className = 'match-actions-bar';
        const btnFinalize = document.createElement('button');
        btnFinalize.id = 'btn-finalize-match';
        btnFinalize.className = 'btn btn-success';
        btnFinalize.textContent = 'Finalizar Partido';
        actionsBar.appendChild(btnFinalize);
        controlPanel.appendChild(actionsBar);

        container.appendChild(controlPanel);

        const updatePlayersOptions = (isHome) => {
            playerSelect.textContent = '';
            const list = isHome ? homePlayers : awayPlayers;
            if (list.length === 0) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = 'Sin jugadores registrados';
                playerSelect.appendChild(opt);
            } else {
                list.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = `#${p.number} - ${p.name}`;
                    playerSelect.appendChild(opt);
                });
            }
        };
        updatePlayersOptions(true);

        teamSelect.addEventListener('change', (e) => {
            updatePlayersOptions(e.target.value === 'home');
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const teamSide = teamSelect.value;
            const playerId = Number(formData.get('playerId'));
            if (!playerId) {
                toast.warning('Por favor selecciona un jugador.');
                return;
            }
            const minute = formData.get('minute') ? Number(formData.get('minute')) : null;
            const eventType = typeSelect.value || sportConfig.scoreEvent;

            try {
                await createMatchEvent({
                    matchId,
                    playerId,
                    teamId: teamSide === 'home' ? homeTeam.id : awayTeam.id,
                    type: eventType,
                    minute
                });
                toast.success('Evento registrado con éxito');
                await renderMatchDetail(container, params);
            } catch (err) {
                toast.error('Error al registrar evento: ' + err.message);
            }
        });

        btnFinalize.addEventListener('click', async () => {
            const currentEvents = await getEventsByMatch(matchId);
            const calcHomeScore = currentEvents.filter(ev => ev.teamId === homeTeam.id && !isInfraction(ev.type)).length;
            const calcAwayScore = currentEvents.filter(ev => ev.teamId === awayTeam.id && !isInfraction(ev.type)).length;

            let winnerId = null;
            const isKnockout = activeLeague.mode === 'eliminacion' || activeLeague.mode === 'doble-eliminacion' || activeLeague.modality === 'knockout';

            if (isKnockout && calcHomeScore === calcAwayScore) {
                const pickWinner = prompt(`El partido terminó en empate (${calcHomeScore}-${calcAwayScore}). Al ser eliminación directa, declare el ganador escribiendo el nombre del equipo clasificado (${homeTeam.name} o ${awayTeam.name}):`);
                if (pickWinner?.trim().toLowerCase() === homeTeam.name.toLowerCase()) {
                    winnerId = homeTeam.id;
                } else if (pickWinner?.trim().toLowerCase() === awayTeam.name.toLowerCase()) {
                    winnerId = awayTeam.id;
                } else {
                    toast.error('Ganador no válido o cancelado. Operación abortada.');
                    return;
                }
            }

            try {
                await finalizeMatch(matchId, currentEvents, winnerId);
                toast.success('¡Partido finalizado con éxito!');
                await renderMatchDetail(container, params);
            } catch (err) {
                toast.error('Error en transacción de finalización: ' + err.message);
            }
        });
    }

    // Listado de eventos
    const eventsContainer = document.createElement('div');
    eventsContainer.className = 'glass-panel section-container';
    const h3Events = document.createElement('h3');
    h3Events.textContent = 'Historial de Eventos del Partido';
    eventsContainer.appendChild(h3Events);

    if (events.length === 0) {
        const p = document.createElement('p');
        p.textContent = 'No se han registrado eventos todavía.';
        eventsContainer.appendChild(p);
    } else {
        const list = document.createElement('ul');
        list.className = 'events-list';
        events.forEach(ev => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.justifyContent = 'space-between';
            li.style.padding = '0.5rem 0.75rem';
            li.style.marginBottom = '0.35rem';
            li.style.background = 'rgba(15, 23, 42, 0.4)';
            li.style.borderRadius = '8px';

            const player = allPlayersMap.get(Number(ev.playerId));
            const playerName = player ? `#${player.number} - ${player.name}` : `Jugador ID ${ev.playerId}`;
            const teamName = ev.teamId === homeTeam?.id ? homeTeam.name : (ev.teamId === awayTeam?.id ? awayTeam.name : '');

            const isInf = isInfraction(ev.type);
            const badgeClass = isInf 
                ? (ev.type.toLowerCase().includes('roja') || ev.type.toLowerCase().includes('expulsi') ? 'badge-danger' : 'badge-warning') 
                : 'badge-success';

            const infoSpan = document.createElement('span');
            infoSpan.innerHTML = `<strong>Min ${ev.minute || 'S/N'}</strong>: <span class="badge ${badgeClass}">${ev.type}</span> <strong>${playerName}</strong> (${teamName})`;

            li.appendChild(infoSpan);

            if (!isFinished) {
                const btnDel = document.createElement('button');
                btnDel.className = 'btn-sm btn-danger';
                btnDel.textContent = '✖';
                btnDel.style.marginLeft = '1rem';
                btnDel.addEventListener('click', async () => {
                    try {
                        await deleteMatchEvent(ev.id);
                        toast.info('Evento eliminado');
                        await renderMatchDetail(container, params);
                    } catch (err) {
                        toast.error('Error al eliminar evento: ' + err.message);
                    }
                });
                li.appendChild(btnDel);
            }
            list.appendChild(li);
        });
        eventsContainer.appendChild(list);
    }
    container.appendChild(eventsContainer);

    // Botón Deshacer si está finalizado
    if (isFinished) {
        const undoContainer = document.createElement('div');
        undoContainer.className = 'glass-panel text-center';
        const btnUndo = document.createElement('button');
        btnUndo.className = 'btn btn-secondary';
        btnUndo.textContent = 'Deshacer Partido Finalizado';
        btnUndo.addEventListener('click', async () => {
            const confirmed = await confirmAction('Deshacer Partido', '¿Estás seguro de deshacer este partido? Se revertirán las estadísticas de equipos y jugadores.');
            if (confirmed) {
                try {
                    await undoMatch(matchId);
                    toast.success('Partido revertido con éxito.');
                    await renderMatchDetail(container, params);
                } catch (err) {
                    toast.error('Error al deshacer partido: ' + err.message);
                }
            }
        });
        undoContainer.appendChild(btnUndo);
        container.appendChild(undoContainer);
    }
}