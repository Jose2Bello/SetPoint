# SetPoint — Gestor de Liga Deportiva (SPA)

Aplicación web de **una sola página (SPA)** para gestionar ligas amateur de múltiples deportes: **Fútbol**, **Básquetbol** y **Vóleibol**. Está construida con **HTML, CSS y JavaScript vanilla** (módulos ES6), usa **IndexedDB** como base de datos local del navegador, **Chart.js** (CDN) para gráficos y **LocalStorage** solo para preferencias.

---

## Integrantes y división de trabajo

| Integrante | Responsabilidades |
|---|---|
| **Jose Bello Lopez** | Desarrolló los **componentes principales** (NavBar, Footer, MatchCard, PlayerCard, ConfirmDialog, Toast, LoadingState), la **capa de IndexedDB** (`js/db/connection.js`, `js/db/*.db.js` y `js/db/transactions.js` con las operaciones de integridad) y las vistas **`#dashboard`** y **`#leagues`** (creación/edición de ligas, liga activa, fixture, bracket, exportar/importar JSON). |
| **Santiago Salas Lambarca** | Desarrolló **todo lo demás**: vistas `#teams`, `#team/:id`, `#players`, `#player/:id`, `#matches`, `#match/:id`, `#stats` y la landing; servicios de lógica de negocio (`js/services/`), mapa de terminología multi-deporte (`js/sports-terms.js`), router de hash, estilos globales, gráficos de Chart.js, filtros y la PWA (`sw.js` + `manifest.webmanifest`). |

---

## 1. Cómo ejecutar

1. Abre el archivo `index.html` en el navegador (Chrome/Edge/Firefox). No se necesita servidor ni instalación.
2. La app crea automáticamente la base de datos `leaguehub-db` en IndexedDB.
3. Desde `#leagues` crea tu primera liga (elige deporte y modalidad), agrega equipos y jugadores, genera el fixture o bracket y comienza a registrar partidos.
4. Para instalarla como PWA usa el icono "Instalar" del navegador (usa `sw.js` + `manifest.webmanifest`).

>  Si usas modo incógnito estricto que bloquee IndexedDB, la app mostrará un error de inicialización.

---

## 2. Arquitectura y stack

| Capa | Tecnología |
|---|---|
| Shell | Un único `index.html` + `css/main.css` |
| Ruteo | Hash router en `js/router.js` (`#dashboard`, `#teams`, `#team/:id`, …) |
| Vistas | Funciones `renderXxx(container, params)` en `js/views/*.view.js` |
| Componentes | Custom Elements (`<league-navbar>`, `<match-card>`, `<toast-notification>`, …) en `js/components/` |
| Lógica de negocio | `js/services/*.service.js` |
| Persistencia | `js/db/*.db.js` (CRUD) + `js/db/transactions.js` (operaciones de integridad) |
| Terminología multi-deporte | `js/sports-terms.js` |
| Gráficos | Chart.js vía CDN (`https://cdn.jsdelivr.net/npm/chart.js`) |
| Offline / PWA | `sw.js` (service worker) + `manifest.webmanifest` |

**Regla de oro de dependencias:** las capas solo se importan "hacia abajo" (vista → servicio → db). Ninguna vista importa otra vista, ningún componente importa un servicio directamente, y la capa `db/` nunca importa nada de `views/` ni `components/`.

---

## 3. Estructura de archivos

