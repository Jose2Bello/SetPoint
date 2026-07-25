/* js/services/bracket.service.js */
import { getDB } from '../db/connection.js';

export const bracketService = {
    /**
     * Generates and transactionally inserts a bracket layout for elimination tournaments.
     * Starts from the final backwards to establish nextMatchId links.
     * @param {number} leagueId 
     * @param {Array} teamIds List of team IDs
     * @returns {Promise<void>}
     */
    async generateBracket(leagueId, teamIds) {
        const N = teamIds.length;
        if (N !== 4 && N !== 8 && N !== 16) {
            throw new Error('El número de equipos para eliminación directa debe ser 4, 8 o 16.');
        }

        const db = getDB();
        const tx = db.transaction('matches', 'readwrite');
        const store = tx.objectStore('matches');

        const roundsCount = Math.log2(N); // 2, 3, or 4
        
        // Base Date
        let currentDate = new Date();
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(18, 0, 0, 0);

        // Helper to format round names
        function getRoundLabel(roundNumber) {
            const relativeRound = roundsCount - roundNumber + 1; // 1: Final, 2: Semifinal, 3: Cuartos, 4: Octavos
            if (relativeRound === 1) return 'Final';
            if (relativeRound === 2) return 'Semifinal';
            if (relativeRound === 3) return 'Cuartos de Final';
            if (relativeRound === 4) return 'Octavos de Final';
            return `Ronda ${roundNumber}`;
        }

        // We will build the tree backwards (R3 -> R2 -> R1).
        // For each round, we will keep an array of match IDs that were created,
        // so that the previous round can link to them.
        let nextRoundMatchIds = []; // IDs of the matches in the next round

        // Shuffle teams for initial seedings
        const shuffledTeams = [...teamIds].sort(() => Math.random() - 0.5);

        // We run a loop from the last round (final) down to the first round
        for (let r = roundsCount; r >= 1; r--) {
            const matchesInRound = Math.pow(2, r - 1);
            const currentRoundMatchIds = [];
            const isFirstRound = r === 1;

            for (let m = 0; m < matchesInRound; m++) {
                // Determine home and away teams for first round, other rounds are "Por definir" (null)
                let homeTeamId = null;
                let awayTeamId = null;

                if (isFirstRound) {
                    homeTeamId = shuffledTeams[m * 2];
                    awayTeamId = shuffledTeams[m * 2 + 1];
                }

                // Determine nextMatchId and slot for this match
                let nextMatchId = null;
                let nextMatchHomeSlot = null;

                if (nextRoundMatchIds.length > 0) {
                    const nextMatchIndex = Math.floor(m / 2);
                    nextMatchId = nextRoundMatchIds[nextMatchIndex];
                    nextMatchHomeSlot = (m % 2 === 0); // Even index matches feed home slot, odd feed away
                }

                const matchDate = new Date(currentDate);
                // Stagger match dates
                matchDate.setDate(matchDate.getDate() + ((r - 1) * 3) + m);

                const matchData = {
                    leagueId: Number(leagueId),
                    homeTeamId: homeTeamId,
                    awayTeamId: awayTeamId,
                    date: matchDate.toISOString(),
                    status: 'Programado',
                    score: { home: 0, away: 0 },
                    round: getRoundLabel(r),
                    nextMatchId: nextMatchId,
                    nextMatchHomeSlot: nextMatchHomeSlot,
                    winnerId: null,
                    createdAt: new Date().toISOString()
                };

                // Insert match synchronously within the transaction sequence
                const request = store.add(matchData);
                
                await new Promise((resolveReq, rejectReq) => {
                    request.onsuccess = () => {
                        currentRoundMatchIds.push(request.result);
                        resolveReq();
                    };
                    request.onerror = () => rejectReq(request.error);
                });
            }

            // The matches created in this iteration are the "next round" matches for the next iteration (moving backwards)
            nextRoundMatchIds = currentRoundMatchIds;
        }

        return new Promise((resolveTx, rejectTx) => {
            tx.oncomplete = () => resolveTx();
            tx.onerror = () => rejectTx(tx.error);
        });
    }
};
