/* js/utils/tactical.js */

export const SPORT_FIELD_IMAGES = {
    futbol: 'assets/Football Field horizontal.jpg',
    basquet: 'assets/Wooden-Basketball-Court-Wallpaper-Mural.jpg',
    voleibol: 'assets/volleyball-field.png'
};

export const SPORT_STARTERS_LIMIT = {
    futbol: 11,
    basquet: 5,
    voleibol: 6
};

export const FORMATIONS = {
    futbol: {
        '4-3-3': [
            { pos: 'PO', title: 'Portero', x: 12, y: 50 },
            { pos: 'DFI', title: 'Defensa Izquierdo', x: 28, y: 15 },
            { pos: 'DFC', title: 'Central Izquierdo', x: 25, y: 38 },
            { pos: 'DFC', title: 'Central Derecho', x: 25, y: 62 },
            { pos: 'DFD', title: 'Defensa Derecho', x: 28, y: 85 },
            { pos: 'MC', title: 'Centrocampista Izq', x: 50, y: 28 },
            { pos: 'MCD', title: 'Pivote Defensivo', x: 45, y: 50 },
            { pos: 'MC', title: 'Centrocampista Der', x: 50, y: 72 },
            { pos: 'EI', title: 'Extremo Izquierdo', x: 78, y: 20 },
            { pos: 'DC', title: 'Delantero Centro', x: 82, y: 50 },
            { pos: 'ED', title: 'Extremo Derecho', x: 78, y: 80 }
        ],
        '4-4-2': [
            { pos: 'PO', title: 'Portero', x: 12, y: 50 },
            { pos: 'DFI', title: 'Defensa Izquierdo', x: 28, y: 15 },
            { pos: 'DFC', title: 'Central Izquierdo', x: 25, y: 38 },
            { pos: 'DFC', title: 'Central Derecho', x: 25, y: 62 },
            { pos: 'DFD', title: 'Defensa Derecho', x: 28, y: 85 },
            { pos: 'MI', title: 'Medio Izquierdo', x: 52, y: 15 },
            { pos: 'MC', title: 'Centrocampista Izq', x: 48, y: 38 },
            { pos: 'MC', title: 'Centrocampista Der', x: 48, y: 62 },
            { pos: 'MD', title: 'Medio Derecho', x: 52, y: 85 },
            { pos: 'DC', title: 'Delantero Izq', x: 80, y: 35 },
            { pos: 'DC', title: 'Delantero Der', x: 80, y: 65 }
        ],
        '3-5-2': [
            { pos: 'PO', title: 'Portero', x: 12, y: 50 },
            { pos: 'DFC', title: 'Central Izquierdo', x: 26, y: 28 },
            { pos: 'DFC', title: 'Central Libero', x: 22, y: 50 },
            { pos: 'DFC', title: 'Central Derecho', x: 26, y: 72 },
            { pos: 'CAD', title: 'Carrilero Izq', x: 52, y: 12 },
            { pos: 'MC', title: 'Centrocampista Izq', x: 48, y: 32 },
            { pos: 'MCD', title: 'Pivote Central', x: 44, y: 50 },
            { pos: 'MC', title: 'Centrocampista Der', x: 48, y: 68 },
            { pos: 'CAD', title: 'Carrilero Der', x: 52, y: 88 },
            { pos: 'DC', title: 'Delantero Izq', x: 80, y: 35 },
            { pos: 'DC', title: 'Delantero Der', x: 80, y: 65 }
        ],
        '4-2-3-1': [
            { pos: 'PO', title: 'Portero', x: 12, y: 50 },
            { pos: 'DFI', title: 'Defensa Izquierdo', x: 28, y: 15 },
            { pos: 'DFC', title: 'Central Izquierdo', x: 25, y: 38 },
            { pos: 'DFC', title: 'Central Derecho', x: 25, y: 62 },
            { pos: 'DFD', title: 'Defensa Derecho', x: 28, y: 85 },
            { pos: 'MCD', title: 'Pivote Izquierdo', x: 44, y: 35 },
            { pos: 'MCD', title: 'Pivote Derecho', x: 44, y: 65 },
            { pos: 'MI', title: 'Mediapunta Izq', x: 64, y: 20 },
            { pos: 'MCO', title: 'Mediapunta Central', x: 66, y: 50 },
            { pos: 'MD', title: 'Mediapunta Der', x: 64, y: 80 },
            { pos: 'DC', title: 'Delantero Centro', x: 82, y: 50 }
        ],
        '3-4-3': [
            { pos: 'PO', title: 'Portero', x: 12, y: 50 },
            { pos: 'DFC', title: 'Central Izquierdo', x: 26, y: 28 },
            { pos: 'DFC', title: 'Central Central', x: 22, y: 50 },
            { pos: 'DFC', title: 'Central Derecho', x: 26, y: 72 },
            { pos: 'MI', title: 'Medio Izquierdo', x: 50, y: 15 },
            { pos: 'MC', title: 'Centrocampista Izq', x: 48, y: 38 },
            { pos: 'MC', title: 'Centrocampista Der', x: 48, y: 62 },
            { pos: 'MD', title: 'Medio Derecho', x: 50, y: 85 },
            { pos: 'EI', title: 'Extremo Izquierdo', x: 78, y: 20 },
            { pos: 'DC', title: 'Delantero Centro', x: 82, y: 50 },
            { pos: 'ED', title: 'Extremo Derecho', x: 78, y: 80 }
        ]
    },
    basquet: {
        '1-2-2': [
            { pos: 'PG', title: 'Base (Point Guard)', x: 50, y: 78 },
            { pos: 'SG', title: 'Escolta (Shooting Guard)', x: 25, y: 54 },
            { pos: 'SF', title: 'Alero (Small Forward)', x: 75, y: 54 },
            { pos: 'PF', title: 'Ala-Pívot (Power Forward)', x: 32, y: 26 },
            { pos: 'C', title: 'Pívot (Center)', x: 68, y: 26 }
        ],
        '2-1-2': [
            { pos: 'PG', title: 'Base', x: 35, y: 74 },
            { pos: 'SG', title: 'Escolta', x: 65, y: 74 },
            { pos: 'SF', title: 'Poste Alto (Alero)', x: 50, y: 50 },
            { pos: 'PF', title: 'Ala-Pívot', x: 30, y: 25 },
            { pos: 'C', title: 'Pívot Bajo', x: 70, y: 25 }
        ],
        '1-3-1': [
            { pos: 'PG', title: 'Base Perímetro', x: 50, y: 80 },
            { pos: 'SF', title: 'Alero Izquierdo', x: 20, y: 52 },
            { pos: 'C', title: 'Poste Central', x: 50, y: 50 },
            { pos: 'SG', title: 'Alero Derecho', x: 80, y: 52 },
            { pos: 'PF', title: 'Ala-Pívot Fondo', x: 50, y: 24 }
        ],
        '2-3': [
            { pos: 'PG', title: 'Exterior Izquierdo', x: 35, y: 68 },
            { pos: 'SG', title: 'Exterior Derecho', x: 65, y: 68 },
            { pos: 'SF', title: 'Alero Esquina Izq', x: 20, y: 32 },
            { pos: 'C', title: 'Pívot Centro', x: 50, y: 26 },
            { pos: 'PF', title: 'Ala-Pívot Esquina Der', x: 80, y: 32 }
        ]
    },
    voleibol: {
        '1-6 (Rotación)': [
            { pos: 'P1', title: 'Posición 1 (Zaguero Derecho / Saque)', x: 75, y: 75 },
            { pos: 'P6', title: 'Posición 6 (Zaguero Centro)', x: 50, y: 80 },
            { pos: 'P5', title: 'Posición 5 (Zaguero Izquierdo)', x: 25, y: 75 },
            { pos: 'P4', title: 'Posición 4 (Delantero Izquierdo / Ataque)', x: 25, y: 35 },
            { pos: 'P3', title: 'Posición 3 (Delantero Centro / Bloqueo)', x: 50, y: 30 },
            { pos: 'P2', title: 'Posición 2 (Delantero Derecho / Colocador)', x: 75, y: 35 }
        ],
        '3-3 (Red / Fondo)': [
            { pos: 'D4', title: 'Delantero Izquierdo', x: 25, y: 32 },
            { pos: 'D3', title: 'Delantero Centro', x: 50, y: 28 },
            { pos: 'D2', title: 'Delantero Derecho', x: 75, y: 32 },
            { pos: 'Z5', title: 'Zaguero Izquierdo', x: 25, y: 72 },
            { pos: 'Z6', title: 'Zaguero Centro', x: 50, y: 78 },
            { pos: 'Z1', title: 'Zaguero Derecho', x: 75, y: 72 }
        ],
        'Recepción W': [
            { pos: 'COL', title: 'Colocador Red', x: 72, y: 30 },
            { pos: 'REC1', title: 'Receptor Frente Izq', x: 20, y: 55 },
            { pos: 'REC2', title: 'Receptor Fondo Izq', x: 40, y: 75 },
            { pos: 'REC3', title: 'Receptor Fondo Der', x: 60, y: 75 },
            { pos: 'REC4', title: 'Receptor Frente Der', x: 80, y: 55 },
            { pos: 'REC5', title: 'Receptor Central', x: 50, y: 42 }
        ]
    }
};