```
SetPoint/
├── index.html                     # Punto de entrada único de la SPA
├── manifest.webmanifest           # Manifest PWA (iconos, nombre, tema)
├── sw.js                          # Service Worker: precache + offline
├── README.md                      # Este documento
│
├── css/
│   ├── main.css                   # Único punto de entrada: @import de TODOS los estilos + globales
│   ├── variables.css              # Custom properties (colores, tipografías, spacing, sombras)
│   ├── reset.css                  # Normalización base
│   ├── layout.css                 # Layout del shell (navbar, main, footer)
│   ├── utilities.css              # Clases utilitarias y tarjetas glassmorphic
│   ├── animations.css             # Keyframes (fadeIn, spin, slideIn, …)
│   ├── responsive.css             # Media queries móvil (importado al final de main.css)
│   ├── components/
│   │   └── forms.css              # Estilos compartidos de formularios/inputs
│   ├── themes/
│   │   ├── sport-futbol.css       # Acentos verde esmeralda
│   │   ├── sport-basquet.css      # Acentos naranja
│   │   └── sport-voleibol.css     # Acentos violeta
│   └── views/
│       ├── dashboard.css          # Estilos del #dashboard
│       ├── leagues.css            # Estilos de ligas + bracket visual
│       ├── landing.css            # Estilos de la landing (#landing)
│       ├── players.css            # Estilos de #players
│       ├── teams.css              # Estilos de equipos + pizarra táctica (importado en main.css)
│       └── match-detail.css       # Estilos de detalle de partido (importado en main.css)
│
├── js/
│   ├── app.js                     # Bootstrapper: initDB, tema, router, guardia de inputs, SW
│   ├── router.js                  # Hash router con parámetros (:id) y estados de carga
│   ├── sports-terms.js            # Mapa centralizado de terminología por deporte
│   ├── db/
│   │   ├── connection.js          # Abre/crea leaguehub-db (v1) y define stores + índices
│   │   ├── leagues.db.js          # CRUD de ligas (name único, isActive)
│   │   ├── teams.db.js            # CRUD de equipos (índice por leagueId)
│   │   ├── players.db.js          # CRUD de jugadores (índice por teamId)
│   │   ├── matches.db.js          # CRUD de partidos (índice por leagueId)
│   │   ├── events.db.js           # CRUD de eventos de partido (índice por matchId/playerId)
│   │   └── transactions.js        # OPERACIONES DE INTEGRIDAD (ver sección 6)
│   ├── services/
│   │   ├── league.service.js      # Unicidad de nombre, export/import JSON
│   │   ├── team.service.js        # Unicidad de nombre, borrado con restricciones
│   │   ├── player.service.js      # Unicidad de número, borrado con restricciones
│   │   ├── match.service.js       # Duplicados, wrappers de finalizar/deshacer
│   │   ├── standings.service.js   # Tabla de posiciones y ranking de anotadores
│   │   ├── fixture.service.js     # Algoritmo round-robin (Berger) 1/2 vueltas
│   │   └── bracket.service.js     # Generación de bracket y avance de ganadores
│   ├── components/
│   │   ├── navbar.js              # <league-navbar>
│   │   ├── footer.js              # <league-footer> + estado de IndexedDB
│   │   ├── loading-state.js       # <loading-state>
│   │   ├── confirm-dialog.js      # <confirm-dialog> + helper confirmAction()
│   │   ├── toast.js               # <toast-notification> + objeto toast
│   │   ├── match-card.js          # <match-card>
│   │   └── player-card.js         # <player-card> (foto + dorsal)
│   ├── views/
│   │   ├── landing.view.js        # V-00  #landing (página de inicio)
│   │   ├── dashboard.view.js      # V-01  #dashboard
│   │   ├── leagues.view.js        # V-02  #leagues + #league/:id (bracket)
│   │   ├── teams.view.js          # V-03  #teams
│   │   ├── team-detail.view.js    # V-04  #team/:id (pizarra táctica)
│   │   ├── players.view.js        # V-05  #players
│   │   ├── player-detail.view.js  # V-06  #player/:id
│   │   ├── matches.view.js        # V-07  #matches
│   │   ├── match-detail.view.js   # V-08  #match/:id
│   │   ├── stats-view.js          # V-09  #stats
│   │   └── bracket.view.js        # V-10  #bracket/:id
│   └── utils/
│       ├── dom.js                 # $, $$, createElement, escapeHTML
│       ├── date.js                # formatDate, formatDateShort, formatDateTimeLocal
│       ├── validators.js          # isRequired, isNumberInRange, isValidURL, isValidJerseyNumber
│       ├── debounce.js            # debounce() para búsqueda de jugadores
│       ├── storage.js             # Wrapper LocalStorage (prefijo leaguehub_)
│       ├── input-limit.js         # Guardia global de longitud de caracteres en inputs
│       └── tactical.js            # Pizarras tácticas: imágenes, formaciones, normalizeSport
│
└── assets/
    ├── Football Field.jpg         # Cancha de fútbol (vertical, original)
    ├── Football Field horizontal.jpg # Cancha de fútbol (horizontal, usada hoy)
    ├── Wooden-Basketball-Court-Wallpaper-Mural.jpg  # Cancha de básquet
    ├── volleyball-field.png       # Cancha de vóley
    ├── Sin título.png             # Logo de fútbol
    ├── setpoint logo basket.png # Logo de básquet
    ├── setpoint voley logo.png    # Logo de vóley
    ├── icons/                     # Iconos PWA (manifest + apple-touch-icon + favicon)
    │   ├── icon-192.png           # 192×192 (any)
    │   ├── icon-512.png           # 512×512 (any y maskable)
    │   ├── apple-touch-icon.png   # 180×180 (iOS)
    │   └── favicon-32.png         # 32×32
    └── *.png (iconos de métricas, upload, no-image, favicon, …)
```

