/* Service Worker: SetPoint PWA */
const CACHE_NAME = 'setpoint-v17';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './css/main.css',
    './css/variables.css',
    './css/responsive.css',
    './css/reset.css',
    './css/layout.css',
    './css/utilities.css',
    './css/animations.css',
    './css/components/forms.css',
    './css/views/players.css',
    './css/views/dashboard.css',
    './css/views/leagues.css',
    './css/views/landing.css',
    './css/views/teams.css',
    './css/views/match-detail.css',
    './css/themes/sport-futbol.css',
    './css/themes/sport-basquet.css',
    './css/themes/sport-voleibol.css',
    './js/app.js',
    './js/router.js',
    './js/sports-terms.js',
    './js/components/loading-state.js',
    './js/components/confirm-dialog.js',
    './js/components/toast.js',
    './js/components/footer.js',
    './js/components/navbar.js',
    './js/components/match-card.js',
    './js/components/player-card.js',
    './js/db/connection.js',
    './js/db/leagues.db.js',
    './js/db/teams.db.js',
    './js/db/players.db.js',
    './js/db/matches.db.js',
    './js/db/events.db.js',
    './js/db/transactions.js',
    './js/services/bracket.service.js',
    './js/services/fixture.service.js',
    './js/services/league.service.js',
    './js/services/match.service.js',
    './js/services/player.service.js',
    './js/services/standings.service.js',
    './js/services/team.service.js',
    './js/utils/date.js',
    './js/utils/debounce.js',
    './js/utils/dom.js',
    './js/utils/storage.js',
    './js/utils/validators.js',
    './js/utils/input-limit.js',
    './js/utils/tactical.js',
    './js/views/dashboard.view.js',
    './js/views/landing.view.js',
    './js/views/leagues.view.js',
    './js/views/teams.view.js',
    './js/views/team-detail.view.js',
    './js/views/matches.view.js',
    './js/views/match-detail.view.js',
    './js/views/players.view.js',
    './js/views/player-detail.view.js',
    './js/views/stats-view.js',
    './assets/Sin t\u00edtulo.png',
    './assets/setpoint logo basket.png',
    './assets/setpoint voley logo.png',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './assets/icons/apple-touch-icon.png',
    './assets/icons/favicon-32.png',
    './assets/teams_icon.png',
    './assets/partidos_totales%20icon.png',
    './assets/partidos_totales_basket%20icon.png',
    './assets/partidos_totales%20volley%20icon.png',
    './assets/partidos_finalizados_icon.png',
    './assets/partidos_finalizados%20basket%20icon.png',
    './assets/partidos_finalizados%20voley%20icon.png',
    './assets/Football Field horizontal.jpg',
    './assets/Football Field.jpg',
    './assets/volleyball-field.png',
    './assets/Wooden-Basketball-Court-Wallpaper-Mural.jpg',
    './assets/no-image.webp',
    './assets/upload-icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
            .catch((err) => console.error('Error precacheando el app shell:', err))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    // Solo interceptamos peticiones del propio origen o de CDNs permitidos (Chart.js, fuentes)
    event.respondWith(
        caches.match(request).then((cached) => {
            const network = fetch(request)
                .then((response) => {
                    if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => cached || caches.match('./index.html'));

            return cached || network;
        })
    );
});
