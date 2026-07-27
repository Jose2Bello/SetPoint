import { leaguesDb } from '../db/leagues.db.js';
import { teamsDb } from '../db/teams.db.js';
import { playersDb } from '../db/players.db.js';
import { matchesDb } from '../db/matches.db.js';
import { eventsDb } from '../db/events.db.js';
import { transactions } from '../db/transactions.js';
import { storage } from '../utils/storage.js';
import { getSportConfig } from '../sports-terms.js';

export async function renderLeagues(container) {
    const leagues = await leaguesDb.getAll();
    const activeLeagueId = storage.getActiveLeagueId();

    // Renderizado Vista Principal (Listado)
    renderListView(container, leagues, activeLeagueId);
}

function renderListView(container, leagues, activeLeagueId) {
    container.innerHTML = `
        <div class="leagues-header">
            <div>
                <h1 class="text-2xl font-bold">Gestión de Ligas</h1>
                <p class="text-sm text-muted">Crea, activa o administra tus torneos deportivos</p>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <label class="btn btn-secondary text-sm" style="cursor: pointer;">
                    📁 Importar JSON
                    <input type="file" id="importJsonInput" accept=".json" style="display: none;">
                </label>
                <button id="btnNewLeague" class="btn btn-primary text-sm">+ Nueva Liga</button>
            </div>
        </div>

        ${leagues.length === 0 ? `
            <div class="glass-card text-center" style="padding: 3rem 1.5rem;">
                <h2 class="text-xl font-bold mb-2">No hay ligas registradas</h2>
                <p class="text-secondary mb-4">Crea tu primera liga o importa una existente en formato JSON.</p>
                <button id="btnNewLeagueEmpty" class="btn btn-primary">Crear Primera Liga</button>
            </div>
        ` : `
            <div class="leagues-grid">
                ${leagues.map(league => renderLeagueCard(league, Number(activeLeagueId) === league.id)).join('')}
            </div>
        `}
    `;

    setupListEventListeners(container);
}

function renderLeagueCard(league, isActive) {
    const sport = getSportConfig(league.sport);
    const modeLabel = league.mode === 'eliminacion' 
        ? `Eliminación Directa (${league.bracketTeamsCount} equipos)` 
        : `Liga Regular (${league.rounds || 1} vuelta/s)`;

    return `
        <div class="league-card ${isActive ? 'is-active' : ''}">
            ${isActive ? '<span class="league-badge-active">ACTIVA</span>' : ''}
            <div>
                <div class="text-xs text-primary font-bold uppercase tracking-wider mb-1">
                    ${sport.icon} ${sport.name}
                </div>
                <h3 class="text-xl font-bold mb-1">${league.name}</h3>
                <p class="text-xs text-muted mb-2">Temporada: ${league.season || 'N/A'} | ${modeLabel}</p>
                ${league.description ? `<p class="text-sm text-secondary mb-3">${league.description}</p>` : ''}
            </div>

            <div class="league-actions">
                ${!isActive ? `<button class="btn btn-sm btn-primary btn-activate" data-id="${league.id}">Activar</button>` : ''}
                <button class="btn btn-sm btn-secondary btn-edit" data-id="${league.id}">Editar</button>
                <button class="btn btn-sm btn-secondary btn-export" data-id="${league.id}">Exportar</button>
                <button class="btn btn-sm btn-danger btn-delete" data-id="${league.id}">Eliminar</button>
            </div>
        </div>
    `;
}

function setupListEventListeners(container) {
    // Ir al formulario de Nueva Liga
    const goForm = () => renderFormView(container);
    container.querySelector('#btnNewLeague')?.addEventListener('click', goForm);
    container.querySelector('#btnNewLeagueEmpty')?.addEventListener('click', goForm);

    // Acciones de tarjetas
    container.addEventListener('click', async (e) => {
        const id = Number(e.target.dataset.id);
        if (!id) return;

        if (e.target.classList.contains('btn-activate')) {
            await transactions.activateLeague(id);
            storage.setActiveLeagueId(id);
            renderLeagues(container);
        } else if (e.target.classList.contains('btn-edit')) {
            const league = await leaguesDb.getById(id);
            if (league) renderFormView(container, league);
        } else if (e.target.classList.contains('btn-delete')) {
            if (confirm('¿Estás seguro de eliminar esta liga? Se borrarán todos sus equipos, jugadores y partidos asociados.')) {
                await transactions.deleteLeagueCascade(id);
                if (Number(storage.getActiveLeagueId()) === id) {
                    storage.setActiveLeagueId(null);
                }
                renderLeagues(container);
            }
        } else if (e.target.classList.contains('btn-export')) {
            await exportLeagueJson(id);
        }
    });

    // Importar JSON
    const importInput = container.querySelector('#importJsonInput');
    importInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (!data.league || !data.league.name || !data.league.sport) {
                throw new Error('El archivo JSON no tiene la estructura de una liga válida.');
            }
            await transactions.importLeagueData(data);
            alert('¡Liga importada con éxito!');
            renderLeagues(container);
        } catch (err) {
            alert(`Error al importar: ${err.message}`);
        }
    });
}

