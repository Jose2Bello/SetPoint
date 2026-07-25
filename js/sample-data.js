/* js/sample-data.js */

// Mock Templates for Fast Debugging
export const SAMPLE_LEAGUES = [
    {
        name: "LaLiga Santander - Fútbol (Liga)",
        sport: "futbol",
        mode: "liga",
        season: "Temporada 2026",
        description: "Liga de fútbol profesional con fixture round-robin a una sola vuelta.",
        teams: [
            { id: 1, name: "Real Madrid CF", shield: "", primaryColor: "#ffffff", secondaryColor: "#1e3a8a", city: "Madrid" },
            { id: 2, name: "FC Barcelona", shield: "", primaryColor: "#930925", secondaryColor: "#004d98", city: "Barcelona" },
            { id: 3, name: "Atlético de Madrid", shield: "", primaryColor: "#e01e22", secondaryColor: "#001e62", city: "Madrid" },
            { id: 4, name: "Real Sociedad", shield: "", primaryColor: "#0066b2", secondaryColor: "#ffffff", city: "San Sebastián" }
        ],
        players: [
            // Real Madrid
            { id: 1, teamId: 1, name: "Kylian Mbappé", position: "Delantero", number: 9 },
            { id: 2, teamId: 1, name: "Vinicius Jr", position: "Delantero", number: 7 },
            { id: 3, teamId: 1, name: "Jude Bellingham", position: "Centrocampista", number: 5 },
            { id: 4, teamId: 1, name: "Thibaut Courtois", position: "Portero", number: 1 },
            // Barcelona
            { id: 5, teamId: 2, name: "Robert Lewandowski", position: "Delantero", number: 9 },
            { id: 6, teamId: 2, name: "Lamine Yamal", position: "Delantero", number: 19 },
            { id: 7, teamId: 2, name: "Pedri González", position: "Centrocampista", number: 8 },
            { id: 8, teamId: 2, name: "Marc-André ter Stegen", position: "Portero", number: 1 },
            // Atletico Madrid
            { id: 9, teamId: 3, name: "Antoine Griezmann", position: "Delantero", number: 7 },
            { id: 10, teamId: 3, name: "Julian Alvarez", position: "Delantero", number: 9 },
            { id: 11, teamId: 3, name: "Koke Resurrección", position: "Centrocampista", number: 6 },
            // Real Sociedad
            { id: 12, teamId: 4, name: "Mikel Oyarzabal", position: "Delantero", number: 10 },
            { id: 13, teamId: 4, name: "Martin Zubimendi", position: "Centrocampista", number: 4 }
        ],
        matches: [
            // Round 1
            { id: 1, homeTeamId: 1, awayTeamId: 2, date: "2026-08-01T18:00:00.000Z", status: "Finalizado", score: { home: 3, away: 2 }, round: 1, winnerId: 1 },
            { id: 2, homeTeamId: 3, awayTeamId: 4, date: "2026-08-01T20:00:00.000Z", status: "Finalizado", score: { home: 1, away: 1 }, round: 1, winnerId: null },
            // Round 2
            { id: 3, homeTeamId: 1, awayTeamId: 3, date: "2026-08-08T18:00:00.000Z", status: "Finalizado", score: { home: 2, away: 0 }, round: 2, winnerId: 1 },
            { id: 4, homeTeamId: 2, awayTeamId: 4, date: "2026-08-08T20:00:00.000Z", status: "Programado", score: { home: 0, away: 0 }, round: 2, winnerId: null },
            // Round 3
            { id: 5, homeTeamId: 4, awayTeamId: 1, date: "2026-08-15T18:00:00.000Z", status: "Programado", score: { home: 0, away: 0 }, round: 3, winnerId: null },
            { id: 6, homeTeamId: 2, awayTeamId: 3, date: "2026-08-15T20:00:00.000Z", status: "Programado", score: { home: 0, away: 0 }, round: 3, winnerId: null }
        ],
        events: [
            // Real Madrid 3 - 2 Barcelona (Match 1)
            { matchId: 1, playerId: 1, teamId: 1, type: "Gol", minute: 14 }, // Mbappe
            { matchId: 1, playerId: 2, teamId: 1, type: "Gol", minute: 45 }, // Vinicius
            { matchId: 1, playerId: 5, teamId: 2, type: "Gol", minute: 60 }, // Lewandowski
            { matchId: 1, playerId: 6, teamId: 2, type: "Gol", minute: 72 }, // Yamal
            { matchId: 1, playerId: 3, teamId: 1, type: "Gol", minute: 90 }, // Bellingham
            
            // Atletico Madrid 1 - 1 Real Sociedad (Match 2)
            { matchId: 2, playerId: 9, teamId: 3, type: "Gol", minute: 32 }, // Griezmann
            { matchId: 2, playerId: 12, teamId: 4, type: "Gol", minute: 88 }, // Oyarzabal
            
            // Real Madrid 2 - 0 Atletico Madrid (Match 3)
            { matchId: 3, playerId: 1, teamId: 1, type: "Gol", minute: 23 }, // Mbappe
            { matchId: 3, playerId: 1, teamId: 1, type: "Gol", minute: 75 }  // Mbappe
        ]
    },
    {
        name: "NBA Cup - Básquetbol (Eliminación)",
        sport: "basquet",
        mode: "eliminacion",
        bracketTeamsCount: 4,
        season: "Playoffs 2026",
        description: "Torneo de llaves por eliminación directa con 4 equipos sembrados.",
        teams: [
            { id: 5, name: "Los Angeles Lakers", shield: "", primaryColor: "#552583", secondaryColor: "#fdb927", city: "Los Ángeles" },
            { id: 6, name: "Boston Celtics", shield: "", primaryColor: "#007a33", secondaryColor: "#ba9653", city: "Boston" },
            { id: 7, name: "Golden State Warriors", shield: "", primaryColor: "#1d428a", secondaryColor: "#ffc72c", city: "San Francisco" },
            { id: 8, name: "Miami Heat", shield: "", primaryColor: "#98002e", secondaryColor: "#f9a01b", city: "Miami" }
        ],
        players: [
            // Lakers
            { id: 14, teamId: 5, name: "LeBron James", position: "Alero", number: 23 },
            { id: 15, teamId: 5, name: "Anthony Davis", position: "Ala-Pívot", number: 3 },
            // Celtics
            { id: 16, teamId: 6, name: "Jayson Tatum", position: "Alero", number: 0 },
            { id: 17, teamId: 6, name: "Jaylen Brown", position: "Escolta", number: 7 },
            // Warriors
            { id: 18, teamId: 7, name: "Stephen Curry", position: "Base", number: 30 },
            { id: 19, teamId: 7, name: "Draymond Green", position: "Ala-Pívot", number: 23 },
            // Heat
            { id: 20, teamId: 8, name: "Jimmy Butler", position: "Alero", number: 22 }
        ],
        matches: [
            // Final Round (To be played, winner of match 8 vs winner of match 9)
            // match 7 will have Lakers (from match 8) vs Winner of Warriors/Heat (from match 9)
            { id: 7, homeTeamId: 5, awayTeamId: null, date: "2026-08-10T20:00:00.000Z", status: "Programado", score: { home: 0, away: 0 }, round: "Final", nextMatchId: null, nextMatchHomeSlot: null, winnerId: null },
            
            // Semifinal Round
            { id: 8, homeTeamId: 5, awayTeamId: 6, date: "2026-08-05T18:00:00.000Z", status: "Finalizado", score: { home: 102, away: 98 }, round: "Semifinal", nextMatchId: 7, nextMatchHomeSlot: true, winnerId: 5 },
            { id: 9, homeTeamId: 7, awayTeamId: 8, date: "2026-08-05T20:00:00.000Z", status: "Programado", score: { home: 0, away: 0 }, round: "Semifinal", nextMatchId: 7, nextMatchHomeSlot: false, winnerId: null }
        ],
        events: [
            // Lakers 102 - 98 Celtics (Match 8)
            // (In basketball, we record some scoring events for players; in our cosmetic terms, they are Canastas)
            { matchId: 8, playerId: 14, teamId: 5, type: "Canasta", minute: 5 },
            { matchId: 8, playerId: 14, teamId: 5, type: "Canasta", minute: 10 },
            { matchId: 8, playerId: 15, teamId: 5, type: "Canasta", minute: 15 },
            { matchId: 8, playerId: 16, teamId: 6, type: "Canasta", minute: 8 },
            { matchId: 8, playerId: 17, teamId: 6, type: "Canasta", minute: 22 }
        ]
    }
];

