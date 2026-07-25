/* js/services/team.service.js */
import { teamsDb } from '../db/teams.db.js';
import { matchesDb } from '../db/matches.db.js';

export const teamService = {
    /**
     * Checks if a team name is unique within its league.
     * @param {number} leagueId 
     * @param {string} name 
     * @param {number} [excludeId=null] 
     * @returns {Promise<boolean>}
     */
    async isNameDuplicate(leagueId, name, excludeId = null) {
        const teams = await teamsDb.getByLeague(leagueId);
        const normalized = name.trim().toLowerCase();
        return teams.some(t => t.name.toLowerCase() === normalized && t.id !== Number(excludeId));
    },

    /**
     * Validates and deletes a team.
     * Throws an error if the team has matches scheduled or played.
     * @param {number} teamId 
     * @returns {Promise<void>}
     */
    async deleteTeam(teamId) {
        const id = Number(teamId);
        const team = await teamsDb.getById(id);
        if (!team) throw new Error('Equipo no encontrado.');

        // Fetch matches involving this team
        const allMatches = await matchesDb.getByLeague(team.leagueId);
        const hasMatches = allMatches.some(m => m.homeTeamId === id || m.awayTeamId === id);

        if (hasMatches) {
            throw new Error('No se puede eliminar el equipo porque ya tiene partidos programados o jugados.');
        }

        // Safe to delete (will cascade delete players of this team)
        await teamsDb.delete(id);
    },

    /**
     * Generates initials for a team name.
     * @param {string} name 
     * @returns {string} 2 letter uppercase initials
     */
    getInitials(name) {
        if (!name) return 'TH';
        const words = name.trim().split(/\s+/);
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return name.substring(0, Math.min(name.length, 2)).toUpperCase();
    }
};