function renderFormView(container, leagueToEdit = null) {
    const isEdit = !!leagueToEdit;

    container.innerHTML = `
        <div class="league-form-container glass-card">
            <div style="display: flex; justify-content: space-between; align-items: center;" class="mb-3">
                <h1 class="text-2xl font-bold">${isEdit ? 'Editar Liga' : 'Crear Nueva Liga'}</h1>
                <button id="btnBackToList" class="btn btn-secondary text-sm">&larr; Volver</button>
            </div>

            <form id="leagueForm">
                <!-- Rejilla de 2 columnas -->
                <div class="form-grid-2col">
                    <div class="form-group">
                        <label class="label text-sm">Nombre de la Liga</label>
                        <input type="text" name="name" class="input" value="${leagueToEdit?.name || ''}" required placeholder="Ej. Liga Premier 2026">
                    </div>

                    <div class="form-group">
                        <label class="label text-sm">Temporada</label>
                        <input type="text" name="season" class="input" value="${leagueToEdit?.season || ''}" required placeholder="Ej. Clausura 2026">
                    </div>

                    ${!isEdit ? `
                        <div class="form-group">
                            <label class="label text-sm">Deporte</label>
                            <select name="sport" class="input" required>
                                <option value="futbol">⚽ Fútbol</option>
                                <option value="basquet">🏀 Básquetbol</option>
                                <option value="voleibol">🏐 Vóleibol</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="label text-sm">Modalidad</label>
                            <select name="mode" id="leagueModeSelect" class="input" required>
                                <option value="liga">Liga Regular (Todos contra todos)</option>
                                <option value="eliminacion">Eliminación Directa (Brackets)</option>
                            </select>
                        </div>

                        <div id="modeOptionsContainer" class="form-group col-span-2">
                            <label class="label text-sm">Número de Vueltas</label>
                            <select name="rounds" class="input">
                                <option value="1">1 Vuelta</option>
                                <option value="2">2 Vueltas (Ida y Vuelta)</option>
                            </select>
                        </div>
                    ` : ''}

                    <div class="form-group col-span-2">
                        <label class="label text-sm">Descripción (Opcional)</label>
                        <textarea name="description" class="input" rows="2" placeholder="Notas sobre el torneo...">${leagueToEdit?.description || ''}</textarea>
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
                    <button type="button" id="btnCancelForm" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Guardar Cambios' : 'Crear Liga'}</button>
                </div>
            </form>
        </div>
    `;

    // (Mantener el resto del JS de renderFormView exactamente igual)
    const modeSelect = container.querySelector('#leagueModeSelect');
    const optionsContainer = container.querySelector('#modeOptionsContainer');

    modeSelect?.addEventListener('change', (e) => {
        if (e.target.value === 'eliminacion') {
            optionsContainer.innerHTML = `
                <label class="label text-sm">Cantidad de Equipos en Llave</label>
                <select name="bracketTeamsCount" class="input">
                    <option value="4">4 Equipos (Semifinales)</option>
                    <option value="8" selected>8 Equipos (Cuartos de final)</option>
                    <option value="16">16 Equipos (Octavos de final)</option>
                </select>
            `;
        } else {
            optionsContainer.innerHTML = `
                <label class="label text-sm">Número de Vueltas</label>
                <select name="rounds" class="input">
                    <option value="1">1 Vuelta</option>
                    <option value="2">2 Vueltas (Ida y Vuelta)</option>
                </select>
            `;
        }
    });

    const goBack = () => renderLeagues(container);
    container.querySelector('#btnBackToList')?.addEventListener('click', goBack);
    container.querySelector('#btnCancelForm')?.addEventListener('click', goBack);

    container.querySelector('#leagueForm').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        if (isEdit) {
            await leaguesDb.update(leagueToEdit.id, data);
        } else {
            const newId = await leaguesDb.create(data);
            const allLeagues = await leaguesDb.getAll();
            if (allLeagues.length === 1) {
                await transactions.activateLeague(newId);
                storage.setActiveLeagueId(newId);
            }
        }

        renderLeagues(container);
    };
}

async function exportLeagueJson(leagueId) {
    const league = await leaguesDb.getById(leagueId);
    if (!league) return;

    const teams = await teamsDb.getByLeague(leagueId);
    const matches = await matchesDb.getByLeague(leagueId);

    let players = [];
    for (const team of teams) {
        const teamPlayers = await playersDb.getByTeam(team.id);
        players = players.concat(teamPlayers);
    }

    let events = [];
    for (const match of matches) {
        const matchEvents = await eventsDb.getByMatch(match.id);
        events = events.concat(matchEvents);
    }

    const dump = {
        exportedAt: new Date().toISOString(),
        league,
        teams,
        players,
        matches,
        events
    };

    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liga_${league.name.toLowerCase().replace(/\s+/g, '_')}_dump.json`;
    a.click();
    URL.revokeObjectURL(url);
}