/* js/views/teams.view.js */
import { teamsDb } from '../db/teams.db.js';
import { playersDb } from '../db/players.db.js';
import { matchesDb } from '../db/matches.db.js';
import { leaguesDb } from '../db/leagues.db.js';
import { storage } from '../utils/storage.js';
import { SPORTS } from '../sports-terms.js';

// Obtenemos las claves directamente del objeto SPORTS
const SPORT_KEYS = Object.keys(SPORTS || {});

const DEFAULT_SHIELD = 'assets/no-image.webp';
const UPLOAD_ICON = 'assets/upload-icon.png';

/**
 * Función auxiliar para obtener la disciplina/deporte de un equipo
 * dando soporte a 'sport' o 'discipline'
 */
function getTeamSport(team) {
    return (team.sport || team.discipline || 'futbol').toLowerCase();
}

export async function renderTeams(container) {
    const footer = document.querySelector('footer');
    if (footer) {
        footer.style.display = 'none';
    }
    const activeLeagueId = Number(storage.getActiveLeagueId());

    if (!activeLeagueId) {
        container.innerHTML = `
            <div class="glass-card text-center" style="padding: 3rem 1.5rem;">
                <h2 class="text-xl font-bold mb-2">No hay ninguna liga activa</h2>
                <p class="text-secondary mb-4">Selecciona o crea una liga activa para gestionar sus equipos.</p>
                <a href="#leagues" class="btn btn-primary">Ir a Ligas</a>
            </div>
        `;
        return;
    }

    const activeLeague = await leaguesDb.getById(activeLeagueId);
    const teams = await teamsDb.getByLeague(activeLeagueId);
    
    const teamsWithPlayerCount = await Promise.all(teams.map(async (team) => {
        const players = await playersDb.getByTeam(team.id);
        return { ...team, playerCount: players.length };
    }));

    // Determina el deporte por defecto basándose en la liga o la primera clave disponible
    const leagueSport = activeLeague?.sport || activeLeague?.discipline;
    const initialSportFilter = (leagueSport || SPORT_KEYS[0] || 'futbol').toLowerCase();

    renderListView(container, teamsWithPlayerCount, activeLeagueId, initialSportFilter);
}

function renderListView(container, teams, activeLeagueId, initialSportFilter) {
    let currentSportFilter = initialSportFilter;

    const render = () => {
        // Filtra los equipos comparando la disciplina/deporte de forma normalizada
        const filteredTeams = teams.filter(t => getTeamSport(t) === currentSportFilter);

        container.innerHTML = `
            <div class="teams-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
                <div>
                    <h1 class="text-2xl font-bold">Gestión de Equipos</h1>
                    <p class="text-sm text-muted">Administra los clubes organizados por disciplina deportiva</p>
                </div>
                <button id="btnNewTeam" class="btn btn-primary text-sm">+ Nuevo Equipo</button>
            </div>

            <!-- NAVEGACIÓN POR PESTAÑAS (DEPORTES) -->
            <div class="sports-tabs-bar" style="display: flex; gap: 0.5rem; overflow-x: auto; margin-bottom: 1.5rem; padding-bottom: 0.5rem;">
                ${SPORT_KEYS.map(key => {
                    const sportKeyNormalized = key.toLowerCase();
                    const sportData = SPORTS[key] || { name: key, icon: '🏆' };
                    
                    // Cuenta los equipos asociados a esta disciplina
                    const count = teams.filter(t => getTeamSport(t) === sportKeyNormalized).length;
                    const isActive = sportKeyNormalized === currentSportFilter;

                    return `
                        <button type="button" class="tab-btn ${isActive ? 'active' : ''}" data-sport="${sportKeyNormalized}" style="
                            display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; border-radius: 8px;
                            border: none; cursor: pointer; font-weight: 500; white-space: nowrap; transition: all 0.2s ease;
                            background: ${isActive ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)'};
                            color: ${isActive ? '#ffffff' : '#94a3b8'};
                        ">
                            <span>${sportData.icon || '🏆'}</span>
                            <span>${sportData.name || key}</span>
                            <span style="
                                background: ${isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)'};
                                padding: 0.15rem 0.5rem; border-radius: 12px; font-size: 0.75rem;
                            ">${count}</span>
                        </button>
                    `;
                }).join('')}
            </div>

            ${filteredTeams.length === 0 ? `
                <div class="glass-card text-center" style="padding: 3rem 1.5rem;">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">${SPORTS[currentSportFilter]?.icon || '🛡️'}</div>
                    <h2 class="text-xl font-bold mb-2">No hay equipos de ${SPORTS[currentSportFilter]?.name || 'este deporte'}</h2>
                    <p class="text-secondary mb-4">Comienza registrando los equipos participantes en esta disciplina.</p>
                    <button id="btnNewTeamEmpty" class="btn btn-primary">Registrar Primer Equipo</button>
                </div>
            ` : `
                <div class="teams-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.5rem;">
                    ${filteredTeams.map(team => renderTeamCard(team)).join('')}
                </div>
            `}
        `;

        setupListEventListeners(container, activeLeagueId, currentSportFilter, (newSport) => {
            currentSportFilter = newSport;
            render();
        });
    };

    render();
}

