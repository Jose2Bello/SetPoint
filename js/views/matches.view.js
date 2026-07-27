// js/views/matches.view.js
import { getActiveLeague } from '../db/leagues.db.js';
import { getTeamsByLeague } from '../db/teams.db.js';
import { getAllMatches, createMatch } from '../db/matches.db.js';

export async function renderMatches(container) {
    container.textContent = '';
    const loading = document.createElement('loading-state');
    loading.setAttribute('message', 'Cargando partidos...');
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
        p.textContent = 'Selecciona o crea una liga para ver sus partidos.';
        emptyDiv.appendChild(p);

        const a = document.createElement('a');
        a.href = '#leagues';
        a.className = 'btn btn-primary';
        a.textContent = 'Ir a Ligas';
        emptyDiv.appendChild(a);

        container.appendChild(emptyDiv);
        return;
    }

    const teams = await getTeamsByLeague(activeLeague.id);
    const matches = await getAllMatches(activeLeague.id);

    container.textContent = '';

    // Cabecera
    const headerDiv = document.createElement('div');
    headerDiv.className = 'view-header';

    const titleGroup = document.createElement('div');
    const h1 = document.createElement('h1');
    h1.textContent = 'Calendario de Partidos';
    const pSub = document.createElement('p');
    pSub.textContent = `Modalidad: ${activeLeague.modality === 'league' ? 'Liga (Todos contra todos)' : 'Eliminación Directa'}`;
    titleGroup.appendChild(h1);
    titleGroup.appendChild(pSub);
    headerDiv.appendChild(titleGroup);

    if (activeLeague.modality === 'league') {
        const btnNew = document.createElement('button');
        btnNew.id = 'btn-open-match-modal';
        btnNew.className = 'btn btn-primary';
        btnNew.textContent = '+ Programar Partido';
        headerDiv.appendChild(btnNew);
    }
    container.appendChild(headerDiv);

    // Barra de filtros
    const filtersBar = document.createElement('div');
    filtersBar.className = 'filters-bar glass-panel';

    const statusSelect = document.createElement('select');
    statusSelect.id = 'filter-status';
    statusSelect.className = 'form-control';
    
    const optStatusDefault = document.createElement('option');
    optStatusDefault.value = '';
    optStatusDefault.textContent = 'Todos los estados';
    statusSelect.appendChild(optStatusDefault);

    const optStatusSched = document.createElement('option');
    optStatusSched.value = 'scheduled';
    optStatusSched.textContent = 'Programados';
    statusSelect.appendChild(optStatusSched);

    const optStatusFin = document.createElement('option');
    optStatusFin.value = 'finished';
    optStatusFin.textContent = 'Finalizados';
    statusSelect.appendChild(optStatusFin);

    const teamSelect = document.createElement('select');
    teamSelect.id = 'filter-team';
    teamSelect.className = 'form-control';
    
    const optTeamDefault = document.createElement('option');
    optTeamDefault.value = '';
    optTeamDefault.textContent = 'Todos los equipos';
    teamSelect.appendChild(optTeamDefault);

    teams.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        teamSelect.appendChild(opt);
    });

    const btnClear = document.createElement('button');
    btnClear.className = 'btn btn-secondary';
    btnClear.textContent = 'Limpiar filtros';

    filtersBar.appendChild(statusSelect);
    filtersBar.appendChild(teamSelect);
    filtersBar.appendChild(btnClear);
    container.appendChild(filtersBar);

    // Contenedor Grid
    const gridEl = document.createElement('div');
    gridEl.id = 'matches-grid';
    gridEl.className = 'cards-grid';
    container.appendChild(gridEl);

    // Modal de Creación (Solo Liga)
    let modal;
    if (activeLeague.modality === 'league') {
        modal = document.createElement('div');
        modal.id = 'match-modal';
        modal.className = 'modal hidden';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content glass-panel';

        const modalTitle = document.createElement('h3');
        modalTitle.textContent = 'Programar Nuevo Partido';
        modalContent.appendChild(modalTitle);

        const form = document.createElement('form');
        form.id = 'match-form';

        // Local Group
        const groupHome = document.createElement('div');
        groupHome.className = 'form-group';
        const labelHome = document.createElement('label');
        labelHome.textContent = 'Equipo Local *';
        const selectHome = document.createElement('select');
        selectHome.name = 'homeTeamId';
        selectHome.required = true;
        selectHome.className = 'form-control';
        const optHDef = document.createElement('option');
        optHDef.value = '';
        optHDef.textContent = 'Seleccionar local';
        selectHome.appendChild(optHDef);
        teams.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            selectHome.appendChild(opt);
        });
        groupHome.appendChild(labelHome);
        groupHome.appendChild(selectHome);
        form.appendChild(groupHome);

        // Away Group
        const groupAway = document.createElement('div');
        groupAway.className = 'form-group';
        const labelAway = document.createElement('label');
        labelAway.textContent = 'Equipo Visitante *';
        const selectAway = document.createElement('select');
        selectAway.name = 'awayTeamId';
        selectAway.required = true;
        selectAway.className = 'form-control';
        const optADef = document.createElement('option');
        optADef.value = '';
        optADef.textContent = 'Seleccionar visitante';
        selectAway.appendChild(optADef);
        teams.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            selectAway.appendChild(opt);
        });
        groupAway.appendChild(labelAway);
        groupAway.appendChild(selectAway);
        form.appendChild(groupAway);

        // Date Group
        const groupDate = document.createElement('div');
        groupDate.className = 'form-group';
        const labelDate = document.createElement('label');
        labelDate.textContent = 'Fecha y Hora *';
        const inputDate = document.createElement('input');
        inputDate.type = 'datetime-local';
        inputDate.name = 'date';
        inputDate.required = true;
        inputDate.className = 'form-control';
        groupDate.appendChild(labelDate);
        groupDate.appendChild(inputDate);
        form.appendChild(groupDate);

        // Actions
        const modalActions = document.createElement('div');
        modalActions.className = 'modal-actions';
        const btnCancel = document.createElement('button');
        btnCancel.type = 'button';
        btnCancel.id = 'btn-close-match-modal';
        btnCancel.className = 'btn btn-secondary';
        btnCancel.textContent = 'Cancelar';

        const btnSubmit = document.createElement('button');
        btnSubmit.type = 'submit';
        btnSubmit.className = 'btn btn-primary';
        btnSubmit.textContent = 'Guardar Partido';

        modalActions.appendChild(btnCancel);
        modalActions.appendChild(btnSubmit);
        form.appendChild(modalActions);

        modalContent.appendChild(form);
        modal.appendChild(modalContent);
        container.appendChild(modal);
    }

    const teamMap = new Map(teams.map(t => [t.id, t]));

    function renderList(dataToRender) {
        gridEl.textContent = '';
        if (dataToRender.length === 0) {
            const p = document.createElement('p');
            p.className = 'no-data';
            p.textContent = 'No hay partidos registrados con los filtros seleccionados.';
            gridEl.appendChild(p);
            return;
        }

        dataToRender.forEach(m => {
            const home = teamMap.get(m.homeTeamId);
            const away = teamMap.get(m.awayTeamId);
            const card = document.createElement('match-card');
            card.setAttribute('match-id', m.id);
            card.setAttribute('home-name', home ? home.name : 'Por definir');
            card.setAttribute('away-name', away ? away.name : 'Por definir');
            card.setAttribute('status', m.status);
            card.setAttribute('home-score', m.homeScore || 0);
            card.setAttribute('away-score', m.awayScore || 0);
            if (m.date) card.setAttribute('date', m.date);
            if (m.round) card.setAttribute('round', m.round);
            gridEl.appendChild(card);
        });
    }

    renderList(matches);

    // Eventos de Filtro
    const applyFilters = () => {
        const status = statusSelect.value;
        const teamId = teamSelect.value;

        const filtered = matches.filter(m => {
            const matchStatus = status ? m.status === status : true;
            const matchTeam = teamId ? (String(m.homeTeamId) === teamId || String(m.awayTeamId) === teamId) : true;
            return matchStatus && matchTeam;
        });
        renderList(filtered);
    };

    statusSelect.addEventListener('change', applyFilters);
    teamSelect.addEventListener('change', applyFilters);
    btnClear.addEventListener('click', () => {
        statusSelect.value = '';
        teamSelect.value = '';
        renderList(matches);
    });

    if (activeLeague.modality === 'league') {
        container.querySelector('#btn-open-match-modal').addEventListener('click', () => modal.classList.remove('hidden'));
        container.querySelector('#btn-close-match-modal').addEventListener('click', () => modal.classList.add('hidden'));

        container.querySelector('#match-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const homeTeamId = Number(formData.get('homeTeamId'));
            const awayTeamId = Number(formData.get('awayTeamId'));

            if (homeTeamId === awayTeamId) {
                alert('Un equipo no puede enfrentarse a sí mismo.');
                return;
            }

            const newMatch = {
                leagueId: activeLeague.id,
                homeTeamId,
                awayTeamId,
                date: formData.get('date'),
                status: 'scheduled',
                homeScore: 0,
                awayScore: 0
            };

            try {
                await createMatch(newMatch);
                modal.classList.add('hidden');
                window.location.reload();
            } catch (err) {
                alert('Error al programar partido: ' + err.message);
            }
        });
    }
}