---

## 4. Mapa de terminología multi-deporte

Archivo central: **`js/sports-terms.js`**. Exporta `SPORTS` (fútbol, básquet, vóleibol) y `getSportConfig(sportId)`.

| Concepto | Fútbol | Básquet | Vóleibol |
|---|---|---|---|
| Evento de anotación | Gol | Canasta | Punto |
| Plural | Goles | Canastas | Puntos |
| Etiquetas tabla (a favor/en contra) | GF / GC | PF / PC | PF / PC |
| Ranking de anotadores | Goleadores | Encestadores | Anotadores |
| Infracciones | Tarjeta Amarilla / Roja | Falta Personal / Falta Técnica | Tarjeta Amarilla / Roja |
| Posiciones | Portero, Defensa, Centrocampista, Delantero | Base, Escolta, Alero, Ala-Pívot, Pívot | Colocador, Rematador, Central, Líbero, Opuesto |

Las vistas leen de este mapa según `league.sport`, nunca hay strings de deporte hardcodeados. Las reglas de puntuación son **idénticas** en los 3 deportes: 3 puntos por victoria, 1 por empate, 0 por derrota; desempate por diferencia de goles/puntos y luego por puntos a favor (ver `standings.service.js`).

**Tema visual por deporte:** `app.js` añade la clase `sport-futbol|basquet|voleibol` al `<body>` según la liga activa, lo que activa el CSS de `css/themes/sport-*.css` (variable `--color-accent`).

---

## 5. Capa de Base de Datos (IndexedDB) — la parte crítica

### 5.1 Conexión y esquema — `js/db/connection.js`

- Nombre de la base de datos: **`leaguehub-db`**, versión **1** (`DB_VERSION = 1`).
- `initDB()` es un **singleton** (guardia `dbPromise`) que abre la DB y crea stores/índices en `onupgradeneeded`. Devuelve la instancia.
- `getDB()` devuelve la instancia ya conectada (lanza error si aún no se inicializó).
- En `onversionchange` muestra un banner inline (no `alert`) pidiendo recargar.

### 5.2 Object Stores, claves e índices

Todos los stores usan `keyPath: 'id'` con `autoIncrement: true`.

| Store | Índices | Único |
|---|---|---|
| `leagues` | `name`, `isActive` | `name` **sí** |
| `teams` | `leagueId`, `name`, `league_name` (`[leagueId, name]` compuesto) | `league_name` **sí** |
| `players` | `teamId`, `name`, `team_number` (`[teamId, number]` compuesto) | `team_number` **sí** |
| `matches` | `leagueId`, `homeTeamId`, `awayTeamId`, `date`, `status` | no |
| `events` | `matchId`, `playerId` | no |

