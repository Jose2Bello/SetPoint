/* js/services/match.service.js */
import { matchesDb } from '../db/matches.db.js';
import { transactions } from '../db/transactions.js';

export const matchService = {
    /**
     * Checks if a match scheduled between these teams on the same day already exists.
     * @param {number} leagueId 
     * @param {number} homeTeamId 
     * @param {number} awayTeamId 
     * @param {string} dateString ISO date
     * @param {number} [excludeId=null] 
     * @returns {Promise<boolean>}
     */
    async isMatchDuplicate(leagueId, homeTeamId, awayTeamId, dateString, excludeId = null) {
        const matches = await matchesDb.getByLeague(leagueId);
        
        const dateInput = new Date(dateString);
        const inputDay = dateInput.toDateString(); // Checks only the calendar day

        return matches.some(m => {
            if (m.id === Number(excludeId)) return false;
            
            const matchDay = new Date(m.date).toDateString();
            
            // Match same day and same pairing
            const isSamePairing = (m.homeTeamId === Number(homeTeamId) && m.awayTeamId === Number(awayTeamId)) ||
                                  (m.homeTeamId === Number(awayTeamId) && m.awayTeamId === Number(homeTeamId));
            
            return isSamePairing && matchDay === inputDay;
        });
    },

    /**
     * Finalizes a match, invoking the transaction.
     * @param {number} matchId 
     * @param {Array} events 
     * @param {number|null} manualWinnerId 
     */
    async finalizeMatch(matchId, events, manualWinnerId = null) {
        await transactions.finalizeMatch(matchId, events, manualWinnerId);
    },

    /**
     * Undoes a match, invoking the transaction.
     * @param {number} matchId 
     */
    async undoMatch(matchId) {
        await transactions.undoMatch(matchId);
    }
};
