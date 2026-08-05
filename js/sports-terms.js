/* js/sports-terms.js */

export const SPORTS = {
    futbol: {
        id: 'futbol',
        name: 'Fútbol',
        scoreEvent: 'Gol',
        scoreEventPlural: 'Goles',
        scoreLabelFor: 'GF', // Goles a Favor
        scoreLabelAgainst: 'GC', // Goles en Contra
        rankingTitle: 'Goleadores',
        themeClass: 'sport-futbol',
        icon: '⚽',
        logo: 'assets/Sin título.png',
        defaultPositions: ['Portero', 'Defensa', 'Centrocampista', 'Delantero'],
        infractions: [
            { type: 'Tarjeta Amarilla', key: 'yellowCards', label: '🟨 Tarjeta Amarilla', short: '🟨 Amarilla' },
            { type: 'Tarjeta Roja', key: 'redCards', label: '🟥 Tarjeta Roja', short: '🟥 Roja' }
        ]
    },
    basquet: {
        id: 'basquet',
        name: 'Básquetbol',
        scoreEvent: 'Canasta',
        scoreEventPlural: 'Canastas',
        scoreLabelFor: 'PF', // Puntos a Favor
        scoreLabelAgainst: 'PC', // Puntos en Contra
        rankingTitle: 'Encestadores',
        themeClass: 'sport-basquet',
        icon: '🏀',
        logo: 'assets/set point logo basket.png',
        defaultPositions: ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'],
        infractions: [
            { type: 'Falta Personal', key: 'yellowCards', label: '🟨 Falta Personal', short: '🟨 Falta' },
            { type: 'Falta Técnica / Expulsión', key: 'redCards', label: '🟥 Falta Técnica', short: '🟥 Técnica' }
        ]
    },
    voleibol: {
        id: 'voleibol',
        name: 'Vóleibol',
        scoreEvent: 'Punto',
        scoreEventPlural: 'Puntos',
        scoreLabelFor: 'PF', // Puntos a Favor
        scoreLabelAgainst: 'PC', // Puntos en Contra
        rankingTitle: 'Anotadores',
        themeClass: 'sport-voleibol',
        icon: '🏐',
        logo: 'assets/setpoint voley logo.png',
        defaultPositions: ['Colocador', 'Rematador', 'Central', 'Líbero', 'Opuesto'],
        infractions: [
            { type: 'Tarjeta Amarilla', key: 'yellowCards', label: '🟨 Tarjeta Amarilla', short: '🟨 Amarilla' },
            { type: 'Tarjeta Roja', key: 'redCards', label: '🟥 Tarjeta Roja', short: '🟥 Roja' }
        ]
    }
};

/**
 * Gets the translation config for a specific sport.
 * @param {string} sportId 
 * @returns {object} Terminology configurations
 */
export function getSportConfig(sportId) {
    const config = SPORTS[sportId] || SPORTS.futbol;
    return {
        ...config,
        infractions: config.infractions || [
            { type: 'Tarjeta Amarilla', key: 'yellowCards', label: '🟨 Tarjeta Amarilla', short: '🟨 Amarilla' },
            { type: 'Tarjeta Roja', key: 'redCards', label: '🟥 Tarjeta Roja', short: '🟥 Roja' }
        ]
    };
}