> Los índices compuestos únicos (`league_name`, `team_number`) garantizan a nivel de DB la unicidad de nombre de equipo dentro de liga y de número de jugador dentro de equipo.

### 5.3 Campos de cada entidad

**League** (`leagues`):
`id, name (único), sport, mode ('liga' | 'eliminacion' | 'doble-eliminacion'), rounds, bracketTeamsCount, season, description, isActive, createdAt`

**Team** (`teams`):
`id, leagueId, discipline (deporte), name, logo, primaryColor, secondaryColor, city, formation, stats, createdAt`
- `stats = { played, won, drawn, lost, goalsFor, goalsAgainst, goalsDiff, points }`

**Player** (`players`):
`id, teamId, leagueId, name, number, position, photo, pitchX, pitchY, pitchPosition, pitchLandscape, stats, createdAt`
- `stats`: unificado en **`played`** → `{ goals, played, yellowCards, redCards }` (creación y transacciones usan el mismo campo). En `player-detail.view.js` queda un fallback de lectura `?? stats.matchesPlayed` solo para tolerar datos legacy grabados antes de la normalización.

**Match** (`matches`):
`id, leagueId, homeTeamId, awayTeamId, date, status, score ({home, away}), round, nextMatchId, nextMatchHomeSlot, loserNextMatchId, loserNextMatchHomeSlot, winnerId, createdAt`
- `status` canónico (único estándar): **`'Programado'` / `'En Juego'` / `'Finalizado'`**. Todos los writes y defaults los usan (incluido `createMatch` y `<match-card>`); las vistas conservan lecturas defensivas `|| 'finished'/'scheduled'` solo para tolerar datos legacy grabados antes de la normalización.
- `nextMatchId` + `nextMatchHomeSlot` (bool): a qué partido siguiente avanza el ganador y en qué slot (true=local, false=visitante).
- `loserNextMatchId` + `loserNextMatchHomeSlot`: solo doble eliminación; a dónde cae el perdedor.
- En modalidad **liga** estos campos de bracket quedan en `null`.

**MatchEvent** (`events`):
`id, matchId, playerId, teamId, type, minute, createdAt`
- `type` = evento de anotación (`Gol`, `Canasta`, `Punto`, …) o infracción (`Tarjeta Amarilla`, `Tarjeta Roja`, `Falta Personal`, `Falta Técnica`).

### 5.4 Capa de acceso (CRUD) — `js/db/*.db.js`

Cada módulo exporta funciones helper **nombradas** y un objeto de compatibilidad:

| Módulo | Funciones principales | Compatibilidad |
|---|---|---|
| `leagues.db.js` | `getAllLeagues`, `getActiveLeague`, `getLeagueById`, `createLeague`, `updateLeague` | `leaguesDb` |
| `teams.db.js` | `getTeamsByLeague`, `getTeamById`, `createTeam`, `updateTeam`, `deleteTeam`, `getAllTeams` | `teamsDb` |
| `players.db.js` | `getAllPlayers(leagueId)`, `getPlayerById`, `getPlayersByTeam`, `createPlayer`, `updatePlayer`, `deletePlayer` | `playersDb` |
| `matches.db.js` | `getAllMatches(leagueId)`, `getMatchById`, `createMatch`, `updateMatch`, `deleteMatch` | `matchesDb` |
| `events.db.js` | `getEventsByMatch`, `getEventsByPlayer`, `createEvent`, `deleteEvent` (+ alias `createMatchEvent`, `getMatchEvents`, `deleteMatchEvent`) | `eventsDb` |

Todas abren su propia transacción `'readonly'` o `'readwrite'` de **un solo store**. **Ninguna vista/componente abre transacciones directamente**: siempre pasan por esta capa o por `transactions.js`.

---

## 6.  Transacciones de integridad — `js/db/transactions.js`

