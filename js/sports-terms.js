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
        defaultPositions: ['Portero', 'Defensa', 'Centrocampista', 'Delantero']
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
        defaultPositions: ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot']
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
        defaultPositions: ['Colocador', 'Rematador', 'Central', 'Líbero', 'Opuesto']
    }
};

/**
 * Gets the translation config for a specific sport.
 * @param {string} sportId 
 * @returns {object} Terminology configurations
 */
export function getSportConfig(sportId) {
    return SPORTS[sportId] || SPORTS.futbol;
}
