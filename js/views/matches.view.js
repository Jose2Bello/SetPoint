// js/views/matches.view.js
import { getActiveLeague } from '../db/leagues.db.js';
import { getTeamsByLeague } from '../db/teams.db.js';
import { getAllMatches, createMatch, updateMatch } from '../db/matches.db.js';
import { getPlayersByTeam } from '../db/players.db.js';
import { getEventsByMatch, createMatchEvent, deleteMatchEvent } from '../db/events.db.js';
import { finalizeMatch, undoMatch } from '../db/transactions.js';
import { getSportConfig } from '../sports-terms.js';
import { toast } from '../components/toast.js';
import { confirmAction } from '../components/confirm-dialog.js';

export async function renderMatches(container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 200px; color: var(--color-text-muted); font-size: 0.9rem;">
            Cargando partidos...
        </div>`;

    const activeLeague = await getActiveLeague();
    if (!activeLeague) {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 1.5rem; gap: 1rem; text-align: center;">
                <div style="font-size: 3rem; opacity: 0.4;">🏟️</div>
                <h2 style="margin: 0; color: var(--color-text-primary); font-size: 1.4rem;">No hay liga activa</h2>
                <p style="margin: 0; color: var(--color-text-muted);">Selecciona o crea una liga para ver sus partidos.</p>
                <a href="#leagues" class="btn btn-primary" style="margin-top: 0.5rem;">Ir a Ligas</a>
            </div>`;
        return;
    }

    const teams = await getTeamsByLeague(activeLeague.id);
    const matches = await getAllMatches(activeLeague.id);

    render(container, activeLeague, teams, matches);
}