Este es el archivo más importante del proyecto. Todas las operaciones que tocan **más de una entidad** se ejecutan dentro de **una sola transacción `readwrite` real** (`db.transaction([...stores], 'readwrite')`). Si algo falla, IndexedDB aborta la transacción y **no se aplica nada** (rollback automático). Todas capturan `tx.onerror` y `tx.onabort` y devuelven una Promise.

### 6.1 `finalizeMatch(matchId, eventsList, manualWinnerId = null)`

Stores: `['matches', 'teams', 'players', 'events', 'leagues']` (los 5).

Flujo exacto:
1. Lee el partido; si no existe o ya está `'Finalizado'`, **aborta** la transacción y rechaza.
2. Lee la liga (para saber la modalidad).
3. Calcula `homeScore`/`awayScore` **contando solo eventos de anotación** (filtra infracciones por nombre: tarjeta/falta/amarilla/roja/técnica/expulsión).
4. Determina `winnerTeamId`:
   - Si hay diferencia → gana el equipo con más anotaciones.
   - Si **empate** en modo `eliminacion`/`doble-eliminacion` → **requiere `manualWinnerId`** (declaración de ganador por penales/desempate); sin él, aborta. En modo `liga` el empate es válido (no hay `winnerId`).
5. Escribe el partido: `status='Finalizado'`, `score={home,away}`, `winnerId`.
6. **Persiste todos los eventos** en el store `events` (con `matchId`, `playerId`, `teamId`, `type`, `minute`, `createdAt`).
7. **Solo en modalidad `liga`**: actualiza `stats` de ambos equipos:
   - `played+1`, `goalsFor/goalsAgainst`, recalcula `goalsDiff`, y `won+3pts | drawn+1pt | lost`.
8. **Actualiza estadísticas de cada jugador** que aparece en los eventos:
   - `played+1`, y suma `goals`, `yellowCards`, `redCards` según el `type` de cada evento.
9. **Modalidad `eliminacion` o `doble-eliminacion`**: si el partido tiene `nextMatchId`, coloca al `winnerTeamId` en el slot `home` o `away` del partido siguiente según `nextMatchHomeSlot`.
10. **Solo `doble-eliminacion`**: si el partido tiene `loserNextMatchId`, coloca al **perdedor** (el otro equipo) en el slot indicado del cuadro de perdedores.

Resuelve cuando `tx.oncomplete` dispara; rechaza en `tx.onerror`/`tx.onabort`.

### 6.2 `undoMatch(matchId)` (alias `revertMatch`)

Stores: `['matches', 'teams', 'players', 'events', 'leagues']`.

Flujo exacto:
1. Lee el partido; si no existe o **no está finalizado**, aborta y rechaza.
2. Lee la liga.
3. **Validación de restricción (bracket):** en `eliminacion`/`doble-eliminacion` lee el `nextMatchId` y el `loserNextMatchId`. Si **alguno está `'Finalizado'`**, aborta con el error:
   > "No se puede deshacer un partido si el partido de la siguiente ronda ya está finalizado. Deshaz el siguiente partido primero."
4. **Limpia los slots descendentes:** para `nextMatchId` (ganador) y `loserNextMatchId` (perdedor), pone ese slot a `null` (vuelve a "Por definir") — solo si el siguiente está `Programado` (garantizado por el paso 3).
5. Restablece el partido a `status='Programado'`, `score={0,0}`, `winnerId=null`.
6. **Elimina los eventos** asociados al partido (`eventsStore.delete(ev.id)`).
   >  Nota: a diferencia de lo que sugiere el documento de requerimientos, la implementación actual **sí borra los eventos** al deshacer.
7. **Solo modalidad `liga`**: revierte `stats` de ambos equipos (`played-1`, resta goles, `won-3pts`/`drawn-1pt`/`lost`, recalcula `goalsDiff`).
8. Revierte `stats` de cada jugador con `Math.max(0, …)` para no dejar valores negativos.

