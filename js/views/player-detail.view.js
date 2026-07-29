
import { playersDb } from '../db/players.db.js';
import { teamsDb } from '../db/teams.db.js'; 
import { getEventsByPlayer } from '../db/events.db.js'; 
import { getActiveLeague } from '../db/leagues.db.js';
import { SPORTS } from '../sports-terms.js';

export async function renderPlayerDetail(container, params) {
    const playerId = Number(params.id);
    container.textContent = '';
    const loading = document.createElement('loading-state');
    loading.setAttribute('message', 'Cargando perfil del jugador...');
    container.appendChild(loading);

    const player = await playersDb.getById(playerId); 
    if (!player) {
        container.textContent = '';
        const h2 = document.createElement('h2');
        h2.textContent = 'Jugador no encontrado';
        const a = document.createElement('a');
        a.href = '#players';
        a.className = 'btn';
        a.textContent = 'Volver';
        container.appendChild(h2);
        container.appendChild(a);
        return;
    }

    const team = await teamsDb.getById(player.teamId); 
    const activeLeague = await getActiveLeague();
    const sportConfig = SPORTS[activeLeague?.sport] || SPORTS.futbol;
    const events = await getEventsByPlayer(playerId);

    container.textContent = '';

    const backNav = document.createElement('div');
    backNav.className = 'back-nav';
    const backLink = document.createElement('a');
    backLink.href = '#players';
    backLink.className = 'btn btn-secondary';
    backLink.textContent = '← Volver a Jugadores';
    backNav.appendChild(backLink);
    container.appendChild(backNav);

    const profileHeader = document.createElement('div');
    profileHeader.className = 'profile-header glass-panel';

    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'profile-avatar-container';
    if (player.photo) {
        const img = document.createElement('img');
        img.src = player.photo;
        img.alt = player.name;
        img.className = 'profile-img';
        avatarContainer.appendChild(img);
    } else {
        const ph = document.createElement('div');
        ph.className = 'profile-placeholder';
        ph.textContent = `#${player.number}`;
        avatarContainer.appendChild(ph);
    }
    profileHeader.appendChild(avatarContainer);

    const profileInfo = document.createElement('div');
    profileInfo.className = 'profile-info';
    const h1 = document.createElement('h1');
    h1.textContent = player.name;
    profileInfo.appendChild(h1);

    const pMeta = document.createElement('p');
    pMeta.className = 'text-muted';
    pMeta.textContent = 'Posición: ';
    const strongPos = document.createElement('strong');
    strongPos.textContent = player.position;
    pMeta.appendChild(strongPos);
    pMeta.append(' | Dorsal: ');
    const strongNum = document.createElement('strong');
    strongNum.textContent = `#${player.number}`;
    pMeta.appendChild(strongNum);
    profileInfo.appendChild(pMeta);

    if (team) {
        const pTeam = document.createElement('p');
        pTeam.className = 'profile-team';
        pTeam.textContent = 'Equipo: ';
        const teamLink = document.createElement('a');
        teamLink.href = `#team/${team.id}`;
        teamLink.textContent = team.name;
        pTeam.appendChild(teamLink);
        profileInfo.appendChild(pTeam);
    }
    profileHeader.appendChild(profileInfo);
    container.appendChild(profileHeader);

    const statsGrid = document.createElement('div');
    statsGrid.className = 'stats-overview-grid';

    const createStatCard = (title, value) => {
        const card = document.createElement('div');
        card.className = 'stat-card glass-panel';
        const h3 = document.createElement('h3');
        h3.textContent = title;
        const pNum = document.createElement('p');
        pNum.className = 'stat-number';
        pNum.textContent = value;
        card.appendChild(h3);
        card.appendChild(pNum);
        return card;
    };

    const matchesPlayed = player.stats?.played ?? player.stats?.matchesPlayed ?? 0;
    const totalGoals = player.stats?.goals || 0;
    const average = matchesPlayed ? (totalGoals / matchesPlayed).toFixed(2) : '0.00';

    statsGrid.appendChild(createStatCard('Partidos Jugados', matchesPlayed));
    statsGrid.appendChild(createStatCard(`${sportConfig.scoreEvent}s Totales`, totalGoals));
    statsGrid.appendChild(createStatCard('Promedio por Partido', average));
    container.appendChild(statsGrid);

    const sectionContainer = document.createElement('div');
    sectionContainer.className = 'section-container glass-panel';
    const h2History = document.createElement('h2');
    h2History.textContent = `Historial de ${sportConfig.scoreEvent}s`;
    sectionContainer.appendChild(h2History);

    const historyList = document.createElement('div');
    if (events.length === 0) {
        const pNoEvents = document.createElement('p');
        pNoEvents.textContent = 'El jugador aún no registra anotaciones.';
        historyList.appendChild(pNoEvents);
    } else {
        const table = document.createElement('table');
        table.className = 'data-table';
        const thead = document.createElement('thead');
        thead.innerHTML = '<tr><th>Minuto</th><th>Partido</th><th>Acción</th></tr>';
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        events.forEach(ev => {
            const tr = document.createElement('tr');
            const tdMin = document.createElement('td');
            tdMin.textContent = ev.minute ? `${ev.minute}'` : '-';
            const tdMatch = document.createElement('td');
            tdMatch.textContent = `Partido #${ev.matchId}`;
            const tdAction = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = 'badge-goal';
            badge.textContent = sportConfig.scoreEvent;
            tdAction.appendChild(badge);

            tr.appendChild(tdMin);
            tr.appendChild(tdMatch);
            tr.appendChild(tdAction);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        historyList.appendChild(table);
    }
    sectionContainer.appendChild(historyList);
    container.appendChild(sectionContainer);
}