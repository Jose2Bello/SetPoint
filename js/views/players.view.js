/* js/views/players.view.js */
import { getAllPlayers, createPlayer } from '../db/players.db.js';
import { getTeamsByLeague } from '../db/teams.db.js';
import { getActiveLeague } from '../db/leagues.db.js';
import { initDB } from '../db/connection.js';
import { getSportConfig } from '../sports-terms.js';
import { toast } from '../components/toast.js';

const DEFAULT_AVATAR = 'assets/no-image.webp';
const UPLOAD_ICON = 'assets/upload-icon.png';

export async function renderPlayersView(container) {
    container.innerHTML = '<div class="loading-state"><p>Cargando atletas...</p></div>';

    await initDB();

    const activeLeague = await getActiveLeague();
    if (!activeLeague) {
        container.innerHTML = `
            <div class="glass-panel text-center" style="padding: 2rem;">
                <h2>No hay una liga activa seleccionada</h2>
                <p class="text-muted">Selecciona o crea una liga primero para ver sus jugadores.</p>
            </div>
        `;
        return;
    }

    const [rawPlayers, rawTeams] = await Promise.all([
        getAllPlayers(activeLeague.id),
        getTeamsByLeague(activeLeague.id)
    ]);

    // 🛡️ Blindaje para asegurar arreglos válidos y evitar errores de tipo
    const allPlayers = Array.isArray(rawPlayers) ? rawPlayers : [];
    const teams = Array.isArray(rawTeams) ? rawTeams : [];

    const teamMap = new Map(teams.map(t => [Number(t.id), t.name]));
    const sportConfig = getSportConfig(activeLeague.sport);

    container.innerHTML = `
        <div class="players-view-container" style="display: flex; flex-direction: column; gap: 2rem;">
            
            <!-- Encabezado y Acciones -->
            <div class="section-header-flex" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h1 style="margin: 0;">Gestión de atletas</h1>
                    <p class="text-muted" style="margin: 0.25rem 0 0 0;">Liga activa: <strong>${activeLeague.name}</strong></p>
                </div>
                <button id="btn-new-player" class="btn btn-primary">+ Nuevo Jugador</button>
            </div>

            <!-- 1. BÚSQUEDA Y LISTA GENERAL (ARRIBA) -->
            <div class="glass-panel" style="padding: 1.5rem; border-radius: 12px; background: var(--color-bg-card);">
                <h3 style="margin-top: 0; margin-bottom: 1rem;">Todos los Jugadores</h3>
                
                <div class="filters-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <input type="text" id="search-player-input" class="form-control" placeholder="Buscar por nombre..." />
                    
                    <select id="filter-team-select" class="form-control">
                        <option value="">Todos los equipos</option>
                        ${teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                    </select>

                    <select id="filter-position-select" class="form-control">
                        <option value="">Todas las posiciones</option>
                        <option value="Portero">Portero</option>
                        <option value="Defensa">Defensa</option>
                        <option value="Mediocampista">Mediocampista</option>
                        <option value="Delantero">Delantero</option>
                    </select>

                    <button id="btn-clear-filters" class="btn btn-secondary">Limpiar</button>
                </div>

                <div id="players-results-grid" class="cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem;">
                </div>
            </div>

            <!-- 2. JUGADORES DESTACADOS (CARRUSEL / SLIDER ABAJO) -->
            ${allPlayers.length > 0 ? renderFeaturedSliderHTML(allPlayers, teamMap, sportConfig) : ''}

            <!-- 3. TOP ANOTADORES (ABAJO) -->
            ${allPlayers.length > 0 ? renderTopScorersHTML(allPlayers, teamMap, sportConfig) : ''}

        </div>
    `;

    // Lógica de Filtros
    const searchInput = container.querySelector('#search-player-input');
    const teamSelect = container.querySelector('#filter-team-select');
    const positionSelect = container.querySelector('#filter-position-select');
    const btnClear = container.querySelector('#btn-clear-filters');
    const resultsGrid = container.querySelector('#players-results-grid');

    function applyFilters() {
        const query = searchInput.value.trim().toLowerCase();
        const selectedTeam = teamSelect.value ? Number(teamSelect.value) : null;
        const selectedPos = positionSelect.value;

        const filtered = allPlayers.filter(p => {
            const matchesName = p.name ? p.name.toLowerCase().includes(query) : false;
            const matchesTeam = !selectedTeam || Number(p.teamId) === selectedTeam;
            const matchesPos = !selectedPos || p.position === selectedPos;
            return matchesName && matchesTeam && matchesPos;
        });

        renderPlayerCards(resultsGrid, filtered, teamMap, sportConfig);
    }

    searchInput.addEventListener('input', applyFilters);
    teamSelect.addEventListener('change', applyFilters);
    positionSelect.addEventListener('change', applyFilters);

    btnClear.addEventListener('click', () => {
        searchInput.value = '';
        teamSelect.value = '';
        positionSelect.value = '';
        applyFilters();
    });

    applyFilters();

    // Controles interactivos del Carrusel de Jugadores Destacados
    const carouselTrack = container.querySelector('#featured-carousel-track');
    const btnCarouselPrev = container.querySelector('#btn-carousel-prev');
    const btnCarouselNext = container.querySelector('#btn-carousel-next');

    if (carouselTrack && btnCarouselPrev && btnCarouselNext) {
        btnCarouselPrev.addEventListener('click', () => {
            carouselTrack.scrollBy({ left: -240, behavior: 'smooth' });
        });
        btnCarouselNext.addEventListener('click', () => {
            carouselTrack.scrollBy({ left: 240, behavior: 'smooth' });
        });
    }

    setupPlayerModal(container, teams, activeLeague.id, sportConfig, () => renderPlayersView(container));
}

