import { leaguesDb } from '../db/leagues.db.js';
import { teamsDb, createTeam, updateTeam, getAllTeams } from '../db/teams.db.js';
import { playersDb, getPlayersByTeam } from '../db/players.db.js';
import { matchesDb } from '../db/matches.db.js';
import { eventsDb, getEventsByMatch } from '../db/events.db.js';
import { transactions } from '../db/transactions.js';
import { bracketService } from '../services/bracket.service.js';
import { fixtureService } from '../services/fixture.service.js';
import { storage } from '../utils/storage.js';
import { getSportConfig } from '../sports-terms.js';
import { confirmAction } from '../components/confirm-dialog.js';
import { toast } from '../components/toast.js';

let activeResizeHandler = null;

export async function renderLeagues(container) {
    const leagues = await leaguesDb.getAll();
    const activeLeagueId = storage.getActiveLeagueId();

    renderListView(container, leagues, activeLeagueId);
}

export async function renderLeagueDetail(container, params) {
    const leagueId = Number(params.id);
    if (leagueId) {
        await renderLeagueDetailView(container, leagueId, 'bracket');
    } else {
        await renderLeagues(container);
    }
}

function renderListView(container, leagues, activeLeagueId) {
    container.innerHTML = `
        <div class="leagues-header">
            <div>
                <h1>Gestión de Ligas</h1>
                <p class="text-sm text-muted" style="margin: 0.25rem 0 0 0;">Crea, activa o administra tus torneos y brackets deportivos</p>
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
                ${leagues.map(league => renderLeagueCard(league, Number(activeLeagueId) === Number(league.id))).join('')}
            </div>
        `}
    `;

    setupListEventListeners(container);
}

function renderLeagueCard(league, isActive) {
    const sport = getSportConfig(league.sport) || { icon: '🏆', name: league.sport || 'Deporte' };
    const modeLabel = league.mode === 'eliminacion' 
        ? `Eliminación Directa (${league.bracketTeamsCount || 8} equipos)` 
        : league.mode === 'doble-eliminacion'
            ? `Doble Eliminación (${league.bracketTeamsCount || 8} equipos)`
            : `Liga Regular (${league.rounds || 1} vuelta/s)`;

    return `
        <div class="league-card ${isActive ? 'is-active' : ''}">
            ${isActive ? '<span class="league-badge-active">ACTIVA</span>' : ''}
            <div>
                <div class="text-xs text-primary font-bold uppercase tracking-wider mb-1">
                    ${sport.icon} ${sport.name}
                </div>
                <h3 class="text-xl font-bold mb-1">${league.name}</h3>
                <p class="text-xs text-muted mb-2">Temporada: <strong>${league.season || 'N/A'}</strong> | ${modeLabel}</p>
                ${league.description ? `<p class="text-sm text-secondary mb-3">${league.description}</p>` : ''}
            </div>

            <div class="league-actions">
                <button class="btn btn-sm btn-primary btn-manage" data-id="${league.id}">⚙️ Administrar</button>
                ${!isActive ? `<button class="btn btn-sm btn-secondary btn-activate" data-id="${league.id}">Activar</button>` : ''}
                <button class="btn btn-sm btn-secondary btn-edit" data-id="${league.id}">Editar</button>
                <button class="btn btn-sm btn-secondary btn-export" data-id="${league.id}">Exportar</button>
                <button class="btn btn-sm btn-danger btn-delete" data-id="${league.id}">Eliminar</button>
            </div>
        </div>
    `;
}

function setupListEventListeners(container) {
    const goForm = () => renderFormView(container);
    container.querySelector('#btnNewLeague')?.addEventListener('click', goForm);
    container.querySelector('#btnNewLeagueEmpty')?.addEventListener('click', goForm);

    container.addEventListener('click', async (e) => {
        const targetBtn = e.target.closest('button');
        if (!targetBtn || !targetBtn.dataset.id) return;

        const id = Number(targetBtn.dataset.id);
        if (!id) return;

        if (targetBtn.classList.contains('btn-manage')) {
            renderLeagueDetailView(container, id);
        } else if (targetBtn.classList.contains('btn-activate')) {
            storage.setActiveLeagueId(id);
            await transactions.activateLeague(id);
            renderLeagues(container);
        } else if (targetBtn.classList.contains('btn-edit')) {
            const league = await leaguesDb.getById(id);
            if (league) renderFormView(container, league);
        } else if (targetBtn.classList.contains('btn-delete')) {
            const confirmed = await confirmAction('Eliminar Liga', '¿Estás seguro de eliminar esta liga? Se borrarán todos sus equipos, jugadores y partidos asociados.', { confirmText: 'Sí, eliminar' });
            if (confirmed) {
                try {
                    await transactions.deleteLeagueCascade(id);
                    if (Number(storage.getActiveLeagueId()) === id) {
                        storage.setActiveLeagueId(null);
                    }
                    toast.success('Liga eliminada');
                    renderLeagues(container);
                } catch (err) {
                    toast.error('Error al eliminar la liga: ' + (err.message || err));
                }
            }
        } else if (targetBtn.classList.contains('btn-export')) {
            await exportLeagueJson(id);
        }
    });

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
            toast.success('¡Liga importada con éxito!');
            renderLeagues(container);
        } catch (err) {
            toast.error('Error al importar la liga: ' + (err.message || 'Archivo JSON no válido'));
        } finally {
            e.target.value = '';
        }
    });
}

/**
 * Vista de Administración y Detalle de Liga (Inscripciones + Bracket / Partidos)
 */
async function renderLeagueDetailView(container, leagueId, activeTab = 'bracket') {
    const league = await leaguesDb.getById(leagueId);
    if (!league) {
        renderLeagues(container);
        return;
    }

    const sport = getSportConfig(league.sport) || { icon: '🏆', name: league.sport || 'Deporte' };
    const teams = await teamsDb.getByLeague(leagueId);
    const matches = await matchesDb.getByLeague(leagueId);

    const isElimination = league.mode === 'eliminacion' || league.mode === 'doble-eliminacion';
    const modeLabel = league.mode === 'eliminacion' ? 'Eliminación Directa' : (league.mode === 'doble-eliminacion' ? 'Doble Eliminación' : 'Liga Regular');

    container.innerHTML = `
        <div class="league-detail-header">
            <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                    <span class="dashboard-badge">${sport.icon} ${sport.name}</span>
                    <span style="font-size: 0.8rem; color: var(--color-text-muted);">${modeLabel}</span>
                </div>
                <h1 style="margin: 0; font-size: 1.75rem; color: var(--color-text-primary);">${league.name}</h1>
                <p class="text-sm text-muted" style="margin: 0.25rem 0 0 0;">Temporada: ${league.season || 'N/A'}</p>
            </div>
            <button id="btnBackToLeagues" class="btn btn-secondary text-sm">&larr; Volver a Ligas</button>
        </div>

        <div class="league-nav-tabs">
            <button class="tab-btn ${activeTab === 'bracket' ? 'active' : ''}" id="tabBracketBtn">
                ${isElimination ? '🏆 Cuadro de Eliminación' : '📅 Partidos'}
            </button>
            <button class="tab-btn ${activeTab === 'entries' ? 'active' : ''}" id="tabEntriesBtn">
                🛡️ Inscripciones (${teams.length})
            </button>
        </div>

        <div id="leagueTabContent"></div>
    `;

    container.querySelector('#btnBackToLeagues').addEventListener('click', () => {
        if (activeResizeHandler) {
            window.removeEventListener('resize', activeResizeHandler);
            activeResizeHandler = null;
        }
        renderLeagues(container);
    });

    const tabContent = container.querySelector('#leagueTabContent');
    const tabBracketBtn = container.querySelector('#tabBracketBtn');
    const tabEntriesBtn = container.querySelector('#tabEntriesBtn');

    const refreshBracket = () => renderLeagueDetailView(container, leagueId, 'bracket');
    const refreshEntries = () => renderLeagueDetailView(container, leagueId, 'entries');

    tabBracketBtn.addEventListener('click', () => {
        tabBracketBtn.classList.add('active');
        tabEntriesBtn.classList.remove('active');
        if (isElimination) {
            renderBracketTab(tabContent, league, teams, matches, refreshBracket);
        } else {
            renderLeagueMatchesTab(tabContent, league, teams, matches, refreshBracket);
        }
    });

    tabEntriesBtn.addEventListener('click', () => {
        tabEntriesBtn.classList.add('active');
        tabBracketBtn.classList.remove('active');
        renderEntriesTab(tabContent, league, teams, refreshEntries);
    });

    if (activeTab === 'entries') {
        renderEntriesTab(tabContent, league, teams, refreshEntries);
    } else if (isElimination) {
        renderBracketTab(tabContent, league, teams, matches, refreshBracket);
    } else {
        renderLeagueMatchesTab(tabContent, league, teams, matches, refreshBracket);
    }
}

/**
 * Pestaña de Inscripciones
 */
async function renderEntriesTab(container, league, enrolledTeams, refreshTab) {
    container.innerHTML = `
        <div class="entries-table-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
                <div>
                    <h3 style="margin: 0; color: var(--color-text-primary);">Equipos Inscriptos en ${league.name}</h3>
                    <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: var(--color-text-muted);">
                        Total: <strong>${enrolledTeams.length}</strong> / ${league.bracketTeamsCount ? league.bracketTeamsCount + ' requeridos para el cuadro' : 'sin límite'}
                    </p>
                </div>
                <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                    ${league.mode === 'liga' ? `<button id="btnGenerateFixtureEntries" class="btn btn-secondary text-sm">Generar Fixture</button>` : ''}
                    <button id="btnEnrollTeam" class="btn btn-primary text-sm">+ Inscribir Nuevo Equipo</button>
                </div>
            </div>

            ${enrolledTeams.length === 0 ? `
                <p class="text-muted" style="text-align: center; padding: 2rem;">No hay equipos inscriptos en esta liga aún. ¡Haz clic en "+ Inscribir Nuevo Equipo" para agregar!</p>
            ` : `
                <table class="dashboard-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Nombre del Equipo</th>
                            <th>Ciudad</th>
                            <th>Fecha de Registro</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${enrolledTeams.map((t, idx) => `
                            <tr>
                                <td><strong>${idx + 1}</strong></td>
                                <td><strong style="color: var(--color-text-primary);">${t.name}</strong></td>
                                <td>${t.city || 'Sin ciudad'}</td>
                                <td style="font-size: 0.8rem; color: var(--color-text-muted);">${t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A'}</td>
                                <td>
                                    <a href="#team/${t.id}" class="btn btn-sm btn-secondary">Ver Perfil</a>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `}
        </div>
    `;

    container.querySelector('#btnEnrollTeam').addEventListener('click', () => {
        const enrolledIds = new Set(enrolledTeams.map(t => Number(t.id)));
        showEnrollTeamModal(league.id, league.sport, enrolledIds, refreshTab);
    });

    container.querySelector('#btnGenerateFixtureEntries')?.addEventListener('click', () => {
        handleGenerateFixture(league, refreshTab);
    });
}

/**
 * Genera el fixture round-robin (todos contra todos) de una liga regular.
 * Si ya existen partidos, pide confirmación y los reemplaza.
 * @param {object} league 
 * @param {Function} refresh 
 */
async function handleGenerateFixture(league, refresh) {
    if (league.mode !== 'liga') return;

    const teams = await teamsDb.getByLeague(league.id);
    if (teams.length < 2) {
        toast.error('Inscribe al menos 2 equipos para generar el fixture.');
        return;
    }

    const doubleRound = Number(league.rounds) === 2;
    const existing = await matchesDb.getByLeague(league.id);

    if (existing.length) {
        const confirmed = await confirmAction(
            'Reemplazar fixture',
            `La liga ya tiene ${existing.length} partido(s). Se eliminarán todos y se generará un nuevo calendario (${doubleRound ? 'ida y vuelta' : 'vuelta única'}). ¿Continuar?`,
            { confirmText: 'Sí, regenerar' }
        );
        if (!confirmed) return;
    }

    try {
        for (const m of existing) {
            const evs = await getEventsByMatch(m.id);
            for (const ev of evs) await eventsDb.delete(ev.id);
            await matchesDb.delete(m.id);
        }

        const generated = fixtureService.generateFixture(
            league.id,
            teams.map(t => Number(t.id)),
            doubleRound,
            null
        );

        if (!generated.length) {
            toast.error('No se pudo generar el fixture.');
            return;
        }

        await transactions.saveMatchesList(generated);

        const jornadas = new Set(generated.map(g => g.round)).size;
        toast.success(`Fixture generado: ${generated.length} partidos en ${jornadas} jornada(s).`);
        refresh();
    } catch (err) {
        console.error('Error al generar el fixture:', err);
        toast.error('Error al generar el fixture: ' + (err.message || 'desconocido'));
    }
}

/**
 * Pestaña de Partidos (Liga Regular)
 */
function renderLeagueMatchesTab(container, league, teams, matches, refreshTab) {
    const teamMap = new Map(teams.map(t => [Number(t.id), t.name]));
    const statusColor = { 'Finalizado': '#10b981', 'En Juego': '#f59e0b', 'Programado': '#3b82f6' };

    const grouped = {};
    matches.forEach(m => {
        const key = m.round ? `Jornada ${m.round}` : 'Partidos';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(m);
    });

    container.innerHTML = `
        <div class="glass-panel" style="padding: 1.5rem; border-radius: 14px; background: var(--color-bg-card);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
                <h3 style="margin: 0; color: var(--color-text-primary);">📅 Calendario de Partidos</h3>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${league.mode === 'liga' ? `<button id="btnGenerateFixture" class="btn btn-secondary btn-sm">Generar Fixture</button>` : ''}
                    <button id="btnAddLeagueMatch" class="btn btn-primary btn-sm">+ Programar Partido</button>
                </div>
            </div>

            ${matches.length === 0 ? `
                <p class="text-muted" style="text-align: center; padding: 2rem;">No hay partidos programados aún. Usa "Generar Fixture" para crear automáticamente el calendario del todos contra todos, o agrégalos manualmente.</p>
            ` : Object.entries(grouped).map(([groupTitle, groupMatches]) => `
                <div style="margin-bottom: 1.5rem;">
                    <div style="font-size: 0.78rem; font-weight: 700; color: #60a5fa; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.75rem; padding-bottom: 0.35rem; border-bottom: 1px solid rgba(96,165,250,0.25);">${groupTitle}</div>
                    <div style="display: flex; flex-direction: column; gap: 0.6rem;">
                        ${groupMatches.map(m => {
                            const home = teamMap.get(Number(m.homeTeamId)) || 'Por definir';
                            const away = teamMap.get(Number(m.awayTeamId)) || 'Por definir';
                            const hs = m.score?.home ?? m.homeScore ?? 0;
                            const as = m.score?.away ?? m.awayScore ?? 0;
                            const fin = m.status === 'Finalizado';
                            return `
                                <div class="league-match-row" data-match-id="${m.id}" style="display: flex; align-items: center; justify-content: space-between; background: var(--color-bg-solid-deep); border: 1px solid var(--color-border); border-radius: 10px; padding: 0.75rem 1rem; cursor: pointer; transition: all 0.2s;">
                                    <div style="flex: 1; text-align: right; font-weight: 600; color: var(--color-text-primary); font-size: 0.95rem;">${home}</div>
                                    <div style="min-width: 90px; text-align: center;">
                                        ${fin
                                            ? `<span style="font-size: 1.15rem; font-weight: 800; color: var(--color-text-primary);">${hs} – ${as}</span>`
                                            : `<span style="font-size: 0.85rem; font-weight: 700; color: #3b82f6;">VS</span>`
                                        }
                                        <div style="font-size: 0.7rem; color: ${statusColor[m.status] || '#94a3b8'}; margin-top: 0.2rem; font-weight: 700;">${m.status || 'Programado'}</div>
                                    </div>
                                    <div style="flex: 1; font-weight: 600; color: var(--color-text-primary); font-size: 0.95rem;">${away}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    container.querySelectorAll('.league-match-row').forEach(row => {
        row.addEventListener('mouseenter', () => { row.style.borderColor = '#3b82f6'; row.style.transform = 'translateX(2px)'; });
        row.addEventListener('mouseleave', () => { row.style.borderColor = 'var(--color-border)'; row.style.transform = ''; });
        row.addEventListener('click', () => {
            const matchId = Number(row.dataset.matchId);
            if (matchId) window.location.hash = `match-detail/${matchId}`;
        });
    });

    container.querySelector('#btnAddLeagueMatch')?.addEventListener('click', () => {
        showAddMatchModal(league.id, teams, refreshTab);
    });

    container.querySelector('#btnGenerateFixture')?.addEventListener('click', () => {
        handleGenerateFixture(league, refreshTab);
    });
}

/**
 * Modal para programar partido
 */
function showAddMatchModal(leagueId, teams, onSuccess) {
    let overlay = document.getElementById('add-match-modal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'add-match-modal';
        overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--color-bg-overlay); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000;`;
        document.body.appendChild(overlay);
    }

    const teamOptions = teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    overlay.style.display = 'flex';
    overlay.innerHTML = `
        <div class="glass-panel" style="width: 100%; max-width: 460px; padding: 1.75rem; border-radius: 14px; background: var(--color-bg-modal); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <h3 style="margin-top:0; text-align:center; color:var(--color-text-primary);">Programar Partido</h3>
            <form id="formAddMatch">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
                    <div>
                        <label style="display:block; font-size:0.82rem; color:var(--color-text-muted); margin-bottom:0.25rem;">Local *</label>
                        <select id="addMatchHome" class="form-control" required style="width:100%;">
                            <option value="">Seleccionar...</option>${teamOptions}
                        </select>
                    </div>
                    <div>
                        <label style="display:block; font-size:0.82rem; color:var(--color-text-muted); margin-bottom:0.25rem;">Visitante *</label>
                        <select id="addMatchAway" class="form-control" required style="width:100%;">
                            <option value="">Seleccionar...</option>${teamOptions}
                        </select>
                    </div>
                </div>
                <div style="margin-bottom:1rem;">
                    <label style="display:block; font-size:0.82rem; color:var(--color-text-muted); margin-bottom:0.25rem;">Fecha y Hora</label>
                    <input type="datetime-local" id="addMatchDate" class="form-control" style="width:100%; box-sizing:border-box;" />
                </div>
                <div style="margin-bottom:1.25rem;">
                    <label style="display:block; font-size:0.82rem; color:var(--color-text-muted); margin-bottom:0.25rem;">Jornada / Ronda (Opcional)</label>
                    <input type="text" id="addMatchRound" class="form-control" placeholder="Ej. 1" maxlength="20" style="width:100%; box-sizing:border-box;" />
                </div>
                <div style="display:flex; gap:0.75rem; justify-content:flex-end;">
                    <button type="button" id="btnCancelAddMatch" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar Partido</button>
                </div>
            </form>
        </div>
    `;

    const closeModal = () => { overlay.remove(); };
    overlay.querySelector('#btnCancelAddMatch').addEventListener('click', closeModal);
    overlay.querySelector('#formAddMatch').addEventListener('submit', async (e) => {
        e.preventDefault();
        const homeId = Number(overlay.querySelector('#addMatchHome').value);
        const awayId = Number(overlay.querySelector('#addMatchAway').value);
        if (!homeId || !awayId) { toast.error('Selecciona ambos equipos.'); return; }
        if (homeId === awayId) { toast.error('Un equipo no puede jugar contra sí mismo.'); return; }
        const date = overlay.querySelector('#addMatchDate').value;
        const round = overlay.querySelector('#addMatchRound').value.trim();
        try {
            await matchesDb.create({ leagueId, homeTeamId: homeId, awayTeamId: awayId, date: date || null, status: 'Programado', round: round || null });
            closeModal();
            if (typeof onSuccess === 'function') onSuccess();
        } catch (err) { toast.error('Error al guardar partido: ' + err.message); }
    });
}

/**
 * Modal para inscribir equipos
 */
async function showEnrollTeamModal(leagueId, leagueSport, enrolledIds, onSuccess) {
    let overlay = document.getElementById('enroll-team-modal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'enroll-team-modal';
        overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--color-bg-overlay); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000;`;
        document.body.appendChild(overlay);
    }

    const allTeams = await getAllTeams();
    const availableTeams = allTeams.filter(t => !enrolledIds.has(Number(t.id)));
    const availableOptions = availableTeams.length > 0
        ? availableTeams.map(t => `<option value="existing:${t.id}">${t.name}${t.city ? ' — ' + t.city : ''}</option>`).join('')
        : '';

    overlay.style.display = 'flex';
    overlay.innerHTML = `
        <div class="glass-panel" style="width: 100%; max-width: 480px; padding: 1.75rem; border-radius: 14px; background: var(--color-bg-modal); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <h2 style="margin-top:0; margin-bottom:0.25rem; text-align:center; color:var(--color-text-primary);">Inscribir Equipo</h2>
            <p style="text-align:center; font-size:0.82rem; color:var(--color-text-muted); margin-top:0; margin-bottom:1.25rem;">Selecciona un equipo existente o crea uno nuevo</p>

            <div style="display:flex; gap:0.5rem; margin-bottom:1.25rem;">
                <button id="tabPickTeam" class="tab-btn active" style="flex:1;">Equipo Existente</button>
                <button id="tabNewTeam" class="tab-btn" style="flex:1;">Crear Nuevo</button>
            </div>

            <div id="panelPickTeam">
                ${availableTeams.length === 0
                    ? `<p class="text-muted" style="text-align:center; padding:1rem;">No hay equipos disponibles para inscribir. Crea uno nuevo.</p>`
                    : `<div style="margin-bottom:1rem;">
                        <label style="display:block; font-size:0.82rem; color:var(--color-text-muted); margin-bottom:0.25rem;">Seleccionar Equipo</label>
                        <select id="selectExistingTeam" class="form-control" style="width:100%;">
                            <option value="">-- Elige un equipo --</option>
                            ${availableOptions}
                        </select>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
                        <button id="btnCancelEnroll" class="btn btn-secondary">Cancelar</button>
                        <button id="btnEnrollExisting" class="btn btn-primary">Inscribir</button>
                    </div>`
                }
            </div>

            <div id="panelNewTeam" style="display:none;">
                <form id="formEnrollTeam">
                    <div style="margin-bottom:1rem;">
                        <label style="display:block; font-size:0.82rem; color:var(--color-text-muted); margin-bottom:0.25rem;">Nombre del Equipo *</label>
                        <input type="text" id="enrollTeamName" class="form-control" required placeholder="Ej. Real Madrid FC" maxlength="60" style="width:100%; box-sizing:border-box;" />
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block; font-size:0.82rem; color:var(--color-text-muted); margin-bottom:0.25rem;">Ciudad / Sede</label>
                        <input type="text" id="enrollTeamCity" class="form-control" placeholder="Ej. Madrid" maxlength="60" style="width:100%; box-sizing:border-box;" />
                    </div>
                    <div style="display:flex; gap:0.75rem; justify-content:flex-end;">
                        <button type="button" id="btnCancelNewTeam" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Crear e Inscribir</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const closeModal = () => { overlay.remove(); };
    const panelPick = overlay.querySelector('#panelPickTeam');
    const panelNew = overlay.querySelector('#panelNewTeam');
    const tabPick = overlay.querySelector('#tabPickTeam');
    const tabNew = overlay.querySelector('#tabNewTeam');

    tabPick?.addEventListener('click', () => { panelPick.style.display=''; panelNew.style.display='none'; tabPick.classList.add('active'); tabNew.classList.remove('active'); });
    tabNew?.addEventListener('click', () => { panelNew.style.display=''; panelPick.style.display='none'; tabNew.classList.add('active'); tabPick.classList.remove('active'); });

    overlay.querySelector('#btnCancelEnroll')?.addEventListener('click', closeModal);
    overlay.querySelector('#btnCancelNewTeam')?.addEventListener('click', closeModal);

    overlay.querySelector('#btnEnrollExisting')?.addEventListener('click', async () => {
        const select = overlay.querySelector('#selectExistingTeam');
        const val = select?.value;
        if (!val) { toast.warning('Selecciona un equipo.'); return; }
        const teamId = Number(val.replace('existing:', ''));
        try {
            const team = await teamsDb.getById(teamId);
            if (team) {
                const updateFn = updateTeam || teamsDb.update;
                await updateFn(teamId, { ...team, leagueId: Number(leagueId) });
            }
            toast.success('Equipo inscrito con éxito');
            closeModal();
            if (typeof onSuccess === 'function') onSuccess();
        } catch (err) { toast.error('Error al inscribir equipo: ' + err.message); }
    });

    overlay.querySelector('#formEnrollTeam')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = overlay.querySelector('#enrollTeamName').value.trim();
        const city = overlay.querySelector('#enrollTeamCity').value.trim();
        try {
            await createTeam({ leagueId: Number(leagueId), name, city });
            toast.success('Equipo creado con éxito');
            closeModal();
            if (typeof onSuccess === 'function') onSuccess();
        } catch (err) { toast.error(`Error al crear equipo: ${err.message}`); }
    });
}

/**
 * Pestaña del Bracket de Eliminación
 */
export function renderBracketTab(container, league, teams, matches, refreshTab) {
    const teamMap = new Map(teams.map(t => [Number(t.id), t]));

    if (matches.length === 0) {
        const requiredCount = Number(league.bracketTeamsCount) || 8;
        const currentCount = teams.length;
        const canGenerate = currentCount >= requiredCount;

        container.innerHTML = `
            <div class="glass-panel text-center" style="padding: 2.5rem 1.5rem; border-radius: 14px;">
                <h3 style="margin-top: 0; color: var(--color-text-primary);">Cuadro de Eliminación no generado</h3>
                <p class="text-secondary mb-4">
                    Equipos inscriptos: <strong>${currentCount}</strong> / ${requiredCount} requeridos.
                </p>
                <button id="btnGenerateBracket" class="btn btn-primary" ${!canGenerate ? 'disabled' : ''}>
                    ⚡ Generar Cuadro (${requiredCount} Equipos)
                </button>
                ${!canGenerate ? `<p class="text-xs text-muted" style="margin-top: 0.5rem;">Inscribe al menos ${requiredCount} equipos en la pestaña 'Inscripciones' para habilitar.</p>` : ''}
            </div>
        `;

        if (canGenerate) {
            container.querySelector('#btnGenerateBracket').addEventListener('click', async () => {
                try {
                    const teamIds = teams.slice(0, requiredCount).map(t => Number(t.id));
                    await bracketService.generateBracket(league.id, teamIds);
                    refreshTab();
                } catch (err) {
                    toast.error(`Error al generar cuadro: ${err.message}`);
                }
            });
        }
        return;
    }

    const ROUND_ORDER = [
        'Octavos Ganadores', 'Cuartos Ganadores', 'Semifinal Ganadores',
        'Ronda 1 Perdedores', 'Ronda 2 Perdedores', 'Ronda 3 Perdedores', 'Ronda 4 Perdedores', 'Ronda 5 Perdedores',
        'Final Ganadores', 'Final Perdedores', 'Gran Final',
        'Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Final'
    ];
    
    const roundMap = new Map();
    matches.forEach(m => {
        const rName = m.round || 'Cuadro';
        if (!roundMap.has(rName)) roundMap.set(rName, []);
        roundMap.get(rName).push(m);
    });

    const rounds = Array.from(roundMap.entries()).sort(([a], [b]) => {
        const ai = ROUND_ORDER.indexOf(a);
        const bi = ROUND_ORDER.indexOf(b);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    });

    container.innerHTML = `
        <div class="glass-panel" style="padding: 1.5rem; border-radius: 14px; background: var(--color-bg-card);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                <h3 style="margin: 0; color: var(--color-text-primary);">🏆 Cuadro Torneo de Eliminación</h3>
                <span class="text-muted" style="font-size: 0.8rem;">Haz clic en un partido como Administrador para ingresar resultados &rarr;</span>
            </div>

            <div class="bracket-wrapper">
                ${rounds.map(([roundTitle, roundMatches]) => `
                    <div class="bracket-round">
                        <div class="bracket-round-header">${roundTitle}</div>
                        ${roundMatches.map(m => renderBracketMatchCard(m, teamMap, matches)).join('')}
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Limpieza y dibujo de conectores de las llaves
    if (activeResizeHandler) {
        window.removeEventListener('resize', activeResizeHandler);
    }

    setTimeout(() => {
        drawBracketLines(container, matches);
    }, 100);

    activeResizeHandler = () => drawBracketLines(container, matches);
    window.addEventListener('resize', activeResizeHandler);

    container.querySelectorAll('.bracket-match-card').forEach(card => {
        card.addEventListener('click', () => {
            const matchId = Number(card.dataset.matchId);
            if (matchId) window.location.hash = `match-detail/${matchId}`;
        });
    });
}

function drawBracketLines(container, matches) {
    const wrapper = container.querySelector('.bracket-wrapper');
    if (!wrapper) return;

    let svg = wrapper.querySelector('.bracket-svg');
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'bracket-svg');
        svg.style.cssText = 'position: absolute; top: 0; left: 0; pointer-events: none; z-index: 1;';
        wrapper.appendChild(svg);
    } else {
        svg.innerHTML = '';
    }

    svg.setAttribute('width', wrapper.scrollWidth);
    svg.setAttribute('height', wrapper.scrollHeight);

    const cards = wrapper.querySelectorAll('.bracket-match-card');
    const cardMap = new Map();
    cards.forEach(card => {
        cardMap.set(Number(card.dataset.matchId), card);
    });

    const wrapperRect = wrapper.getBoundingClientRect();

    cards.forEach(card => {
        const matchId = Number(card.dataset.matchId);
        const match = matches.find(m => Number(m.id) === matchId);
        if (!match || !match.nextMatchId) return;

        const nextCard = cardMap.get(Number(match.nextMatchId));
        if (!nextCard) return;

        const rect1 = card.getBoundingClientRect();
        const rect2 = nextCard.getBoundingClientRect();

        const x1 = rect1.right - wrapperRect.left + wrapper.scrollLeft;
        const y1 = rect1.top - wrapperRect.top + rect1.height / 2 + wrapper.scrollTop;

        const x2 = rect2.left - wrapperRect.left + wrapper.scrollLeft;
        const y2 = rect2.top - wrapperRect.top + rect2.height / 2 + wrapper.scrollTop;

        const xMid = x1 + (x2 - x1) / 2;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M ${x1} ${y1} H ${xMid} V ${y2} H ${x2}`;
        path.setAttribute('d', d);

        const isWinner = match.status === 'Finalizado' && match.winnerId;
        const strokeColor = isWinner ? '#60a5fa' : 'rgba(255, 255, 255, 0.15)';
        const strokeWidth = isWinner ? '3' : '2';

        path.setAttribute('stroke', strokeColor);
        path.setAttribute('stroke-width', strokeWidth);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        if (isWinner) {
            path.setAttribute('style', 'filter: drop-shadow(0 0 3px rgba(96, 165, 250, 0.5)); transition: stroke 0.3s;');
        }
        svg.appendChild(path);
    });
}

function renderBracketMatchCard(match, teamMap, matches) {
    let homeName = 'Por definir';
    let awayName = 'Por definir';

    if (match.homeTeamId) {
        homeName = teamMap.get(Number(match.homeTeamId))?.name || 'Equipo';
    } else {
        const sourceMatch = matches.find(m => Number(m.nextMatchId) === Number(match.id) && m.nextMatchHomeSlot === true);
        if (sourceMatch) homeName = `Ganador P.${sourceMatch.id}`;
    }

    if (match.awayTeamId) {
        awayName = teamMap.get(Number(match.awayTeamId))?.name || 'Equipo';
    } else {
        const sourceMatch = matches.find(m => Number(m.nextMatchId) === Number(match.id) && m.nextMatchHomeSlot === false);
        if (sourceMatch) awayName = `Ganador P.${sourceMatch.id}`;
    }

    const isFinalized = match.status === 'Finalizado';
    const homeWinner = isFinalized && match.winnerId && Number(match.winnerId) === Number(match.homeTeamId);
    const awayWinner = isFinalized && match.winnerId && Number(match.winnerId) === Number(match.awayTeamId);

    const hScore = match.score?.home ?? match.homeScore ?? 0;
    const aScore = match.score?.away ?? match.awayScore ?? 0;

    const homeTeamObj = match.homeTeamId ? teamMap.get(Number(match.homeTeamId)) : null;
    const awayTeamObj = match.awayTeamId ? teamMap.get(Number(match.awayTeamId)) : null;
    const homeAvatar = homeTeamObj?.logo || (match.homeTeamId ? homeName.substring(0, 2).toUpperCase() : '?');
    const awayAvatar = awayTeamObj?.logo || (match.awayTeamId ? awayName.substring(0, 2).toUpperCase() : '?');

    return `
        <div class="bracket-match-card" data-match-id="${match.id}">
            <div class="bracket-card-header">
                <span>Partido #${match.id}</span>
                <span class="status-badge status-${(match.status || 'Programado').toLowerCase().replace(/\s+/g, '-')}">${match.status || 'Programado'}</span>
            </div>

            <div class="bracket-team-row ${homeWinner ? 'winner' : ''} ${!match.homeTeamId ? 'placeholder-team' : ''}">
                <div class="team-info">
                    ${homeTeamObj?.logo
                        ? `<img class="team-avatar-img" src="${homeTeamObj.logo}" alt="${homeName}" />`
                        : `<div class="team-avatar">${homeAvatar}</div>`
                    }
                    <span class="team-name" title="${homeName}">${homeName}</span>
                </div>
                <span class="bracket-score-pill">${isFinalized ? hScore : '-'}</span>
            </div>

            <div class="bracket-team-row ${awayWinner ? 'winner' : ''} ${!match.awayTeamId ? 'placeholder-team' : ''}" style="margin-top: 0.35rem;">
                <div class="team-info">
                    ${awayTeamObj?.logo
                        ? `<img class="team-avatar-img" src="${awayTeamObj.logo}" alt="${awayName}" />`
                        : `<div class="team-avatar">${awayAvatar}</div>`
                    }
                    <span class="team-name" title="${awayName}">${awayName}</span>
                </div>
                <span class="bracket-score-pill">${isFinalized ? aScore : '-'}</span>
            </div>
        </div>
    `;
}

/**
 * Modal Admin para actualizar resultados y equipos
 */
function showAdminMatchEditModal(match, teamMap, teams, onSuccess) {
    let overlay = document.getElementById('admin-match-modal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'admin-match-modal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: var(--color-bg-overlay); backdrop-filter: blur(4px);
            display: flex; justify-content: center; align-items: center; z-index: 1000;
        `;
        document.body.appendChild(overlay);
    }

    const hScore = match.score?.home ?? match.homeScore ?? 0;
    const aScore = match.score?.away ?? match.awayScore ?? 0;

    overlay.style.display = 'flex';
    overlay.innerHTML = `
        <div class="glass-panel" style="width: 100%; max-width: 440px; padding: 1.75rem; border-radius: 14px; background: var(--color-bg-modal); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <h3 style="margin-top: 0; margin-bottom: 0.25rem; text-align: center; color: var(--color-text-primary);">Editar Resultado y Equipos</h3>
            <p style="text-align: center; font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0; margin-bottom: 1.25rem;">Ronda: ${match.round || 'Eliminatoria'}</p>

            <form id="formAdminMatch">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem;">
                    <div style="flex: 1; text-align: center;">
                        <label style="display: block; font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 0.25rem;">Equipo Local</label>
                        <select id="matchHomeTeamSelect" class="form-control" style="width: 100%; box-sizing: border-box; margin-bottom: 0.5rem; background: var(--color-bg-solid-deep); color: var(--color-text-primary); border: 1px solid var(--color-border-strong); padding: 0.375rem; border-radius: 6px;">
                            <option value="">Por definir</option>
                            ${teams.map(t => `<option value="${t.id}" ${Number(t.id) === Number(match.homeTeamId) ? 'selected' : ''}>${t.name}</option>`).join('')}
                        </select>
                        <input type="number" id="matchHomeScore" class="form-control" min="0" value="${hScore}" style="width: 70px; text-align: center; margin: 0 auto;" />
                    </div>

                    <span style="font-weight: 800; font-size: 1.2rem; color: #64748b; margin-top: 1.25rem;">VS</span>

                    <div style="flex: 1; text-align: center;">
                        <label style="display: block; font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 0.25rem;">Equipo Visitante</label>
                        <select id="matchAwayTeamSelect" class="form-control" style="width: 100%; box-sizing: border-box; margin-bottom: 0.5rem; background: var(--color-bg-solid-deep); color: var(--color-text-primary); border: 1px solid var(--color-border-strong); padding: 0.375rem; border-radius: 6px;">
                            <option value="">Por definir</option>
                            ${teams.map(t => `<option value="${t.id}" ${Number(t.id) === Number(match.awayTeamId) ? 'selected' : ''}>${t.name}</option>`).join('')}
                        </select>
                        <input type="number" id="matchAwayScore" class="form-control" min="0" value="${aScore}" style="width: 70px; text-align: center; margin: 0 auto;" />
                    </div>
                </div>

                <div style="margin-bottom: 1.25rem;">
                    <label style="display: block; font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 0.25rem;">Estado del Partido</label>
                    <select id="matchStatusSelect" class="form-control" style="width: 100%; box-sizing: border-box;">
                        <option value="Programado" ${match.status === 'Programado' ? 'selected' : ''}>Programado</option>
                        <option value="En Juego" ${match.status === 'En Juego' ? 'selected' : ''}>En Juego</option>
                        <option value="Finalizado" ${match.status === 'Finalizado' ? 'selected' : ''}>Finalizado</option>
                    </select>
                </div>

                <div style="display: flex; gap: 0.75rem; justify-content: space-between; align-items: center;">
                    <a href="#match-detail/${match.id}" class="btn btn-secondary text-sm btn-close-modal-link">🔍 Ficha Completa</a>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" id="btnCancelMatchEdit" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                    </div>
                </div>
            </form>
        </div>
    `;

    const closeModal = () => { overlay.remove(); };
    overlay.querySelector('.btn-close-modal-link')?.addEventListener('click', closeModal);
    overlay.querySelector('#btnCancelMatchEdit').addEventListener('click', closeModal);

    overlay.querySelector('#formAdminMatch').addEventListener('submit', async (e) => {
        e.preventDefault();
        const homeScoreVal = Number(overlay.querySelector('#matchHomeScore').value);
        const awayScoreVal = Number(overlay.querySelector('#matchAwayScore').value);
        const statusVal = overlay.querySelector('#matchStatusSelect').value;

        const homeTeamSelect = overlay.querySelector('#matchHomeTeamSelect');
        const awayTeamSelect = overlay.querySelector('#matchAwayTeamSelect');
        const homeTeamIdVal = homeTeamSelect.value ? Number(homeTeamSelect.value) : null;
        const awayTeamIdVal = awayTeamSelect.value ? Number(awayTeamSelect.value) : null;

        try {
            await bracketService.updateMatchResult(
                match.id,
                homeScoreVal,
                awayScoreVal,
                statusVal,
                null,
                homeTeamIdVal,
                awayTeamIdVal
            );
            closeModal();
            if (typeof onSuccess === 'function') onSuccess();
        } catch (err) {
            toast.error(`Error al guardar resultado: ${err.message}`);
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
                <div class="form-grid-2col">
                    <div class="form-group">
                        <label class="label text-sm">Nombre de la Liga</label>
                        <input type="text" name="name" class="input" value="${leagueToEdit?.name || ''}" required placeholder="Ej. Liga Premier 2026" maxlength="60">
                    </div>

                    <div class="form-group">
                        <label class="label text-sm">Temporada</label>
                        <input type="text" name="season" class="input" value="${leagueToEdit?.season || ''}" required placeholder="Ej. Clausura 2026" maxlength="40">
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
                                <option value="doble-eliminacion">Doble Eliminación (Brackets)</option>
                            </select>
                        </div>

                        <div id="modeOptionsContainer" class="form-group col-span-2">
                            <label class="label text-sm">Número de Vueltas</label>
                            <select name="rounds" class="input">
                                <option value="1">1 Vuelta</option>
                                <option value="2">2 Vueltas (Ida y Vuelta)</option>
                            </select>
                            <small class="text-xs text-muted">El fixture se genera con el botón "Generar Fixture" desde la liga, una vez inscritos los equipos.</small>
                        </div>
                    ` : ''}

                    <div class="form-group col-span-2">
                        <label class="label text-sm">Descripción (Opcional)</label>
                        <textarea name="description" class="input" rows="2" maxlength="300" placeholder="Notas sobre el torneo...">${leagueToEdit?.description || ''}</textarea>
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
                    <button type="button" id="btnCancelForm" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Guardar Cambios' : 'Crear Liga'}</button>
                </div>
            </form>
        </div>
    `;

    const modeSelect = container.querySelector('#leagueModeSelect');
    const optionsContainer = container.querySelector('#modeOptionsContainer');

    modeSelect?.addEventListener('change', (e) => {
        if (e.target.value === 'eliminacion' || e.target.value === 'doble-eliminacion') {
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
                <small class="text-xs text-muted">El fixture se genera con el botón "Generar Fixture" desde la liga, una vez inscritos los equipos.</small>
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

        if (data.rounds) data.rounds = Number(data.rounds);
        if (data.bracketTeamsCount) data.bracketTeamsCount = Number(data.bracketTeamsCount);

        if (isEdit) {
            await leaguesDb.update(leagueToEdit.id, data);
        } else {
            const newId = await leaguesDb.create(data);
            const allLeagues = await leaguesDb.getAll();
            if (allLeagues.length === 1) {
                storage.setActiveLeagueId(newId);
                await transactions.activateLeague(newId);
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
        const teamPlayers = playersDb.getByTeam ? await playersDb.getByTeam(team.id) : await getPlayersByTeam(team.id);
        players = players.concat(teamPlayers || []);
    }

    let events = [];
    for (const match of matches) {
        const matchEvents = eventsDb.getByMatch ? await eventsDb.getByMatch(match.id) : await getEventsByMatch(match.id);
        events = events.concat(matchEvents || []);
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