function renderTeamCard(team) {
    const shieldUrl = (team.logo && team.logo.trim() !== '') ? team.logo : DEFAULT_SHIELD;
    const primaryColor = team.primaryColor || '#3b82f6';
    const secondaryColor = team.secondaryColor || '#1e293b';

    return `
        <div class="team-card" style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; align-items: center; position: relative; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); width: 100%;">
            
            <div class="team-card-banner" style="height: 60px; width: 100%; display: block; background: linear-gradient(135deg, ${primaryColor} 50%, ${secondaryColor} 50%);"></div>

            <div class="team-shield-wrapper" style="margin-top: -35px; width: 70px; height: 70px; min-width: 70px; min-height: 70px; border-radius: 50%; background: #0f172a; border: 3px solid #1e293b; overflow: hidden; display: flex; align-items: center; justify-content: center; z-index: 2;">
                <img src="${shieldUrl}" alt="${team.name}" onerror="this.src='${DEFAULT_SHIELD}'" style="width: 70px; height: 70px; max-width: 70px; max-height: 70px; object-fit: cover; display: block;">
            </div>

            <div class="team-card-body" style="padding: 0.75rem 1rem; width: 100%; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.25rem;">
                <h3 class="team-title" style="font-size: 1.1rem; font-weight: 700; color: #f8fafc; margin: 0;">${team.name}</h3>
                <p class="team-location" style="font-size: 0.8rem; color: #94a3b8; margin: 0;">${team.city ? `📍 ${team.city}` : 'Sede no especificada'}</p>
                <div class="team-badge" style="margin-top: 0.5rem; background: rgba(255, 255, 255, 0.05); border: 1px solid #334155; border-radius: 20px; padding: 0.25rem 0.75rem; font-size: 0.75rem; color: #cbd5e1;">
                    👥 ${team.playerCount || 0} Jugadores
                </div>
            </div>

            <div class="team-card-actions" style="width: 100%; padding: 1rem; display: flex; gap: 0.5rem; border-top: 1px solid rgba(255, 255, 255, 0.05); background: rgba(0, 0, 0, 0.1); box-sizing: border-box;">
                <a href="#team/${team.id}" class="btn btn-sm btn-secondary" style="flex: 1; text-align: center;">Ver Detalle</a>
                <button class="btn btn-sm btn-secondary btn-edit-team" data-id="${team.id}">✏️</button>
                <button class="btn btn-sm btn-danger btn-delete-team" data-id="${team.id}">🗑️</button>
            </div>
        </div>
    `;
}

function setupListEventListeners(container, activeLeagueId, currentSportFilter, onTabChange) {
    const goForm = () => renderFormView(container, activeLeagueId, null, currentSportFilter);
    container.querySelector('#btnNewTeam')?.addEventListener('click', goForm);
    container.querySelector('#btnNewTeamEmpty')?.addEventListener('click', goForm);

    container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const selectedSport = e.currentTarget.dataset.sport;
            if (selectedSport) onTabChange(selectedSport);
        });
    });

    container.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const id = Number(btn.dataset.id);
        if (!id) return;

        if (btn.classList.contains('btn-edit-team')) {
            const team = await teamsDb.getById(id);
            if (team) renderFormView(container, activeLeagueId, team, currentSportFilter);
        } else if (btn.classList.contains('btn-delete-team')) {
            const leagueMatches = await matchesDb.getByLeague(activeLeagueId);
            const hasMatches = leagueMatches.some(m => m.homeTeamId === id || m.awayTeamId === id);

            if (hasMatches) {
                alert('⚠️ No se puede eliminar este equipo porque ya tiene partidos registrados.');
                return;
            }

            if (confirm('¿Estás seguro de eliminar este equipo? Se eliminarán también sus jugadores asociados.')) {
                const players = await playersDb.getByTeam(id);
                for (const player of players) {
                    await playersDb.delete(player.id);
                }
                await teamsDb.delete(id);
                renderTeams(container);
            }
        }
    });
}