function render(container, activeLeague, teams, matches) {
    const sportConfig = getSportConfig(activeLeague.sport);
    const teamMap = new Map(teams.map(t => [Number(t.id), t]));
    const isLeagueMode = activeLeague.mode === 'liga' || activeLeague.modality === 'league';

    const statusColors = {
        'Finalizado': { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', text: '#10b981' },
        'finished':   { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', text: '#10b981' },
        'En Juego':   { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.4)',  text: '#f59e0b' },
        'in_progress':{ bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.4)',  text: '#f59e0b' },
        'Programado': { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  text: '#3b82f6' },
        'scheduled':  { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)',  text: '#3b82f6' },
    };
    const getStatus = (s) => statusColors[s] || statusColors['Programado'];
    const statusLabel = (s) => {
        if (s === 'Finalizado' || s === 'finished') return 'Finalizado';
        if (s === 'En Juego' || s === 'in_progress') return 'En Juego';
        return 'Programado';
    };

    const isInfraction = (type) => {
        if (!type) return false;
        const lower = String(type).toLowerCase();
        return lower.includes('tarjeta') || lower.includes('falta') || lower.includes('amarilla') || lower.includes('roja') || lower.includes('técnica') || lower.includes('expulsi');
    };

    const total = matches.length;
    const finished = matches.filter(m => m.status === 'Finalizado' || m.status === 'finished').length;
    const scheduled = matches.filter(m => m.status === 'Programado' || m.status === 'scheduled').length;

    container.innerHTML = `
        <div class="matches-view-wrapper" style="display: flex; flex-direction: column; gap: 1.5rem;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h1 style="margin: 0 0 0.25rem 0; color: var(--color-text-primary); font-size: 1.6rem; font-weight: 800;">Calendario de Partidos</h1>
                    <p style="margin: 0; color: var(--color-text-muted); font-size: 0.875rem;">
                        Liga activa: <strong style="color: #60a5fa;">${activeLeague.name}</strong>
                        &nbsp;·&nbsp;
                        ${isLeagueMode ? 'Liga Regular' : 'Eliminación Directa'}
                    </p>
                </div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                    ${isLeagueMode ? `<button id="btnOpenAddMatch" class="btn btn-primary btn-sm">+ Programar Partido</button>` : ''}
                    <button id="btnRefreshMatches" class="btn btn-secondary btn-sm" title="Refrescar">🔄</button>
                </div>
            </div>

            <!-- Stats Row -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;">
                <div class="glass-panel" style="padding: 1rem; border-radius: 10px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 800; color: var(--color-text-primary);">${total}</div>
                    <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.15rem;">Total Partidos</div>
                </div>
                <div class="glass-panel" style="padding: 1rem; border-radius: 10px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 800; color: #10b981;">${finished}</div>
                    <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.15rem;">Finalizados</div>
                </div>
                <div class="glass-panel" style="padding: 1rem; border-radius: 10px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 800; color: #3b82f6;">${scheduled}</div>
                    <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.15rem;">Programados</div>
                </div>
            </div>

            <!-- Filters -->
            <div class="glass-panel" style="padding: 0.85rem 1rem; border-radius: 10px; display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
                <select id="filterStatus" class="form-control" style="min-width: 160px; flex: 1;">
                    <option value="">Todos los estados</option>
                    <option value="Programado">Programados</option>
                    <option value="En Juego">En Juego</option>
                    <option value="Finalizado">Finalizados</option>
                </select>
                <select id="filterTeam" class="form-control" style="min-width: 160px; flex: 1;">
                    <option value="">Todos los equipos</option>
                    ${teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                </select>
                <button id="btnClearFilters" class="btn btn-secondary btn-sm">Limpiar</button>
            </div>

            <!-- Matches list -->
            <div id="matchesListContainer"></div>
        </div>

        <!-- Programar Partido Modal (Liga mode) -->
        ${isLeagueMode ? `
        <div id="addMatchModal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:var(--color-bg-overlay); backdrop-filter:blur(4px); z-index:1000; align-items:center; justify-content:center;">
            <div class="glass-panel" style="width:100%; max-width:480px; padding:1.75rem; border-radius:14px; background:var(--color-bg-modal); box-shadow:0 16px 48px rgba(0,0,0,0.6);">
                <h3 style="margin-top:0; text-align:center; color:var(--color-text-primary); font-size:1.1rem;">Programar Nuevo Partido</h3>
                <form id="addMatchForm">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:0.75rem;">
                        <div>
                            <label style="display:block; font-size:0.8rem; color:var(--color-text-muted); margin-bottom:0.2rem;">Local *</label>
                            <select name="homeTeamId" class="form-control" required style="width:100%;">
                                <option value="">Elegir equipo...</option>
                                ${teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display:block; font-size:0.8rem; color:var(--color-text-muted); margin-bottom:0.2rem;">Visitante *</label>
                            <select name="awayTeamId" class="form-control" required style="width:100%;">
                                <option value="">Elegir equipo...</option>
                                ${teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1.25rem;">
                        <div>
                            <label style="display:block; font-size:0.8rem; color:var(--color-text-muted); margin-bottom:0.2rem;">Fecha y Hora</label>
                            <input type="datetime-local" name="date" class="form-control" style="width:100%; box-sizing:border-box;" />
                        </div>
                        <div>
                            <label style="display:block; font-size:0.8rem; color:var(--color-text-muted); margin-bottom:0.2rem;">Jornada</label>
                            <input type="text" name="round" class="form-control" placeholder="Ej. 1" maxlength="20" style="width:100%; box-sizing:border-box;" />
                        </div>
                    </div>
                    <div style="display:flex; gap:0.75rem; justify-content:flex-end;">
                        <button type="button" id="btnCloseAddMatch" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar Partido</button>
                    </div>
                </form>
            </div>
        </div>
        ` : ''}

        <!-- MODAL UNIFICADO DE GESTIÓN DE PARTIDO -->
        <div id="editMatchModal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:var(--color-bg-overlay); backdrop-filter:blur(4px); z-index:1000; align-items:center; justify-content:center;">
            <div class="glass-panel" style="width:100%; max-width:580px; padding:1.75rem; border-radius:14px; background:var(--color-bg-modal); box-shadow:0 16px 48px rgba(0,0,0,0.6); max-height:90vh; overflow-y:auto;">
                <h3 id="editMatchTitle" style="margin-top:0; text-align:center; color:var(--color-text-primary); font-size:1.2rem; font-weight:800;">Editar Resultado y Equipos</h3>
                <p id="editMatchRound" style="text-align:center; font-size:0.8rem; color:var(--color-text-muted); margin-top:0.2rem; margin-bottom:1rem;"></p>
                
                <!-- Equipos y Marcador -->
                <div style="display:grid; grid-template-columns:1fr auto 1fr; gap:0.75rem; align-items:center; margin-bottom:1.25rem; background:var(--color-bg-solid-deep); padding:1rem; border-radius:10px; border:1px solid var(--color-border);">
                    <div style="text-align:center;">
                        <label style="display:block; font-size:0.75rem; color:var(--color-text-muted); margin-bottom:0.3rem;">Equipo Local</label>
                        <select id="editHomeTeam" class="form-control" style="width:100%; font-size:0.85rem; margin-bottom:0.5rem;"></select>
                        <input type="number" id="editHomeScore" min="0" class="form-control" style="width:75px; text-align:center; margin:0 auto; font-size:1.25rem; font-weight:800;" />
                    </div>
                    
                    <div style="font-size:1.1rem; font-weight:800; color:#60a5fa; text-align:center;">VS</div>
                    
                    <div style="text-align:center;">
                        <label style="display:block; font-size:0.75rem; color:var(--color-text-muted); margin-bottom:0.3rem;">Equipo Visitante</label>
                        <select id="editAwayTeam" class="form-control" style="width:100%; font-size:0.85rem; margin-bottom:0.5rem;"></select>
                        <input type="number" id="editAwayScore" min="0" class="form-control" style="width:75px; text-align:center; margin:0 auto; font-size:1.25rem; font-weight:800;" />
                    </div>
                </div>

                <!-- Estado del Partido -->
                <div style="margin-bottom:1.25rem;">
                    <label style="display:block; font-size:0.8rem; color:var(--color-text-muted); margin-bottom:0.3rem;">Estado del Partido</label>
                    <select id="editMatchStatus" class="form-control" style="width:100%;">
                        <option value="Programado">Programado</option>
                        <option value="En Juego">En Juego</option>
                        <option value="Finalizado">Finalizado</option>
                    </select>
                </div>

                <!-- Registro de Eventos (Goles / Infracciones) -->
                <div class="glass-panel" style="padding:1rem; margin-bottom:1.25rem; background:var(--color-bg-solid-deep); border-radius:10px; border:1px solid rgba(96,165,250,0.2);">
                    <h4 style="margin-top:0; margin-bottom:0.6rem; font-size:0.88rem; color:#60a5fa;">⚡ Registrar Anotación o Infracción</h4>
                    <form id="quickEventForm" style="display:flex; flex-direction:column; gap:0.6rem;">
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
                            <div>
                                <label style="font-size:0.75rem; color:var(--color-text-muted);">Equipo</label>
                                <select id="quickEventTeam" class="form-control" style="width:100%; font-size:0.8rem;"></select>
                            </div>
                            <div>
                                <label style="font-size:0.75rem; color:var(--color-text-muted);">Jugador</label>
                                <select id="quickEventPlayer" class="form-control" style="width:100%; font-size:0.8rem;" required></select>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
                            <div>
                                <label style="font-size:0.75rem; color:var(--color-text-muted);">Tipo de Evento</label>
                                <select id="quickEventType" class="form-control" style="width:100%; font-size:0.8rem;"></select>
                            </div>
                            <div>
                                <label style="font-size:0.75rem; color:var(--color-text-muted);">Minuto</label>
                                <input type="number" id="quickEventMinute" class="form-control" min="1" max="120" placeholder="Ej. 45" style="width:100%; font-size:0.8rem;" />
                            </div>
                        </div>
                        <button type="submit" class="btn btn-secondary btn-sm" style="margin-top:0.25rem; align-self:flex-start;">+ Registrar Evento</button>
                    </form>
                </div>

                <!-- Historial de Eventos -->
                <div id="quickEventsList" style="margin-bottom:1.25rem;"></div>

                <!-- Botones de Acción -->
                <div style="display:flex; gap:0.75rem; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.1); padding-top:1rem;">
                    <div id="modalExtraActions"></div>
                    <div style="display:flex; gap:0.5rem;">
                        <button type="button" id="btnCloseEditMatch" class="btn btn-secondary">Cancelar</button>
                        <button type="button" id="btnSaveMatchChanges" class="btn btn-success" style="background:#10b981; border:none; color:white; font-weight:700;">Guardar Cambios</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const listContainer = container.querySelector('#matchesListContainer');
    let currentMatchId = null;
    let currentMatchEvents = [];

    function renderList(matchesToShow) {
        if (matchesToShow.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align:center; padding:3rem 1.5rem; color:var(--color-text-muted);">
                    <div style="font-size:2.5rem; margin-bottom:0.75rem; opacity:0.5;">🏟️</div>
                    <p style="margin:0;">No hay partidos que coincidan con los filtros.</p>
                </div>`;
            return;
        }

        const fg = {};
        matchesToShow.forEach(m => {
            let key;
            if (m.round) key = `Jornada ${m.round}`;
            else if (m.date) key = new Date(m.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
            else key = 'Sin Fecha Asignada';
            if (!fg[key]) fg[key] = [];
            fg[key].push(m);
        });

        listContainer.innerHTML = Object.entries(fg).map(([groupTitle, groupMatches]) => `
            <div style="margin-bottom: 1.5rem;">
                <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem;">
                    <div style="font-size:0.75rem; font-weight:700; color:#60a5fa; text-transform:uppercase; letter-spacing:0.05em;">${groupTitle}</div>
                    <div style="flex:1; height:1px; background:rgba(96,165,250,0.2);"></div>
                    <span style="font-size:0.72rem; color:#475569;">${groupMatches.length} partido${groupMatches.length !== 1 ? 's' : ''}</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:0.5rem;">
                    ${groupMatches.map(m => {
                        const home = teamMap.get(Number(m.homeTeamId));
                        const away = teamMap.get(Number(m.awayTeamId));
                        const homeName = home ? home.name : 'Por definir';
                        const awayName = away ? away.name : 'Por definir';
                        const hs = m.score?.home ?? m.homeScore ?? 0;
                        const as = m.score?.away ?? m.awayScore ?? 0;
                        const sc = getStatus(m.status);
                        const isFinished = m.status === 'Finalizado' || m.status === 'finished';
                        const dateStr = m.date ? new Date(m.date).toLocaleString('es-ES', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '';
                        return `
                        <div class="match-row-card" data-match-id="${m.id}" style="
                            display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:0.5rem;
                            background:var(--color-bg-solid-deep); border:1px solid var(--color-border);
                            border-radius:10px; padding:0.85rem 1rem; cursor:pointer;
                            transition:border-color 0.2s, transform 0.15s;
                        ">
                            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.15rem;">
                                <span style="font-weight:700; color:var(--color-text-primary); font-size:0.95rem; text-align:right;">${homeName}</span>
                                ${isFinished && Number(hs) > Number(as) ? '<span style="font-size:0.65rem; color:#10b981; font-weight:700;">GANADOR</span>' : '<span style="font-size:0.65rem; color:transparent;">-</span>'}
                            </div>
                            <div style="text-align:center; min-width:100px;">
                                ${isFinished
                                    ? `<div style="font-size:1.35rem; font-weight:900; color:var(--color-text-primary); letter-spacing:2px;">${hs} — ${as}</div>`
                                    : `<div style="font-size:0.85rem; font-weight:800; color:#3b82f6; letter-spacing:1px;">VS</div>`
                                }
                                <div style="margin-top:0.3rem;">
                                    <span style="font-size:0.68rem; font-weight:700; color:${sc.text}; background:${sc.bg}; border:1px solid ${sc.border}; border-radius:20px; padding:0.15rem 0.55rem;">
                                        ${statusLabel(m.status)}
                                    </span>
                                </div>
                                ${dateStr ? `<div style="font-size:0.65rem; color:#64748b; margin-top:0.2rem;">${dateStr}</div>` : ''}
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:flex-start; gap:0.15rem;">
                                <span style="font-weight:700; color:var(--color-text-primary); font-size:0.95rem;">${awayName}</span>
                                ${isFinished && Number(as) > Number(hs) ? '<span style="font-size:0.65rem; color:#10b981; font-weight:700;">GANADOR</span>' : '<span style="font-size:0.65rem; color:transparent;">-</span>'}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `).join('');

        listContainer.querySelectorAll('.match-row-card').forEach(card => {
            card.addEventListener('mouseenter', () => { card.style.borderColor = 'rgba(96,165,250,0.4)'; card.style.transform = 'translateY(-1px)'; });
            card.addEventListener('mouseleave', () => { card.style.borderColor = 'var(--color-border)'; card.style.transform = ''; });
            card.addEventListener('click', () => {
                const matchId = Number(card.dataset.matchId);
                openEditModal(matchId);
            });
        });
    }

    const statusFilter = container.querySelector('#filterStatus');
    const teamFilter = container.querySelector('#filterTeam');

    function applyFilters() {
        const sVal = statusFilter.value;
        const tVal = teamFilter.value;
        const filtered = matches.filter(m => {
            const sMatch = sVal ? (m.status === sVal || (sVal === 'Programado' && m.status === 'scheduled') || (sVal === 'Finalizado' && m.status === 'finished')) : true;
            const tMatch = tVal ? (String(m.homeTeamId) === tVal || String(m.awayTeamId) === tVal) : true;
            return sMatch && tMatch;
        });
        renderList(filtered);
    }

    statusFilter.addEventListener('change', applyFilters);
    teamFilter.addEventListener('change', applyFilters);
    container.querySelector('#btnClearFilters').addEventListener('click', () => {
        statusFilter.value = '';
        teamFilter.value = '';
        renderList(matches);
    });
    container.querySelector('#btnRefreshMatches').addEventListener('click', () => renderMatches(container));

    renderList(matches);

    // Modal para agregar partidos
    const addModal = container.querySelector('#addMatchModal');
    const addForm = container.querySelector('#addMatchForm');
    if (addModal && addForm) {
        container.querySelector('#btnOpenAddMatch').addEventListener('click', () => { addModal.style.display = 'flex'; });
        container.querySelector('#btnCloseAddMatch').addEventListener('click', () => { addModal.style.display = 'none'; });
        addModal.addEventListener('click', (e) => { if (e.target === addModal) addModal.style.display = 'none'; });

        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(addForm);
            const homeId = Number(fd.get('homeTeamId'));
            const awayId = Number(fd.get('awayTeamId'));
            if (!homeId || !awayId) { toast.warning('Selecciona ambos equipos.'); return; }
            if (homeId === awayId) { toast.warning('Un equipo no puede jugar contra sí mismo.'); return; }
            try {
                await createMatch({
                    leagueId: activeLeague.id,
                    homeTeamId: homeId,
                    awayTeamId: awayId,
                    date: fd.get('date') || null,
                    round: fd.get('round') || null,
                    status: 'Programado',
                    homeScore: 0,
                    awayScore: 0
                });
                toast.success('Partido programado con éxito');
                addModal.style.display = 'none';
                addForm.reset();
                renderMatches(container);
            } catch (err) { toast.error('Error al programar partido: ' + err.message); }
        });
    }

    // Modal Unificado de Gestión de Partido
    const editModal = container.querySelector('#editMatchModal');
    const quickForm = container.querySelector('#quickEventForm');
    const teamSelect = container.querySelector('#quickEventTeam');
    const playerSelect = container.querySelector('#quickEventPlayer');
    const typeSelect = container.querySelector('#quickEventType');

    const homeSelect = container.querySelector('#editHomeTeam');
    const awaySelect = container.querySelector('#editAwayTeam');

    async function openEditModal(matchId) {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;
        currentMatchId = matchId;

        // Populate team selects
        homeSelect.innerHTML = teams.map(t => `<option value="${t.id}" ${t.id === match.homeTeamId ? 'selected' : ''}>${t.name}</option>`).join('');
        awaySelect.innerHTML = teams.map(t => `<option value="${t.id}" ${t.id === match.awayTeamId ? 'selected' : ''}>${t.name}</option>`).join('');

        container.querySelector('#editHomeScore').value = match.score?.home ?? match.homeScore ?? 0;
        container.querySelector('#editAwayScore').value = match.score?.away ?? match.awayScore ?? 0;
        container.querySelector('#editMatchStatus').value = match.status || 'Programado';
        container.querySelector('#editMatchRound').textContent = match.round ? `Ronda: ${match.round}` : (match.date ? new Date(match.date).toLocaleDateString('es-ES') : '');

        // Populate event team selector dynamically
        const updateQuickTeamSelect = () => {
            const currentHomeId = Number(homeSelect.value);
            const currentAwayId = Number(awaySelect.value);
            const hTeam = teamMap.get(currentHomeId);
            const aTeam = teamMap.get(currentAwayId);
            teamSelect.innerHTML = `
                <option value="${currentHomeId}">${hTeam ? hTeam.name : 'Local'}</option>
                <option value="${currentAwayId}">${aTeam ? aTeam.name : 'Visitante'}</option>
            `;
        };
        updateQuickTeamSelect();

        homeSelect.onchange = updateQuickTeamSelect;
        awaySelect.onchange = updateQuickTeamSelect;

        typeSelect.innerHTML = `
            <option value="${sportConfig.scoreEvent}">${sportConfig.icon || '⚽'} ${sportConfig.scoreEvent}</option>
            ${(sportConfig.infractions || [
                { type: 'Tarjeta Amarilla', label: '🟨 Tarjeta Amarilla' },
                { type: 'Tarjeta Roja', label: '🟥 Tarjeta Roja' }
            ]).map(inf => `<option value="${inf.type}">${inf.label}</option>`).join('')}
        `;

        const homePlayers = match.homeTeamId ? await getPlayersByTeam(match.homeTeamId) : [];
        const awayPlayers = match.awayTeamId ? await getPlayersByTeam(match.awayTeamId) : [];
        const playerMap = new Map([...homePlayers, ...awayPlayers].map(p => [p.id, p]));

        const updatePlayerSelect = async (tId) => {
            playerSelect.innerHTML = '';
            const pList = await getPlayersByTeam(Number(tId));
            if (pList.length === 0) {
                playerSelect.innerHTML = `<option value="">Sin jugadores registrados</option>`;
            } else {
                pList.forEach(p => {
                    playerSelect.innerHTML += `<option value="${p.id}">#${p.number} - ${p.name}</option>`;
                });
            }
        };

        await updatePlayerSelect(homeSelect.value);
        teamSelect.onchange = () => updatePlayerSelect(teamSelect.value);

        // Load Events
        currentMatchEvents = await getEventsByMatch(matchId);
        renderQuickEventsList(playerMap);

        // Action Buttons (Finalize / Undo)
        const extraActions = container.querySelector('#modalExtraActions');
        const isFinished = match.status === 'Finalizado' || match.status === 'finished';

        if (isFinished) {
            extraActions.innerHTML = `<button type="button" id="btnModalUndo" class="btn btn-secondary btn-sm">Deshacer Partido</button>`;
            extraActions.querySelector('#btnModalUndo').onclick = async () => {
                const confirmed = await confirmAction('Deshacer Partido', '¿Estás seguro de deshacer este partido? Se revertirán las estadísticas.');
                if (confirmed) {
                    try {
                        await undoMatch(matchId);
                        toast.success('Partido revertido con éxito.');
                        editModal.style.display = 'none';
                        renderMatches(container);
                    } catch (err) { toast.error('Error al deshacer: ' + err.message); }
                }
            };
        } else {
            extraActions.innerHTML = `<button type="button" id="btnModalFinalize" class="btn btn-success btn-sm">Finalizar Partido</button>`;
            extraActions.querySelector('#btnModalFinalize').onclick = async () => {
                const hId = Number(homeSelect.value);
                const aId = Number(awaySelect.value);
                const hTeam = teamMap.get(hId);
                const aTeam = teamMap.get(aId);

                const calcHomeScore = currentMatchEvents.filter(ev => ev.teamId === hId && !isInfraction(ev.type)).length;
                const calcAwayScore = currentMatchEvents.filter(ev => ev.teamId === aId && !isInfraction(ev.type)).length;

                let winnerId = null;
                const isKnockout = activeLeague.mode === 'eliminacion' || activeLeague.mode === 'doble-eliminacion' || activeLeague.modality === 'knockout';

                if (isKnockout && calcHomeScore === calcAwayScore && hTeam && aTeam) {
                    const pick = await confirmAction(
                        'Declarar Ganador',
                        `El partido terminó en empate (${calcHomeScore}-${calcAwayScore}). Al ser eliminación directa, debes declarar al equipo clasificado.`,
                        {
                            confirmText: 'Declarar Ganador',
                            choices: [
                                { value: hTeam.id, label: hTeam.name },
                                { value: aTeam.id, label: aTeam.name }
                            ]
                        }
                    );
                    if (pick && pick.confirmed) {
                        winnerId = Number(pick.value);
                    } else {
                        toast.error('Ganador no declarado. Operación cancelada.');
                        return;
                    }
                }

                try {
                    await finalizeMatch(matchId, currentMatchEvents, winnerId);
                    toast.success('¡Partido finalizado con éxito!');
                    editModal.style.display = 'none';
                    renderMatches(container);
                } catch (err) { toast.error('Error al finalizar: ' + err.message); }
            };
        }

        editModal.style.display = 'flex';
    }

    function renderQuickEventsList(playerMap) {
        const listDiv = container.querySelector('#quickEventsList');
        if (currentMatchEvents.length === 0) {
            listDiv.innerHTML = `<p style="color:var(--color-text-muted); margin:0; font-size:0.8rem; text-align:center;">No hay eventos registrados aún.</p>`;
            return;
        }

        listDiv.innerHTML = `
            <div style="font-weight:700; color:#cbd5e1; font-size:0.8rem; margin-bottom:0.35rem;">Historial de Eventos (${currentMatchEvents.length}):</div>
            <div style="display:flex; flex-direction:column; gap:0.3rem; max-height:120px; overflow-y:auto;">
                ${currentMatchEvents.map(ev => {
                    const p = playerMap.get(Number(ev.playerId));
                    const pName = p ? `#${p.number} ${p.name}` : `ID ${ev.playerId}`;
                    const isInf = isInfraction(ev.type);
                    const color = isInf ? (ev.type.toLowerCase().includes('roja') ? '#ef4444' : '#f59e0b') : '#10b981';
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--color-bg-solid-deep); padding:0.35rem 0.6rem; border-radius:6px; font-size:0.78rem;">
                            <span><strong>Min ${ev.minute || 'S/N'}</strong>: <strong style="color:${color};">${ev.type}</strong> - ${pName}</span>
                            <button type="button" class="btn-del-event" data-ev-id="${ev.id}" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold;">✖</button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        listDiv.querySelectorAll('.btn-del-event').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const evId = Number(btn.dataset.evId);
                await deleteMatchEvent(evId);
                toast.info('Evento eliminado');
                openEditModal(currentMatchId);
            });
        });
    }

    quickForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentMatchId) return;
        const teamId = Number(teamSelect.value);
        const playerId = Number(playerSelect.value);
        const type = typeSelect.value;
        const minute = container.querySelector('#quickEventMinute').value ? Number(container.querySelector('#quickEventMinute').value) : null;

        if (!playerId) { toast.warning('Selecciona un jugador.'); return; }

        try {
            await createMatchEvent({ matchId: currentMatchId, playerId, teamId, type, minute });
            toast.success('Evento registrado');
            
            // Recalcular marcador en vivo automáticamente
            const allEvents = await getEventsByMatch(currentMatchId);
            const homeScore = allEvents.filter(ev => ev.teamId === Number(homeSelect.value) && !isInfraction(ev.type)).length;
            const awayScore = allEvents.filter(ev => ev.teamId === Number(awaySelect.value) && !isInfraction(ev.type)).length;
            container.querySelector('#editHomeScore').value = homeScore;
            container.querySelector('#editAwayScore').value = awayScore;

            container.querySelector('#quickEventMinute').value = '';
            openEditModal(currentMatchId);
        } catch (err) { toast.error('Error al agregar evento: ' + err.message); }
    });

    container.querySelector('#btnCloseEditMatch').addEventListener('click', () => { editModal.style.display = 'none'; });
    editModal.addEventListener('click', (e) => { if (e.target === editModal) editModal.style.display = 'none'; });

    container.querySelector('#btnSaveMatchChanges').addEventListener('click', async () => {
        if (!currentMatchId) return;
        const homeTeamId = Number(homeSelect.value);
        const awayTeamId = Number(awaySelect.value);
        const homeScore = Number(container.querySelector('#editHomeScore').value);
        const awayScore = Number(container.querySelector('#editAwayScore').value);
        const status = container.querySelector('#editMatchStatus').value;

        if (homeTeamId === awayTeamId) {
            toast.warning('Un equipo no puede jugar contra sí mismo.');
            return;
        }

        try {
            await updateMatch(currentMatchId, { homeTeamId, awayTeamId, homeScore, awayScore, status });
            toast.success('Cambios guardados con éxito');
            editModal.style.display = 'none';
            renderMatches(container);
        } catch (err) { toast.error('Error al guardar cambios: ' + err.message); }
    });
}