/**
 * Normalizes sport key to one of: 'futbol', 'basquet', 'voleibol'
 */
export function normalizeSport(sportRaw) {
    if (!sportRaw) return 'futbol';
    const s = String(sportRaw).toLowerCase();
    if (s.includes('basquet') || s.includes('basket') || s.includes('baloncesto')) return 'basquet';
    if (s.includes('voley') || s.includes('volei') || s.includes('volleyball')) return 'voleibol';
    return 'futbol';
}

/**
 * Gets tactical field background image path for a sport
 */
export function getFieldImage(sportRaw) {
    const sport = normalizeSport(sportRaw);
    return SPORT_FIELD_IMAGES[sport] || SPORT_FIELD_IMAGES.futbol;
}

/**
 * Gets default formation key for a sport
 */
export function getDefaultFormationKey(sportRaw) {
    const sport = normalizeSport(sportRaw);
    const formations = FORMATIONS[sport];
    return Object.keys(formations)[0];
}

/**
 * Gets default starter positions for a given sport & formation
 */
export function getFormationPositions(sportRaw, formationKey) {
    const sport = normalizeSport(sportRaw);
    const sportFormations = FORMATIONS[sport] || FORMATIONS.futbol;
    return sportFormations[formationKey] || Object.values(sportFormations)[0];
}