### 6.3 `activateLeague(leagueId)`

Store: `['leagues']` (readwrite). Abre cursor sobre todas las ligas y pone `isActive=true` solo a la indicada (desactiva el resto). En `oncomplete` dispara el evento `league-activated` (que refresca navbar/tema). La liga activa además se persiste en LocalStorage (`leaguehub_active_league_id`).

### 6.4 `deleteLeagueCascade(leagueId)`

Stores: `['leagues', 'teams', 'players', 'matches', 'events']`.
1. Borra la liga.
2. Recorre equipos por índice `leagueId` → los borra y, por cada equipo, borra sus jugadores (índice `teamId`).
3. Recorre partidos por índice `leagueId` → los borra y, por cada partido, borra sus eventos (índice `matchId`).

### 6.5 `saveMatchesList(matchesList)`

Store: `['matches']`. Inserta la lista de partidos (usada por la generación de fixture). Normaliza `leagueId`, equipos a `Number` (o `null`), `status='Programado'`, `score={0,0}`, `winnerId=null`.

### 6.6 `importLeagueData(dump)`

Stores: `['leagues', 'teams', 'players', 'matches', 'events']`. Importa en cascada re-mapeando IDs:
1. Inserta la liga (sin `isActive`), obtiene el nuevo ID.
2. Por cada equipo: lo inserta con su nuevo `leagueId` y guarda `teamIdMap[viejoId] = nuevoId`; luego inserta sus jugadores y guarda `playerIdMap`.
3. Por cada partido: inserta con equipos remapeados, `nextMatchId` a resolver, y sus eventos con `playerId`/`teamId` remapeados.
4. Al terminar resuelve los `nextMatchId` apuntando a los nuevos IDs de partido.
5. `isActive=false` siempre (la importada nunca se activa automáticamente).

> No usa múltiples `await` con transacciones separadas: es **una sola transacción `readwrite`** sobre los 5 stores.

### 6.7 Compatibilidad de exports

Además de las funciones nombradas, el archivo exporta `revertMatch` (alias de `undoMatch`) y el objeto `transactions = { activateLeague, deleteLeagueCascade, finalizeMatch, undoMatch, revertMatch, saveMatchesList, importLeagueData }`.

---

## 7. Capa de servicios — `js/services/`

| Servicio | Responsabilidad |
|---|---|
| `standings.service.js` | `getStandings(teams)` ordena por puntos → diferencia → a favor → nombre; `getPlayerRanking(players)` ordena por goles → menos partidos jugados → nombre. |
| `fixture.service.js` | `generateFixture(leagueId, teamIds, doubleRound, startDate)` — round-robin (Berger) con equipo ficticio (BYE) si es impar; 1 o 2 vueltas; partidos de la misma jornada el mismo día con 2h de diferencia y rondas con 7 días de separación. |
| `bracket.service.js` | `generateBracket(leagueId, teamIds)` (4/8/16, eliminación simple y doble; construye desde la final hacia atrás con `nextMatchId`/`loserNextMatchId`; doble elim. incluye Cuadro Ganadores/Perdedores + Gran Final). `updateMatchResult(...)` propaga ganador/perdedor y limpia slots al revertir. |
| `league.service.js` | `isNameDuplicate`, `exportLeague(leagueId)` (dump JSON completo), `importLeague(jsonString)` (valida schema y dispara `importLeagueData`). |
| `team.service.js` | `isNameDuplicate`, `deleteTeam` (bloquea si el equipo tiene partidos), `getInitials`. |
| `player.service.js` | `isNumberTaken`, `deletePlayer` (bloquea si tiene eventos vía índice `playerId`). |
| `match.service.js` | `isMatchDuplicate` (misma pareja el mismo día), wrappers `finalizeMatch`/`undoMatch` hacia las transacciones. |

---

## 8. Router — `js/router.js`