function renderFormView(container, leagueId, teamToEdit = null, defaultSport = 'futbol') {
    const isEdit = !!teamToEdit;
    let processedImageBase64 = teamToEdit?.logo || '';
    const selectedSport = getTeamSport(teamToEdit || { sport: defaultSport });

    container.innerHTML = `
      <div class="team-form-card" style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; max-width: 600px; margin: 0 auto 100px auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 class="text-xl font-bold">${isEdit ? 'Editar Equipo' : 'Nuevo Equipo'}</h2>
                <button id="btnBackToList" class="btn btn-secondary text-sm">&larr; Volver</button>
            </div>

            <form id="teamForm">
                <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                    
                    <!-- Carga de Escudo -->
                    <div style="text-align: center;">
                        <label class="label text-sm mb-2" style="display: block;">Escudo del Equipo</label>
                        <div class="image-upload-circle" style="position: relative; width: 90px; height: 90px; border-radius: 50%; border: 2px dashed #475569; overflow: hidden; margin: 0 auto; background: #0f172a; display: flex; align-items: center; justify-content: center;">
                            <img id="shieldPreview" src="${processedImageBase64 || DEFAULT_SHIELD}" onerror="this.src='${DEFAULT_SHIELD}'" style="width: 90px; height: 90px; max-width: 90px; max-height: 90px; object-fit: cover; display: block;">
                            
                            <label for="shieldFileInput" style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                <img src="${UPLOAD_ICON}" alt="Subir" style="width: 28px; height: 28px;">
                            </label>
                            <input type="file" id="shieldFileInput" accept="image/*" style="display: none;">
                        </div>
                        <span class="text-xs text-muted" style="margin-top: 0.5rem; display: block;">Haz clic en el ícono para seleccionar imagen</span>
                    </div>

                    <div class="form-group">
                        <label class="label text-sm">Nombre del Equipo</label>
                        <input type="text" name="name" class="input" value="${teamToEdit?.name || ''}" required placeholder="Ej. Real Madrid" style="width: 100%; box-sizing: border-box;">
                    </div>

                    <div class="form-group">
                        <label class="label text-sm">Disciplina Deportiva</label>
                        <select name="sport" class="input" required style="width: 100%; box-sizing: border-box;">
                            ${SPORT_KEYS.map(key => {
                                const keyNormalized = key.toLowerCase();
                                return `
                                    <option value="${keyNormalized}" ${keyNormalized === selectedSport ? 'selected' : ''}>
                                        ${SPORTS[key]?.icon || '🏆'} ${SPORTS[key]?.name || key}
                                    </option>
                                `;
                            }).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="label text-sm">Ciudad / Sede (Opcional)</label>
                        <input type="text" name="city" class="input" value="${teamToEdit?.city || ''}" placeholder="Ej. Madrid" style="width: 100%; box-sizing: border-box;">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label class="label text-sm">Color Principal</label>
                            <input type="color" name="primaryColor" class="input" value="${teamToEdit?.primaryColor || '#3b82f6'}" style="height: 40px; padding: 2px; width: 100%; box-sizing: border-box;">
                        </div>

                        <div class="form-group">
                            <label class="label text-sm">Color Secundario</label>
                            <input type="color" name="secondaryColor" class="input" value="${teamToEdit?.secondaryColor || '#1e293b'}" style="height: 40px; padding: 2px; width: 100%; box-sizing: border-box;">
                        </div>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
                        <button type="button" id="btnCancelForm" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="btn btn-primary">${isEdit ? 'Guardar Cambios' : 'Crear Equipo'}</button>
                    </div>
                </div>
            </form>
        </div>
    `;

    const fileInput = container.querySelector('#shieldFileInput');
    const previewImg = container.querySelector('#shieldPreview');

    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 150;
                canvas.height = 150;
                ctx.drawImage(img, 0, 0, 150, 150);
                
                previewImg.src = canvas.toDataURL('image/webp', 0.85);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    const goBack = () => renderTeams(container);
    container.querySelector('#btnBackToList')?.addEventListener('click', goBack);
    container.querySelector('#btnCancelForm')?.addEventListener('click', goBack);

    container.querySelector('#teamForm').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const currentPreviewSrc = previewImg.src;
        const finalLogo = currentPreviewSrc.includes('no-image') ? '' : currentPreviewSrc;
        const selectedSportVal = formData.get('sport').toLowerCase();

        const teamData = {
            leagueId: Number(leagueId),
            name: formData.get('name').trim(),
            sport: selectedSportVal,
            discipline: selectedSportVal, // Guardamos ambas claves para compatibilidad
            city: formData.get('city').trim(),
            primaryColor: formData.get('primaryColor'),
            secondaryColor: formData.get('secondaryColor'),
            logo: finalLogo
        };

        const existingTeams = await teamsDb.getByLeague(leagueId);
        const duplicate = existingTeams.find(t => t.name.toLowerCase() === teamData.name.toLowerCase() && t.id !== teamToEdit?.id);
        
        if (duplicate) {
            alert('⚠️ Ya existe un equipo con ese nombre en esta liga.');
            return;
        }

        if (isEdit) {
            await teamsDb.update(teamToEdit.id, teamData);
        } else {
            await teamsDb.create(teamData);
        }

        renderTeams(container);
    };
}