/**
 * Inserts a sample template league into the DB.
 * Calculates initial stats correctly for the Football teams.
 * @param {object} template 
 * @returns {Promise<number>} New league ID
 */
import { transactions } from './db/transactions.js';
import { leaguesDb } from './db/leagues.db.js';

export async function insertTemplateLeague(template) {
    const dump = {
        generator: "LeagueHub",
        league: {
            name: template.name,
            sport: template.sport,
            mode: template.mode,
            rounds: template.rounds || "1",
            bracketTeamsCount: template.bracketTeamsCount || null,
            season: template.season,
            description: template.description
        },
        teams: template.teams.map(t => {
            // Recalculate stats for the football template teams dynamically based on match history to ensure correctness
            const teamStats = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalsDiff: 0, points: 0 };
            
            if (template.mode === 'liga') {
                template.matches.forEach(m => {
                    if (m.status !== 'Finalizado') return;
                    if (m.homeTeamId === t.id) {
                        teamStats.played++;
                        teamStats.goalsFor += m.score.home;
                        teamStats.goalsAgainst += m.score.away;
                        if (m.score.home > m.score.away) {
                            teamStats.won++;
                            teamStats.points += 3;
                        } else if (m.score.home === m.score.away) {
                            teamStats.drawn++;
                            teamStats.points += 1;
                        } else {
                            teamStats.lost++;
                        }
                    } else if (m.awayTeamId === t.id) {
                        teamStats.played++;
                        teamStats.goalsFor += m.score.away;
                        teamStats.goalsAgainst += m.score.home;
                        if (m.score.away > m.score.home) {
                            teamStats.won++;
                            teamStats.points += 3;
                        } else if (m.score.home === m.score.away) {
                            teamStats.drawn++;
                            teamStats.points += 1;
                        } else {
                            teamStats.lost++;
                        }
                    }
                });
                teamStats.goalsDiff = teamStats.goalsFor - teamStats.goalsAgainst;
            }
            
            return {
                ...t,
                stats: teamStats
            };
        }),
        players: template.players.map(p => {
            // Count goals
            const goals = template.events.filter(e => e.playerId === p.id).length;
            const played = goals > 0 ? 1 : 0; // Scorers get 1 played game
            return {
                ...p,
                stats: { played, goals }
            };
        }),
        matches: template.matches,
        events: template.events
    };

    // Use transaction module to import
    await transactions.importLeagueData(dump);
}