- Escucha `hashchange` y renderiza en `#app` según la ruta.
- Rutas: `landing`, `dashboard`, `leagues`, `league/:id`, `teams`, `team/:id`, `matches`, `match/:id`, `match-detail/:id` (alias), `players`, `player/:id`, `stats`, `bracket/:id`.
- Muestra `<loading-state>` durante la carga, maneja errores por vista (tarjeta con botón recargar) y 404.
- `router.navigate(hash)` navega programáticamente. Tras renderizar resalta el enlace activo del navbar.

## 9. Vistas — `js/views/`

| Vista | Ruta | Qué muestra |
|---|---|---|
| `landing.view.js` | `#landing` | Pantalla de bienvenida. Sección **Hero** con título, subtítulo y CTAs contextuales (si no hay ligas → "Crear mi primera Liga"; si ya existen → "Ir al Dashboard"). Bloque **¿Cómo funciona?** con los 5 pasos de uso. Zona dinámica con el **resumen de la liga activa**: cuatro KPIs (equipos, jugadores, partidos, finalizados), panel de próximo partido y último resultado, tabla de posiciones (top 5, solo modo liga) y ranking de anotadores. Si no hay ninguna liga creada, muestra un estado vacío con botón de creación. |
| `dashboard.view.js` | `#dashboard` | Cabecera de liga activa, próximo partido, último resultado, mini tabla (top 5) o resumen de bracket, y **3 gráficos Chart.js**: barras (PF), doughnut (V/E/D), línea (evolución de PF). |
| `leagues.view.js` | `#leagues` + `#league/:id` | Listado de ligas (crear/editar/eliminar/activar/exportar/importar JSON) y detalle con tabs: **Bracket** (árbol horizontal con conectores SVG, tarjetas editables por admin), **Inscripciones** (alta de equipos), **Partidos**. |
| `teams.view.js` | `#teams` | Galería de equipos con escudo, nº jugadores y posición; formulario crear/editar (nombre, escudo, colores, ciudad). |
| `team-detail.view.js` | `#team/:id` | Cabecera con estadísticas calculadas en tiempo real desde los partidos finalizados (Jugados/Ganados/Empatados/Perdidos, Goles/Puntos a Favor y en Contra, Diferencia, Puntos, Posición en la tabla), **pizarra táctica** (campo horizontal, formaciones, arrastre de jugadores, banquillo), próximos partidos, historial con resultado V/E/D y mini gráfico de evolución de puntos. |
| `players.view.js` | `#players` | Búsqueda con debounce, filtros por equipo/posición, galería de tarjetas; modal crear/editar jugador (foto, dorsal, posición, equipo). Exporta `openPlayerModal` y `setupPlayerModal`. |
| `player-detail.view.js` | `#player/:id` | Cabecera con foto/número/posición/equipo, estadísticas, historial de partidos con anotaciones y mini gráfico de barras. |
| `matches.view.js` | `#matches` | Filtros por estado/equipo/fecha, listado ordenado por fecha, modal crear/editar partido y registro rápido de eventos. |
| `match-detail.view.js` | `#match/:id` | Cabecera de partido con marcador, registro de eventos (anotación o infracción) por equipo y jugador, lista de eventos con opción de eliminar, botones **Finalizar** (con declaración de ganador en brackets si hay empate), **Deshacer**, **Cambiar Estado** y **🔄 Cambiar Equipos** (solo partidos no finalizados). |
| `stats-view.js` | `#stats` | Tabla de posiciones (liga) o bracket (eliminación), ranking de anotadores, ranking Fair Play (amarillas/rojas), KPI de infracciones y gráficos comparativos. |

## 10. Componentes — `js/components/`

