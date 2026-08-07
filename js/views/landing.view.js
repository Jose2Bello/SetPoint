/* js/views/landing.view.js */
import { getAllLeagues, getActiveLeague, getLeagueById } from '../db/leagues.db.js';
import { getTeamsByLeague } from '../db/teams.db.js';
import { getAllPlayers } from '../db/players.db.js';
import { getAllMatches } from '../db/matches.db.js';
import { getSportConfig } from '../sports-terms.js';
import { standingsService } from '../services/standings.service.js';
import { storage } from '../utils/storage.js';
import { escapeHTML } from '../utils/dom.js';

const STEPS = [
    { title: 'Crea tu liga', desc: 'Elige deporte, modalidad y vueltas. Todo lo que crees después pertenece a esa liga.' },
    { title: 'Inscribe los equipos', desc: 'Los equipos no son globales: cada liga tiene los suyos. Entra a tu liga y usa "+ Inscribir Nuevo Equipo".' },
    { title: 'Genera el calendario', desc: 'Usa "Generar Fixture" para el todos contra todos, o programa partidos a mano.' },
    { title: 'Registra los resultados', desc: 'Finaliza cada partido y las posiciones se actualizan solas.' },
    { title: 'Revisa las estadísticas', desc: 'Tabla de posiciones, anotadores y juego limpio.' }
];

export function renderLandingView(container, onNavigateToApp) {
    container.textContent = '';

    const go = (route) => { window.location.hash = route; };

    const wrapper = document.createElement('div');
    wrapper.className = 'landing-wrapper';
    container.appendChild(wrapper);

    // ---------- Hero ----------
    const hero = document.createElement('section');
    hero.className = 'landing-hero glass-card';

    const heroText = document.createElement('div');
    heroText.className = 'landing-hero-text';

    const h1 = document.createElement('h1');
    h1.className = 'landing-hero-title';
    h1.innerHTML = 'Bienvenido a <span class="landing-brand">SetPoint</span>';
    heroText.appendChild(h1);

    const subtitle = document.createElement('p');
    subtitle.className = 'landing-hero-subtitle';
    subtitle.textContent = 'La plataforma todo en uno para administrar ligas, torneos, plantillas y estadísticas de tus deportes favoritos. Todo offline, sin servidor.';
    heroText.appendChild(subtitle);

    const ctaRow = document.createElement('div');
    ctaRow.className = 'landing-cta-row';

    const mainCta = document.createElement('button');
    mainCta.className = 'btn btn-primary';
    mainCta.textContent = 'Ir al Dashboard';
    ctaRow.appendChild(mainCta);

    const secondaryCta = document.createElement('a');
    secondaryCta.className = 'btn btn-secondary';
    secondaryCta.href = '#leagues';
    secondaryCta.textContent = 'Ver Ligas';
    ctaRow.appendChild(secondaryCta);

    heroText.appendChild(ctaRow);
    hero.appendChild(heroText);

    wrapper.appendChild(hero);

    // ---------- Zona dinámica (datos de IndexedDB) ----------
    const contentArea = document.createElement('section');
    contentArea.className = 'landing-content';
    contentArea.innerHTML = '<div class="landing-loading">Cargando datos…</div>';
    wrapper.appendChild(contentArea);

    // ---------- Paso a paso ----------
    const stepsSection = document.createElement('section');
    stepsSection.className = 'landing-steps';
    stepsSection.innerHTML = `
        <h2 class="landing-steps-title">¿Cómo funciona?</h2>
        <p class="landing-steps-subtitle">Así se usa la página, de principio a fin.</p>
        <div class="landing-steps-grid">
            ${STEPS.map((s, i) => `
                <div class="landing-step glass-card">
                    <span class="landing-step-num">${i + 1}</span>
                    <h3 class="landing-step-title">${s.title}</h3>
                    <p class="landing-step-desc">${s.desc}</p>
                </div>
            `).join('')}
        </div>
    `;
    wrapper.appendChild(stepsSection);

    // ---------- Lógica de datos ----------
    (async () => {
        let leagues = [];
        try {
            leagues = await getAllLeagues();
        } catch (e) {
            console.error('Error cargando ligas en landing:', e);
        }

        let league = null;
        const storedId = storage.getActiveLeagueId();
        if (storedId) {
            try {
                league = await getLeagueById(storedId);
            } catch (e) {
                league = null;
            }
        }
        if (!league) {
            try {
                league = await getActiveLeague();
            } catch (e) {
                league = null;
            }
        }

        // CTA principal contextual
        if (leagues.length === 0) {
            mainCta.textContent = 'Crear mi primera Liga';
            mainCta.onclick = () => go('leagues');
        } else {
            mainCta.onclick = () => onNavigateToApp();
        }

        if (!league) {
            contentArea.innerHTML = `
                <div class="landing-empty-state glass-card">
                    <h2>Empecemos</h2>
                    <p>Crea tu primera liga para comenzar a administrar equipos, jugadores y partidos.</p>
                    <a href="#leagues" class="btn btn-primary">+ Crear Liga</a>
                </div>
            `;
            return;
        }

        let teams = [];
        let players = [];
        let matches = [];
        try {
            [teams, players, matches] = await Promise.all([
                getTeamsByLeague(league.id),
                getAllPlayers(league.id),
                getAllMatches(league.id)
            ]);
        } catch (e) {
            console.error('Error cargando datos de la liga en landing:', e);
            contentArea.innerHTML = '<p class="text-muted" style="text-align:center;">No se pudieron cargar los datos de la liga.</p>';
            return;
        }

        contentArea.innerHTML = renderLeagueSummary(league, teams, players, matches);
        contentArea.querySelectorAll('[data-match-link]').forEach(el => {
            el.addEventListener('click', () => go('match/' + el.getAttribute('data-match-link')));
        });
    })();
}

