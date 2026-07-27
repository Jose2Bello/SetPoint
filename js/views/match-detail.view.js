// js/views/match-detail.view.js
import { getMatchById } from '../db/matches.db.js';
import { getTeamById } from '../db/teams.db.js';
import { getPlayersByTeam } from '../db/players.db.js';
import { getEventsByMatch, createMatchEvent, deleteMatchEvent } from '../db/events.db.js';
import { getActiveLeague } from '../db/leagues.db.js';
import { finalizeMatch, undoMatch } from '../db/transactions.js';
import { SPORTS } from '../sports-terms.js';

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

    const bigScoreSpan = document.createElement('span');
    bigScoreSpan.className = 'big-score';
    if (match.status === 'finished') {
        bigScoreSpan.textContent = `${match.homeScore} - ${match.awayScore}`;
    } else {
        bigScoreSpan.className += ' vs-text';
        bigScoreSpan.textContent = 'VS';
    }
    scoreDiv.appendChild(bigScoreSpan);

    const statusBadge = document.createElement('span');
    statusBadge.className = `badge status-${match.status}`;
    statusBadge.textContent = match.status === 'finished' ? 'Finalizado' : 'Programado';
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

    // Panel de control si está programado
    if (match.status === 'scheduled' && homeTeam && awayTeam) {
        const controlPanel = document.createElement('div');
        controlPanel.className = 'glass-panel control-panel';

        const h3Control = document.createElement('h3');
        h3Control.textContent = `Registrar ${sportConfig.scoreEvent}`;
        controlPanel.appendChild(h3Control);

        const form = document.createElement('form');
        form.id = 'event-form';
        form.className = 'event-form-grid';

        // Equipo Select Group
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

        // Jugador Select Group
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

        // Minuto Group
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

        // Submit Button
        const btnSubmitEv = document.createElement('button');
        btnSubmitEv.type = 'submit';
        btnSubmitEv.className = 'btn btn-primary align-self-end';
        btnSubmitEv.textContent = '+ Registrar';
        form.appendChild(btnSubmitEv);

        controlPanel.appendChild(form);

        // Acciones bar
        const actionsBar = document.createElement('div');
        actionsBar.className = 'match-actions-bar';
        const btnFinalize = document.createElement('button');
        btnFinalize.id = 'btn-finalize-match';
        btnFinalize.className = 'btn btn-success';
        btnFinalize.textContent = 'Finalizar Partido';
        actionsBar.appendChild(btnFinalize);
        controlPanel.appendChild(actionsBar);

        container.appendChild(controlPanel);

        // Actualizar opciones de jugadores dinámicamente
        const updatePlayersOptions = (isHome) => {
            playerSelect.textContent = '';
            const list = isHome ? homePlayers : awayPlayers;
            list.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `#${p.number} - ${p.name}`;
                playerSelect.appendChild(opt);
            });
        };
        updatePlayersOptions(true);

        teamSelect.addEventListener('change', (e) => {
            updatePlayersOptions(e.target.value === 'home');
        });

        // Registrar Evento Submit
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const teamSide = teamSelect.value;
            const playerId = Number(formData.get('playerId'));
            const minute = formData.get('minute') ? Number(formData.get('minute')) : null;

            try {
                await createMatchEvent({
                    matchId,
                    playerId,
                    teamId: teamSide === 'home' ? homeTeam.id : awayTeam.id,
                    type: sportConfig.scoreEvent,
                    minute
                });
                window.location.reload();
            } catch (err) {
                alert('Error al registrar evento: ' + err.message);
            }
        });

        // Finalizar Partido transaccional
        btnFinalize.addEventListener('click', async () => {
            const currentEvents = await getEventsByMatch(matchId);
            const homeScore = currentEvents.filter(ev => ev.teamId === homeTeam.id).length;
            const awayScore = currentEvents.filter(ev => ev.teamId === awayTeam.id).length;

            let winnerId = null;
            if (activeLeague.modality === 'knockout' && homeScore === awayScore) {
                const pickWinner = prompt(`El partido terminó en empate (${homeScore}-${awayScore}). Al ser eliminación directa, declare el ganador escribiendo el nombre del equipo clasificado (${homeTeam.name} o ${awayTeam.name}):`);
                if (pickWinner?.trim().toLowerCase() === homeTeam.name.toLowerCase()) {
                    winnerId = homeTeam.id;
                } else if (pickWinner?.trim().toLowerCase() === awayTeam.name.toLowerCase()) {
                    winnerId = awayTeam.id;
                } else {
                    alert('Ganador no válido o cancelado. Operación abortada.');
                    return;
                }
            }

            try {
                await finalizeMatch(matchId, homeScore, awayScore, currentEvents, winnerId);
                alert('¡Partido finalizado con éxito!');
                window.location.reload();
            } catch (err) {
                alert('Error en transacción de finalización: ' + err.message);
            }
        });
    }

    // Listado de eventos registrados
    const eventsContainer = document.createElement('div');
    eventsContainer.className = 'glass-panel section-container';
    const h3Events = document.createElement('h3');
    h3Events.textContent = 'Eventos del Partido';
    eventsContainer.appendChild(h3Events);

    if (events.length === 0) {
        const p = document.createElement('p');
        p.textContent = 'No se han registrado anotaciones todavía.';
        eventsContainer.appendChild(p);
    } else {
        const list = document.createElement('ul');
        list.className = 'events-list';
        events.forEach(ev => {
            const li = document.createElement('li');
            li.textContent = `Minuto ${ev.minute || 'S/N'}: Jugador ID ${ev.playerId} anotó ${sportConfig.scoreEvent}`;

            if (match.status === 'scheduled') {
                const btnDel = document.createElement('button');
                btnDel.className = 'btn-sm btn-danger';
                btnDel.textContent = 'X';
                btnDel.addEventListener('click', async () => {
                    await deleteMatchEvent(ev.id);
                    window.location.reload();
                });
                li.appendChild(btnDel);
            }
            list.appendChild(li);
        });
        eventsContainer.appendChild(list);
    }
    container.appendChild(eventsContainer);

    // Botón Deshacer si está finalizado
    if (match.status === 'finished') {
        const undoContainer = document.createElement('div');
        undoContainer.className = 'glass-panel text-center';
        const btnUndo = document.createElement('button');
        btnUndo.className = 'btn btn-secondary';
        btnUndo.textContent = 'Deshacer Partido Finalizado';
        btnUndo.addEventListener('click', async () => {
            if (confirm('¿Estás seguro de deshacer este partido? Se revertirán las estadísticas de equipos y jugadores.')) {
                try {
                    await undoMatch(matchId);
                    alert('Partido revertido con éxito.');
                    window.location.reload();
                } catch (err) {
                    alert('Error al deshacer partido: ' + err.message);
                }
            }
        });
        undoContainer.appendChild(btnUndo);
        container.appendChild(undoContainer);
    }
}