| Custom Element | Descripción |
|---|---|
| `league-navbar` | Barra superior fija con logo por deporte, enlaces a las 6 vistas y nombre de liga activa. |
| `league-footer` | Créditos + indicador de estado de IndexedDB (Conectado/Error). |
| `loading-state` | Spinner de carga reutilizable. |
| `confirm-dialog` | Modal de confirmación (sin diálogos nativos); exporta `confirmAction(title, message, options)` que puede incluir `choices` (selector). |
| `toast-notification` | Notificaciones flotantes; exporta objeto `toast` (`success/error/info/warning`). |
| `match-card` | Tarjeta de partido (marcador o "VS", ronda/fecha, estado) → `#match/:id`. |
| `player-card` | Tarjeta de jugador con foto (o placeholder con dorsal) y badge de dorsal. |

## 11. Utilidades — `js/utils/`

- `dom.js`: `$`, `$$`, `createElement(tag, opts)`, `escapeHTML`.
- `date.js`: `formatDate`, `formatDateShort`, `formatDateTimeLocal`.
- `validators.js`: `isRequired`, `isNumberInRange`, `isValidURL`, `isValidJerseyNumber` (0–99).
- `debounce.js`: `debounce(fn, wait)`.
- `storage.js`: wrapper seguro de LocalStorage con prefijo `leaguehub_`; claves usadas: `active_league_id`, `theme`. Exporta también `getActiveLeagueFromStorage`/`setActiveLeagueInStorage`.
- `input-limit.js`: `initGlobalInputLimits()` (se inicializa en `app.js`) asigna `maxlength` a todos los inputs/textarea y trunca automáticamente valores largos (límites: texto 120, textarea 500, numérico 9999; campos específicos con `maxlength` propio como nombres=60, descripción=300).
- `tactical.js`: `SPORT_FIELD_IMAGES` (canchas), `SPORT_STARTERS_LIMIT` (11/5/6), `FORMATIONS` por deporte, `normalizeSport`, `getFieldImage`, `getDefaultFormationKey`, `getFormationPositions`. La cancha de fútbol se muestra **horizontal** (`assets/Football Field horizontal.jpg`).

## 12. LocalStorage vs IndexedDB

- **IndexedDB** (`leaguehub-db`): todos los datos relacionales (ligas, equipos, jugadores, partidos, eventos).
- **LocalStorage** (prefijo `leaguehub_`): solo preferencias — `active_league_id` y `theme` (`dark` por defecto / `light`).

## 13. PWA / Offline — `sw.js`

- Precache del "app shell" (HTML, CSS, JS, assets, incluidas las canchas) en `setpoint-v7`.
- `install` → precache, `activate` → limpia cachés viejas, `fetch` → sirve desde caché para GET.
- Requiere actualizar `CACHE_NAME` cuando cambien los archivos precacheados.

## 13. Capturas de las vistas



## 14. Decisiones técnicas relevantes

1. **Transacciones reales de IndexedDB** para toda operación multi-entidad (ver sección 6). No se simulan con múltiples `await`.
2. **Estados de partido** canónicos `Programado` / `En Juego` / `Finalizado`.
3. **Bracket de doble eliminación**: campos `loserNextMatchId`/`loserNextMatchHomeSlot` además de `nextMatchId`; el perdedor cae al cuadro de perdedores en la misma transacción de `finalizeMatch`.
4. **Empates en brackets** prohibidos: `finalizeMatch` aborta si hay empate sin `manualWinnerId`.
5. **Puntaje idéntico entre deportes** (3/1/0) con desempate por diferencia y luego a favor.
6. **Terminología centralizada** en `sports-terms.js`; el cambio de un término se refleja en toda la app.
7. **Cancha de fútbol en horizontal** (imagen rotada) con coordenadas de formación remapeadas y migración `pitchLandscape` para datos previos.
8. **Sin diálogos nativos** (`alert`/`confirm`/`prompt`): se usan `<confirm-dialog>` y `<toast-notification>`.
9. **Guardia de caracteres global** en formularios (`input-limit.js`).
10. **CSS**: `css/main.css` es el único punto de entrada: `@import` de todas las hojas (incluidas `teams.css`, `match-detail.css` y `responsive.css` al final para ganar la cascada). `index.html` solo linkea `main.css`.
