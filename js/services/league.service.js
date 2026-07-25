/* js/services/league.service.js */
import { leaguesDb } from '../db/leagues.db.js';
import { teamsDb } from '../db/teams.db.js';
import { playersDb } from '../db/players.db.js';
import { matchesDb } from '../db/matches.db.js';
import { eventsDb } from '../db/events.db.js';
import { transactions } from '../db/transactions.js';

export const leagueService = {
    /**
     * Checks if a league name is already in use.
     * @param {string} name 
     * @param {number} [excludeId=null] 
     * @returns {Promise<boolean>}
     */
    async isNameDuplicate(name, excludeId = null) {
        const leagues = await leaguesDb.getAll();
        const normalized = name.trim().toLowerCase();
        return leagues.some(l => l.name.toLowerCase() === normalized && l.id !== Number(excludeId));
    },

    /**
     * Prepares a complete league data dump for exporting to JSON.
     * @param {number} leagueId 
     * @returns {Promise<object>} JSON serializable object
     */
    async exportLeague(leagueId) {
        const targetId = Number(leagueId);
        const league = await leaguesDb.getById(targetId);
        if (!league) throw new Error('League not found');

        const allTeams = await teamsDb.getByLeague(targetId);
        const teamIds = allTeams.map(t => t.id);

        // Fetch all players for those teams
        const allPlayers = [];
        for (const teamId of teamIds) {
            const players = await playersDb.getByTeam(teamId);
            allPlayers.push(...players);
        }

        const allMatches = await matchesDb.getByLeague(targetId);
        const matchIds = allMatches.map(m => m.id);

        // Fetch all events for those matches
        const allEvents = [];
        for (const matchId of matchIds) {
            const events = await eventsDb.getByMatch(matchId);
            allEvents.push(...events);
        }

        return {
            generator: 'LeagueHub',
            version: 1,
            exportedAt: new Date().toISOString(),
            league,
            teams: allTeams,
            players: allPlayers,
            matches: allMatches,
            events: allEvents
        };
    },

    /**
     * Validates and imports a JSON string dump.
     * @param {string} jsonString 
     * @returns {Promise<void>}
     */
    async importLeague(jsonString) {
        let dump;
        try {
            dump = JSON.parse(jsonString);
        } catch (e) {
            throw new Error('El archivo no contiene un JSON válido.');
        }

        // Basic schema validations
        if (!dump.generator || dump.generator !== 'LeagueHub') {
            throw new Error('El archivo no fue generado por LeagueHub.');
        }
        if (!dump.league || !dump.league.name || !dump.league.sport || !dump.league.mode) {
            throw new Error('Estructura de liga inválida o incompleta.');
        }

        // Check name conflict
        const isConflict = await this.isNameDuplicate(dump.league.name);
        if (isConflict) {
            // Append import prefix to avoid duplicate constraint crash
            dump.league.name = `${dump.league.name} (Importado ${new Date().toLocaleDateString()})`;
        }

        // Trigger transactional cascade import
        await transactions.importLeagueData(dump);
    }
};
