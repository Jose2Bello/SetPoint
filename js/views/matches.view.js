// js/views/matches.view.js
import { getActiveLeague } from '../db/leagues.db.js';
import { getTeamsByLeague } from '../db/teams.db.js';
import { getAllMatches, createMatch, updateMatch } from '../db/matches.db.js';

export async function renderMatches(container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 200px; color: #94a3b8; font-size: 0.9rem;">
            Cargando partidos...
        </div>`;

    const activeLeague = await getActiveLeague();
    if (!activeLeague) {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 1.5rem; gap: 1rem; text-align: center;">
                <div style="font-size: 3rem; opacity: 0.4;">🏟️</div>
                <h2 style="margin: 0; color: #f8fafc; font-size: 1.4rem;">No hay liga activa</h2>
                <p style="margin: 0; color: #94a3b8;">Selecciona o crea una liga para ver sus partidos.</p>
                <a href="#leagues" class="btn btn-primary" style="margin-top: 0.5rem;">Ir a Ligas</a>
            </div>`;
        return;
    }

    const teams = await getTeamsByLeague(activeLeague.id);
    const matches = await getAllMatches(activeLeague.id);

    render(container, activeLeague, teams, matches);
}

function render(container, activeLeague, teams, matches) {
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

    // Group matches by round or date
    const grouped = {};
    matches.forEach(m => {
        let key;
        if (m.round) {
            key = `Jornada ${m.round}`;
        } else if (m.date) {
            key = new Date(m.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        } else {
            key = 'Sin Fecha Asignada';
        }
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(m);
    });

    const groupKeys = Object.keys(grouped);

    // Stats summary
    const total = matches.length;
    const finished = matches.filter(m => m.status === 'Finalizado' || m.status === 'finished').length;
    const scheduled = matches.filter(m => m.status === 'Programado' || m.status === 'scheduled').length;
    const inProgress = total - finished - scheduled;

    container.innerHTML = `
        <div class="matches-view-wrapper" style="display: flex; flex-direction: column; gap: 1.5rem;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h1 style="margin: 0 0 0.25rem 0; color: #f8fafc; font-size: 1.6rem; font-weight: 800;">Calendario de Partidos</h1>
                    <p style="margin: 0; color: #94a3b8; font-size: 0.875rem;">
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
                    <div style="font-size: 1.5rem; font-weight: 800; color: #f8fafc;">${total}</div>
                    <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.15rem;">Total Partidos</div>
                </div>
                <div class="glass-panel" style="padding: 1rem; border-radius: 10px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 800; color: #10b981;">${finished}</div>
                    <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.15rem;">Finalizados</div>
                </div>
                <div class="glass-panel" style="padding: 1rem; border-radius: 10px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 800; color: #3b82f6;">${scheduled}</div>
                    <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.15rem;">Programados</div>
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

        <!-- Add Match Modal (Liga mode only) -->
        ${isLeagueMode ? `
        <div id="addMatchModal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.88); backdrop-filter:blur(4px); z-index:1000; align-items:center; justify-content:center;">
            <div class="glass-panel" style="width:100%; max-width:480px; padding:1.75rem; border-radius:14px; background:rgba(30,41,59,0.97); box-shadow:0 16px 48px rgba(0,0,0,0.6);">
                <h3 style="margin-top:0; text-align:center; color:#f8fafc; font-size:1.1rem;">Programar Nuevo Partido</h3>
                <form id="addMatchForm">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:0.75rem;">
                        <div>
                            <label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:0.2rem;">Local *</label>
                            <select name="homeTeamId" class="form-control" required style="width:100%;">
                                <option value="">Elegir equipo...</option>
                                ${teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:0.2rem;">Visitante *</label>
                            <select name="awayTeamId" class="form-control" required style="width:100%;">
                                <option value="">Elegir equipo...</option>
                                ${teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1.25rem;">
                        <div>
                            <label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:0.2rem;">Fecha y Hora</label>
                            <input type="datetime-local" name="date" class="form-control" style="width:100%; box-sizing:border-box;" />
                        </div>
                        <div>
                            <label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:0.2rem;">Jornada</label>
                            <input type="text" name="round" class="form-control" placeholder="Ej. 1" style="width:100%; box-sizing:border-box;" />
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

        <!-- Edit Result Modal -->
        <div id="editMatchModal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.88); backdrop-filter:blur(4px); z-index:1000; align-items:center; justify-content:center;">
            <div class="glass-panel" style="width:100%; max-width:460px; padding:1.75rem; border-radius:14px; background:rgba(30,41,59,0.97); box-shadow:0 16px 48px rgba(0,0,0,0.6);">
                <h3 id="editMatchTitle" style="margin-top:0; text-align:center; color:#f8fafc; font-size:1.1rem;">Editar Resultado</h3>
                <p id="editMatchRound" style="text-align:center; font-size:0.78rem; color:#94a3b8; margin-top:0; margin-bottom:1rem;"></p>
                <form id="editMatchForm">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:0.75rem; margin-bottom:1rem;">
                        <div style="flex:1; text-align:center;">
                            <strong id="editHomeLabel" style="display:block; color:#f8fafc; font-size:0.9rem; margin-bottom:0.35rem;"></strong>
                            <input type="number" id="editHomeScore" min="0" class="form-control" style="width:70px; text-align:center; margin:0 auto; font-size:1.2rem; font-weight:800;" />
                        </div>
                        <span style="font-size:1.25rem; color:#475569; font-weight:800;">–</span>
                        <div style="flex:1; text-align:center;">
                            <strong id="editAwayLabel" style="display:block; color:#f8fafc; font-size:0.9rem; margin-bottom:0.35rem;"></strong>
                            <input type="number" id="editAwayScore" min="0" class="form-control" style="width:70px; text-align:center; margin:0 auto; font-size:1.2rem; font-weight:800;" />
                        </div>
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:0.2rem;">Estado del Partido</label>
                        <select id="editMatchStatus" class="form-control" style="width:100%; box-sizing:border-box;">
                            <option value="Programado">Programado</option>
                            <option value="En Juego">En Juego</option>
                            <option value="Finalizado">Finalizado</option>
                        </select>
                    </div>
                    <div style="display:flex; gap:0.75rem; justify-content:flex-end;">
                        <button type="button" id="btnCloseEditMatch" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">💾 Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const listContainer = container.querySelector('#matchesListContainer');
    let currentMatchId = null;

    function renderList(matchesToShow) {
        if (matchesToShow.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align:center; padding:3rem 1.5rem; color:#94a3b8;">
                    <div style="font-size:2.5rem; margin-bottom:0.75rem; opacity:0.5;">🏟️</div>
                    <p style="margin:0;">No hay partidos que coincidan con los filtros.</p>
                </div>`;
            return;
        }

        // Re-group the filtered matches
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
                            background:rgba(15,23,42,0.5); border:1px solid rgba(255,255,255,0.07);
                            border-radius:10px; padding:0.85rem 1rem; cursor:pointer;
                            transition:border-color 0.2s, transform 0.15s;
                        ">
                            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.15rem;">
                                <span style="font-weight:700; color:#f8fafc; font-size:0.95rem; text-align:right;">${homeName}</span>
                                ${isFinished && Number(hs) > Number(as) ? '<span style="font-size:0.65rem; color:#10b981; font-weight:700;">GANADOR</span>' : '<span style="font-size:0.65rem; color:transparent;">-</span>'}
                            </div>
                            <div style="text-align:center; min-width:100px;">
                                ${isFinished
                                    ? `<div style="font-size:1.35rem; font-weight:900; color:#f8fafc; letter-spacing:2px;">${hs} — ${as}</div>`
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
                                <span style="font-weight:700; color:#f8fafc; font-size:0.95rem;">${awayName}</span>
                                ${isFinished && Number(as) > Number(hs) ? '<span style="font-size:0.65rem; color:#10b981; font-weight:700;">GANADOR</span>' : '<span style="font-size:0.65rem; color:transparent;">-</span>'}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `).join('');

        // Click to edit
        listContainer.querySelectorAll('.match-row-card').forEach(card => {
            card.addEventListener('mouseenter', () => { card.style.borderColor = 'rgba(96,165,250,0.4)'; card.style.transform = 'translateY(-1px)'; });
            card.addEventListener('mouseleave', () => { card.style.borderColor = 'rgba(255,255,255,0.07)'; card.style.transform = ''; });
            card.addEventListener('click', () => {
                const matchId = Number(card.dataset.matchId);
                openEditModal(matchId);
            });
        });
    }

    // Filtering logic
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

    // Initial render
    renderList(matches);

    // Add Match Modal
    const addModal = container.querySelector('#addMatchModal');
    const addForm = container.querySelector('#addMatchForm');
    if (addModal && addForm) {
        container.querySelector('#btnOpenAddMatch').addEventListener('click', () => {
            addModal.style.display = 'flex';
        });
        container.querySelector('#btnCloseAddMatch').addEventListener('click', () => {
            addModal.style.display = 'none';
        });
        addModal.addEventListener('click', (e) => { if (e.target === addModal) addModal.style.display = 'none'; });

        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(addForm);
            const homeId = Number(fd.get('homeTeamId'));
            const awayId = Number(fd.get('awayTeamId'));
            if (!homeId || !awayId) { alert('Selecciona ambos equipos.'); return; }
            if (homeId === awayId) { alert('Un equipo no puede jugar contra sí mismo.'); return; }
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
                addModal.style.display = 'none';
                addForm.reset();
                renderMatches(container);
            } catch (err) { alert('Error al programar partido: ' + err.message); }
        });
    }

    // Edit Result Modal
    const editModal = container.querySelector('#editMatchModal');
    const editForm = container.querySelector('#editMatchForm');

    function openEditModal(matchId) {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;
        currentMatchId = matchId;

        const home = teamMap.get(Number(match.homeTeamId));
        const away = teamMap.get(Number(match.awayTeamId));
        container.querySelector('#editHomeLabel').textContent = home ? home.name : 'Local';
        container.querySelector('#editAwayLabel').textContent = away ? away.name : 'Visitante';
        container.querySelector('#editHomeScore').value = match.score?.home ?? match.homeScore ?? 0;
        container.querySelector('#editAwayScore').value = match.score?.away ?? match.awayScore ?? 0;
        container.querySelector('#editMatchStatus').value = match.status || 'Programado';
        container.querySelector('#editMatchRound').textContent = match.round ? `Jornada ${match.round}` : (match.date ? new Date(match.date).toLocaleDateString('es-ES') : '');
        editModal.style.display = 'flex';
    }

    container.querySelector('#btnCloseEditMatch').addEventListener('click', () => { editModal.style.display = 'none'; });
    editModal.addEventListener('click', (e) => { if (e.target === editModal) editModal.style.display = 'none'; });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentMatchId) return;
        const homeScore = Number(container.querySelector('#editHomeScore').value);
        const awayScore = Number(container.querySelector('#editAwayScore').value);
        const status = container.querySelector('#editMatchStatus').value;
        try {
            await updateMatch(currentMatchId, { homeScore, awayScore, status });
            editModal.style.display = 'none';
            renderMatches(container);
        } catch (err) { alert('Error al guardar: ' + err.message); }
    });
}