function getPlayerAvatarHTML(player, size = '50px') {
    if (player.photo) {
        return `<img src="${player.photo}" alt="${player.name}" style="width: ${size}; height: ${size}; border-radius: 50%; object-fit: cover; border: 2px solid #3b82f6;" />`;
    }
    
    return `
        <div style="width: ${size}; height: ${size}; border-radius: 50%; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1rem; flex-shrink: 0;">
            #${player.number || '👤'}
        </div>
    `;
}

/**
 * Carrusel de Jugadores Destacados (Selección aleatoria de 6 a 8 jugadores)
 */
function renderFeaturedSliderHTML(players, teamMap, sportConfig) {
    if (!players || players.length === 0) return '';

    // Seleccionar entre 6 y 8 jugadores al azar (o todos si hay menos de 6)
    const count = Math.min(Math.floor(Math.random() * 3) + 6, players.length);
    const shuffled = [...players].sort(() => 0.5 - Math.random());
    const featured = shuffled.slice(0, count);

    return `
        <div class="featured-carousel-container">
            <div class="featured-carousel-header">
                <div class="featured-carousel-title">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                        <span>⭐</span> Jugadores Destacados
                    </h3>
                    <span class="featured-badge">${featured.length} Destacados</span>
                </div>
                <div class="carousel-controls">
                    <button id="btn-carousel-prev" class="carousel-nav-btn" title="Anterior">&lt;</button>
                    <button id="btn-carousel-next" class="carousel-nav-btn" title="Siguiente">&gt;</button>
                </div>
            </div>

            <div id="featured-carousel-track" class="featured-carousel-track">
                ${featured.map(p => `
                    <a href="#player/${p.id}" class="featured-card">
                        <div class="featured-avatar-wrapper">
                            ${getPlayerAvatarHTML(p, '65px')}
                            <span class="featured-dorsal-tag">#${p.number || '0'}</span>
                        </div>
                        <h4 class="featured-player-name" title="${p.name}">${p.name}</h4>
                        <p class="featured-player-team" title="${teamMap.get(Number(p.teamId)) || 'Sin Equipo'}">
                            ${teamMap.get(Number(p.teamId)) || 'Sin Equipo'}
                        </p>
                        <div class="featured-stats-bar">
                            <div class="featured-stat-item">
                                <span style="font-size: 0.7rem; color: var(--color-text-muted);">Posición</span>
                                <span class="featured-stat-value">${p.position || 'Jugador'}</span>
                            </div>
                            <div class="featured-stat-item">
                                <span style="font-size: 0.7rem; color: var(--color-text-muted);">${sportConfig.scoreEventPlural || 'Anotaciones'}</span>
                                <span class="featured-stat-value">${p.stats?.goals || 0}</span>
                            </div>
                        </div>
                    </a>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Lista de Top Anotadores
 */
function renderTopScorersHTML(players, teamMap, sportConfig) {
    const topScorers = [...players]
        .sort((a, b) => ((b.stats?.goals || 0) - (a.stats?.goals || 0)))
        .slice(0, 5);

    return `
        <div class="glass-panel" style="padding: 1.5rem; border-radius: 12px; background: var(--color-bg-card);">
            <h3 style="margin-top: 0; margin-bottom: 1rem;">🔥 Jugadores con más Anotaciones</h3>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                ${topScorers.map((p, index) => `
                    <a href="#player/${p.id}" class="clickable-card" style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid var(--color-border-strong); text-decoration: none; color: inherit;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span style="font-weight: bold; width: 20px; color: ${index === 0 ? '#f59e0b' : index === 1 ? '#94a3b8' : '#b45309'};">
                                #${index + 1}
                            </span>
                            ${getPlayerAvatarHTML(p, '40px')}
                            <div>
                                <strong style="color: var(--color-text-primary); font-size: 0.95rem;">${p.name}</strong>
                                <span style="display: block; font-size: 0.8rem; color: #64748b;">${teamMap.get(Number(p.teamId)) || 'Sin Equipo'}</span>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-size: 1.2rem; font-weight: bold; color: #10b981;">${p.stats?.goals || 0}</span>
                            <span style="font-size: 0.75rem; color: var(--color-text-muted); display: block;">${sportConfig.scoreEventPlural || 'Anotaciones'}</span>
                        </div>
                    </a>
                `).join('')}
            </div>
        </div>
    `;
}

function renderPlayerCards(container, players, teamMap, sportConfig) {
    if (players.length === 0) {
        container.innerHTML = `<p class="text-muted" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">No se encontraron jugadores que coincidan con la búsqueda.</p>`;
        return;
    }

    container.innerHTML = players.map(p => `
        <a href="#player/${p.id}" class="glass-card clickable-card" style="padding: 1rem; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--color-border-strong); display: flex; flex-direction: column; justify-content: space-between; text-decoration: none; color: inherit; cursor: pointer;">
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                    ${getPlayerAvatarHTML(p, '45px')}
                    <span style="background: #3b82f6; color: white; padding: 0.2rem 0.5rem; border-radius: 6px; font-weight: bold; font-size: 0.8rem;">
                        #${p.number || '0'}
                    </span>
                </div>
                <h4 style="margin: 0.25rem 0; color: var(--color-text-primary); font-size: 1rem;">${p.name}</h4>
                <p style="margin: 0; font-size: 0.85rem; color: #64748b;">${teamMap.get(Number(p.teamId)) || 'Sin equipo'}</p>
            </div>
            <div style="margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid var(--color-border); display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--color-text-muted);">
                <span>Pos: <strong style="color: #60a5fa;">${p.position || 'N/A'}</strong></span>
                <span>${sportConfig.scoreEventPlural || 'Anotaciones'}: <strong style="color: var(--color-text-primary);">${p.stats?.goals || 0}</strong></span>
            </div>
        </a>
    `).join('');
}

function setupPlayerModal(container, teams, activeLeagueId, sportConfig, onSuccess) {
    let modalOverlay = document.getElementById('player-modal-overlay');
    if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'player-modal-overlay';
        modalOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: var(--color-bg-overlay); backdrop-filter: blur(6px);
            display: none; justify-content: center; align-items: center; z-index: 1000;
            padding: 1rem; box-sizing: border-box;
        `;
        document.body.appendChild(modalOverlay);
    }

    const positions = sportConfig.defaultPositions || ['Jugador'];
    const sportIcon = sportConfig.icon || '👤';

    modalOverlay.innerHTML = `
        <div class="glass-panel" style="width: 100%; max-width: 600px; padding: 2.25rem; border-radius: 16px; background: var(--color-bg-modal); box-shadow: 0 24px 60px rgba(0,0,0,0.6); border: 1px solid rgba(var(--color-accent-rgb), 0.25); max-height: 92vh; overflow-y: auto; box-sizing: border-box;">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem;">
                <span style="font-size: 1.7rem; line-height: 1;">${sportIcon}</span>
                <h2 style="margin: 0; font-size: 1.5rem; font-weight: 800; color: var(--color-text-primary);">Nuevo Jugador</h2>
            </div>
            <p style="margin: 0 0 1.75rem 0; font-size: 0.9rem; color: var(--color-text-muted);">Completa los datos del atleta para registrarlo en la liga activa.</p>
            
            <form id="form-new-player">
                <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 1.75rem;">
                    <div style="position: relative; width: 120px; height: 120px; border-radius: 50%; border: 2px dashed #64748b; overflow: hidden; background: var(--color-bg-solid); display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 18px rgba(0,0,0,0.35); transition: all 0.2s;">
                        <img id="photo-preview" src="${DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'" style="width: 120px; height: 120px; max-width: 120px; max-height: 120px; object-fit: cover; display: block;">
                        <label for="player-photo-input" style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; cursor: pointer;">
                            <img src="${UPLOAD_ICON}" alt="Subir foto" style="width: 32px; height: 32px;">
                        </label>
                    </div>
                    <input type="file" id="player-photo-input" accept="image/*" style="display: none;" />
                    <span style="font-size: 0.9rem; color: #60a5fa; text-decoration: underline; font-weight: 600; margin-top: 0.6rem;">Subir Foto del Jugador</span>
                </div>

                <div style="margin-bottom: 1.25rem;">
                    <label style="display: block; font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 0.35rem;">Nombre Completo *</label>
                    <input type="text" id="player-name" class="form-control" required placeholder="Ej. Lionel Messi" style="width: 100%; box-sizing: border-box; padding: 0.75rem; font-size: 1rem;" />
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
                    <div>
                        <label style="display: block; font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 0.35rem;">Dorsal (Número)</label>
                        <input type="number" id="player-number" class="form-control" placeholder="Ej. 10" style="width: 100%; box-sizing: border-box; padding: 0.75rem;" />
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 0.35rem;">Posición</label>
                        <select id="player-position" class="form-control" style="width: 100%; box-sizing: border-box; padding: 0.75rem;">
                            ${positions.map(pos => `<option value="${pos}">${pos}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div style="margin-bottom: 1.75rem;">
                    <label style="display: block; font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 0.35rem;">Equipo *</label>
                    <select id="player-team" class="form-control" required style="width: 100%; box-sizing: border-box; padding: 0.75rem;">
                        <option value="" disabled selected>Selecciona un equipo...</option>
                        ${teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                    </select>
                </div>

                <div style="display: flex; gap: 0.75rem; justify-content: flex-end; border-top: 1px solid var(--color-border); padding-top: 1.25rem;">
                    <button type="button" id="btn-cancel-player" class="btn btn-secondary" style="padding: 0.7rem 1.5rem;">Cancelar</button>
                    <button type="submit" class="btn btn-primary" style="padding: 0.7rem 1.75rem;">Guardar Jugador</button>
                </div>
            </form>
        </div>
    `;

    const fileInput = document.getElementById('player-photo-input');
    const photoPreview = document.getElementById('photo-preview');
    let base64Image = null;

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                base64Image = event.target.result;
                photoPreview.src = base64Image;
                photoPreview.style.borderStyle = 'solid';
                photoPreview.style.borderColor = '#3b82f6';
            };
            reader.readAsDataURL(file);
        }
    });

    const btnOpen = container.querySelector('#btn-new-player');
    const btnCancel = document.getElementById('btn-cancel-player');
    const form = document.getElementById('form-new-player');

    btnOpen.addEventListener('click', () => {
        form.reset();
        base64Image = null;
        photoPreview.src = DEFAULT_AVATAR;
        photoPreview.style.borderStyle = 'dashed';
        photoPreview.style.borderColor = '#64748b';
        modalOverlay.style.display = 'flex';
    });

    const closeModal = () => {
        modalOverlay.style.display = 'none';
    };

    btnCancel.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newPlayer = {
            name: document.getElementById('player-name').value.trim(),
            number: document.getElementById('player-number').value,
            teamId: document.getElementById('player-team').value,
            leagueId: activeLeagueId,
            position: document.getElementById('player-position').value,
            photo: base64Image
        };

        try {
            await createPlayer(newPlayer);
            toast.success('Jugador registrado con éxito');
            closeModal();
            if (typeof onSuccess === 'function') onSuccess();
        } catch (error) {
            console.error("Error al guardar jugador:", error);
            toast.error("Ocurrió un error al guardar el jugador.");
        }
    });
}