function renderLeagueSummary(league, teams, players, matches) {
    const sport = getSportConfig(league.sport);
    const isBracket = league.mode === 'eliminacion' || league.mode === 'doble-eliminacion';
    const modeLabel = league.mode === 'eliminacion'
        ? 'Eliminación Directa'
        : league.mode === 'doble-eliminacion' ? 'Doble Eliminación' : 'Liga Regular';
    const teamMap = new Map(teams.map(t => [Number(t.id), t]));

    const nextMatch = matches.find(m => m.status === 'En Juego') || matches.find(m => m.status === 'Programado') || null;
    const lastMatch = [...matches].reverse().find(m => m.status === 'Finalizado') || null;

    const standings = isBracket ? [] : standingsService.getStandings(teams).slice(0, 5);
    const topScorers = [...players]
        .map(p => ({ name: p.name, goals: p.stats?.goals || 0 }))
        .filter(p => p.goals > 0)
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 3);

    const finishedCount = matches.filter(m => m.status === 'Finalizado').length;

    const matchCard = (m) => {
        const home = teamMap.get(Number(m.homeTeamId));
        const away = teamMap.get(Number(m.awayTeamId));
        const homeName = home ? escapeHTML(home.name) : 'Por definir';
        const awayName = away ? escapeHTML(away.name) : 'Por definir';
        const isFinished = m.status === 'Finalizado';
        const score = isFinished
            ? `<span class="landing-match-score">${m.score?.home ?? 0} - ${m.score?.away ?? 0}</span>`
            : '<span class="landing-match-vs">VS</span>';
        return `
            <div class="landing-match-row" data-match-link="${m.id}">
                <div class="landing-match-top">
                    <div class="landing-match-teams">
                        <span class="fw-bold">${homeName}</span>
                        <span class="landing-match-sep">vs</span>
                        <span class="fw-bold">${awayName}</span>
                    </div>
                    ${score}
                </div>
                <div class="landing-match-meta">
                    ${m.date ? new Date(m.date).toLocaleDateString() : 'Fecha no definida'}
                    ${m.round ? ` · Ronda ${escapeHTML(m.round)}` : ''}
                </div>
            </div>
        `;
    };

    return `
        <div class="landing-league-header">
            <div class="landing-league-info">
                <h2>${escapeHTML(league.name)}</h2>
                <div class="landing-league-meta">
                    <span class="badge">${escapeHTML(sport.name)}</span>
                    <span class="badge">${escapeHTML(league.season || 'Temporada actual')}</span>
                    <span class="badge">${modeLabel}</span>
                </div>
            </div>
        </div>

        <div class="landing-stats-grid">
            <div class="landing-stat-card glass-card">
                <div class="landing-stat-num">${teams.length}</div>
                <div class="landing-stat-label">Equipos</div>
            </div>
            <div class="landing-stat-card glass-card">
                <div class="landing-stat-num">${players.length}</div>
                <div class="landing-stat-label">Jugadores</div>
            </div>
            <div class="landing-stat-card glass-card">
                <div class="landing-stat-num">${matches.length}</div>
                <div class="landing-stat-label">Partidos</div>
            </div>
            <div class="landing-stat-card glass-card">
                <div class="landing-stat-num">${finishedCount}</div>
                <div class="landing-stat-label">Finalizados</div>
            </div>
        </div>

        <div class="landing-panels">
            <div class="glass-panel landing-panel">
                <h3 class="landing-panel-title">Próximo Partido</h3>
                ${nextMatch ? matchCard(nextMatch) : '<p class="text-muted text-sm">No hay partidos programados todavía.</p>'}
            </div>
            <div class="glass-panel landing-panel">
                <h3 class="landing-panel-title">Último Resultado</h3>
                ${lastMatch ? matchCard(lastMatch) : '<p class="text-muted text-sm">Todavía no se ha jugado ningún partido.</p>'}
            </div>
        </div>

        <div class="landing-lower">
            ${standings.length ? `
            <div class="glass-panel landing-panel">
                <h3 class="landing-panel-title">Tabla de Posiciones</h3>
                <table class="landing-table">
                    <thead>
                        <tr><th>#</th><th>Equipo</th><th>PJ</th><th>${sport.scoreLabelFor}</th><th>Pts</th></tr>
                    </thead>
                    <tbody>
                        ${standings.map((t, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td class="fw-bold">${escapeHTML(t.name)}</td>
                                <td>${t.stats?.played ?? 0}</td>
                                <td>${t.stats?.goalsFor ?? 0}</td>
                                <td class="landing-pts">${t.stats?.points ?? 0}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>` : ''}
            ${topScorers.length ? `
            <div class="glass-panel landing-panel">
                <h3 class="landing-panel-title">${escapeHTML(sport.rankingTitle)}</h3>
                ${topScorers.map((p, i) => `
                    <div class="landing-scorer-row">
                        <span class="landing-scorer-pos">${i + 1}</span>
                        <span class="fw-bold">${escapeHTML(p.name)}</span>
                        <span class="landing-scorer-goals">${p.goals} ${escapeHTML(sport.scoreEventPlural)}</span>
                    </div>`).join('')}
            </div>` : ''}
        </div>
    `;
}
