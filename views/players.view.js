// js/views/players.view.js
import { getActiveLeague } from '../db/leagues.db.js';
import { getTeamsByLeague } from '../db/teams.db.js';
import { getAllPlayers, createPlayer } from '../db/players.db.js';
import { debounce } from '../utils/debounce.js';
import { SPORTS } from '../sports-terms.js';

export async function renderPlayers(container) {
    container.textContent = '';
    const loading = document.createElement('loading-state');
    loading.setAttribute('message', 'Cargando jugadores...');
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
        p.textContent = 'Debes activar o crear una liga para gestionar sus jugadores.';
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

    container.textContent = '';

    // Cabecera
    const headerDiv = document.createElement('div');
    headerDiv.className = 'view-header';

    const titleGroup = document.createElement('div');
    const h1 = document.createElement('h1');
    h1.textContent = 'Plantel de Jugadores';
    const pSub = document.createElement('p');
    pSub.textContent = 'Gestión de atletas para la liga: ';
    const strongLeague = document.createElement('strong');
    strongLeague.textContent = activeLeague.name;
    pSub.appendChild(strongLeague);
    titleGroup.appendChild(h1);
    titleGroup.appendChild(pSub);

    const btnNew = document.createElement('button');
    btnNew.id = 'btn-open-player-modal';
    btnNew.className = 'btn btn-primary';
    btnNew.textContent = '+ Nuevo Jugador';

    headerDiv.appendChild(titleGroup);
    headerDiv.appendChild(btnNew);
    container.appendChild(headerDiv);

    // Filtros
    const filtersBar = document.createElement('div');
    filtersBar.className = 'filters-bar glass-panel';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'search-player';
    searchInput.placeholder = 'Buscar por nombre...';
    searchInput.className = 'form-control';

    const teamSelect = document.createElement('select');
    teamSelect.id = 'filter-team';
    teamSelect.className = 'form-control';
    const defaultTeamOpt = document.createElement('option');
    defaultTeamOpt.value = '';
    defaultTeamOpt.textContent = 'Todos los equipos';
    teamSelect.appendChild(defaultTeamOpt);
    teams.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        teamSelect.appendChild(opt);
    });

    const posSelect = document.createElement('select');
    posSelect.id = 'filter-position';
    posSelect.className = 'form-control';
    const defaultPosOpt = document.createElement('option');
    defaultPosOpt.value = '';
    defaultPosOpt.textContent = 'Todas las posiciones';
    posSelect.appendChild(defaultPosOpt);
    (sportConfig.positions || []).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        posSelect.appendChild(opt);
    });

    const btnClear = document.createElement('button');
    btnClear.id = 'btn-clear-filters';
    btnClear.className = 'btn btn-secondary';
    btnClear.textContent = 'Limpiar';

    filtersBar.appendChild(searchInput);
    filtersBar.appendChild(teamSelect);
    filtersBar.appendChild(posSelect);
    filtersBar.appendChild(btnClear);
    container.appendChild(filtersBar);

    // Grid de jugadores
    const gridEl = document.createElement('div');
    gridEl.id = 'players-grid';
    gridEl.className = 'cards-grid';
    container.appendChild(gridEl);

    // Modal
    const modal = document.createElement('div');
    modal.id = 'player-modal';
    modal.className = 'modal hidden';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content glass-panel';

    const modalTitle = document.createElement('h3');
    modalTitle.textContent = 'Registrar Nuevo Jugador';
    modalContent.appendChild(modalTitle);

    const form = document.createElement('form');
    form.id = 'player-form';

    // Grupo Nombre
    const groupName = document.createElement('div');
    groupName.className = 'form-group';
    const labelName = document.createElement('label');
    labelName.textContent = 'Nombre Completo *';
    const inputName = document.createElement('input');
    inputName.type = 'text';
    inputName.name = 'name';
    inputName.required = true;
    inputName.className = 'form-control';
    groupName.appendChild(labelName);
    groupName.appendChild(inputName);
    form.appendChild(groupName);

    // Grupo Foto
    const groupPhoto = document.createElement('div');
    groupPhoto.className = 'form-group';
    const labelPhoto = document.createElement('label');
    labelPhoto.textContent = 'URL de Foto (Opcional)';
    const inputPhoto = document.createElement('input');
    inputPhoto.type = 'url';
    inputPhoto.name = 'photo';
    inputPhoto.className = 'form-control';
    inputPhoto.placeholder = 'https://...';
    groupPhoto.appendChild(labelPhoto);
    groupPhoto.appendChild(inputPhoto);
    form.appendChild(groupPhoto);

    // Grupo Equipo
    const groupTeam = document.createElement('div');
    groupTeam.className = 'form-group';
    const labelTeam = document.createElement('label');
    labelTeam.textContent = 'Equipo *';
    const selectTeamForm = document.createElement('select');
    selectTeamForm.name = 'teamId';
    selectTeamForm.required = true;
    selectTeamForm.className = 'form-control';
    const optDefTeam = document.createElement('option');
    optDefTeam.value = '';
    optDefTeam.textContent = 'Seleccione equipo';
    selectTeamForm.appendChild(optDefTeam);
    teams.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        selectTeamForm.appendChild(opt);
    });
    groupTeam.appendChild(labelTeam);
    groupTeam.appendChild(selectTeamForm);
    form.appendChild(groupTeam);

    // Fila Posición y Dorsal
    const formRow = document.createElement('div');
    formRow.className = 'form-row';

    const groupPos = document.createElement('div');
    groupPos.className = 'form-group';
    const labelPos = document.createElement('label');
    labelPos.textContent = 'Posición *';
    const inputPos = document.createElement('input');
    inputPos.type = 'text';
    inputPos.name = 'position';
    inputPos.required = true;
    inputPos.className = 'form-control';
    inputPos.placeholder = sportConfig.positions?.[0] || 'Posición';
    groupPos.appendChild(labelPos);
    groupPos.appendChild(inputPos);

    const groupNum = document.createElement('div');
    groupNum.className = 'form-group';
    const labelNum = document.createElement('label');
    labelNum.textContent = 'Dorsal / Número *';
    const inputNum = document.createElement('input');
    inputNum.type = 'number';
    inputNum.name = 'number';
    inputNum.required = true;
    inputNum.min = '1';
    inputNum.max = '99';
    inputNum.className = 'form-control';
    groupNum.appendChild(labelNum);
    groupNum.appendChild(inputNum);

    formRow.appendChild(groupPos);
    formRow.appendChild(groupNum);
    form.appendChild(formRow);

    // Acciones Modal
    const modalActions = document.createElement('div');
    modalActions.className = 'modal-actions';
    const btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.id = 'btn-close-modal';
    btnCancel.className = 'btn btn-secondary';
    btnCancel.textContent = 'Cancelar';

    const btnSubmit = document.createElement('button');
    btnSubmit.type = 'submit';
    btnSubmit.className = 'btn btn-primary';
    btnSubmit.textContent = 'Guardar Jugador';

    modalActions.appendChild(btnCancel);
    modalActions.appendChild(btnSubmit);
    form.appendChild(modalActions);

    modalContent.appendChild(form);
    modal.appendChild(modalContent);
    container.appendChild(modal);

    const teamMap = new Map(teams.map(t => [t.id, t]));

    function renderList(dataToRender) {
        gridEl.textContent = '';
        if (dataToRender.length === 0) {
            const pNoData = document.createElement('p');
            pNoData.className = 'no-data';
            pNoData.textContent = 'No se encontraron jugadores registrados.';
            gridEl.appendChild(pNoData);
            return;
        }
        dataToRender.forEach(p => {
            const team = teamMap.get(p.teamId);
            const card = document.createElement('player-card');
            card.setAttribute('player-id', p.id);
            card.setAttribute('name', p.name);
            card.setAttribute('position', p.position);
            card.setAttribute('number', p.number);
            card.setAttribute('team-name', team ? team.name : '');
            if (p.photo) card.setAttribute('photo', p.photo);
            gridEl.appendChild(card);
        });
    }

    renderList(players);

    const applyFilters = debounce(() => {
        const query = searchInput.value.toLowerCase();
        const teamId = teamSelect.value;
        const pos = posSelect.value;

        const filtered = players.filter(p => {
            const matchesName = p.name.toLowerCase().includes(query);
            const matchesTeam = teamId ? String(p.teamId) === teamId : true;
            const matchesPos = pos ? p.position === pos : true;
            return matchesName && matchesTeam && matchesPos;
        });

        renderList(filtered);
    }, 300);

    searchInput.addEventListener('input', applyFilters);
    teamSelect.addEventListener('change', applyFilters);
    posSelect.addEventListener('change', applyFilters);

    btnClear.addEventListener('click', () => {
        searchInput.value = '';
        teamSelect.value = '';
        posSelect.value = '';
        renderList(players);
    });

    btnNew.addEventListener('click', () => modal.classList.remove('hidden'));
    btnCancel.addEventListener('click', () => modal.classList.add('hidden'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newPlayer = {
            name: formData.get('name'),
            photo: formData.get('photo'),
            teamId: Number(formData.get('teamId')),
            position: formData.get('position'),
            number: Number(formData.get('number')),
            stats: { matchesPlayed: 0, goals: 0 }
        };

        try {
            await createPlayer(newPlayer);
            modal.classList.add('hidden');
            window.location.reload();
        } catch (err) {
            alert('Error al registrar jugador: ' + err.message);
        }
    });
}