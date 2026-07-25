/* js/services/fixture.service.js */

export const fixtureService = {
    /**
     * Generates a round robin fixture.
     * @param {number} leagueId 
     * @param {Array} teamIds List of team IDs
     * @param {boolean} doubleRound Whether to play home and away (two legs)
     * @param {string} startDateString Baseline date to start matches scheduling
     * @returns {Array} List of Match objects to insert
     */
    generateFixture(leagueId, teamIds, doubleRound = false, startDateString = null) {
        if (!teamIds || teamIds.length < 2) return [];

        const list = [...teamIds];
        const isOdd = list.length % 2 !== 0;
        
        // If odd number of teams, append a dummy team (null) to represent rest day (BYE)
        if (isOdd) {
            list.push(null);
        }

        const numTeams = list.length;
        const numRounds = numTeams - 1;
        const matchesPerRound = numTeams / 2;
        const matches = [];

        // Base date for scheduling. If none provided, start tomorrow at 18:00
        let currentDate = startDateString ? new Date(startDateString) : new Date();
        if (!startDateString) {
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(18, 0, 0, 0);
        }

        // Single-leg matches generation
        for (let round = 0; round < numRounds; round++) {
            for (let matchIdx = 0; matchIdx < matchesPerRound; matchIdx++) {
                const homeIdx = (round + matchIdx) % (numTeams - 1);
                let awayIdx = (numTeams - 1 - matchIdx + round) % (numTeams - 1);

                // Last slot helper
                if (matchIdx === 0) {
                    awayIdx = numTeams - 1;
                }

                const homeTeam = list[homeIdx];
                const awayTeam = list[awayIdx];

                // Skip matches involving the rest day dummy team
                if (homeTeam !== null && awayTeam !== null) {
                    // Alternate home/away slots to balance venues
                    const home = round % 2 === 0 ? homeTeam : awayTeam;
                    const away = round % 2 === 0 ? awayTeam : homeTeam;
                    
                    const matchDate = new Date(currentDate);
                    // Add 1 hour between matches in the same round, or place them on different days.
                    // Let's schedule matches of the same round on the same day with 2 hours interval,
                    // and increment days per round.
                    matchDate.setHours(matchDate.getHours() + (matchIdx * 2));

                    matches.push({
                        leagueId: leagueId,
                        homeTeamId: home,
                        awayTeamId: away,
                        date: matchDate.toISOString(),
                        status: 'Programado',
                        score: { home: 0, away: 0 },
                        round: round + 1,
                        nextMatchId: null,
                        nextMatchHomeSlot: null
                    });
                }
            }
            // Advance 7 days for the next round
            currentDate.setDate(currentDate.getDate() + 7);
        }

        // Double-leg matches generation (Ida y Vuelta)
        if (doubleRound) {
            const numSingleLegMatches = matches.length;
            
            // Re-schedule base date for second leg rounds
            let returnDate = new Date(currentDate);
            
            for (let i = 0; i < numSingleLegMatches; i++) {
                const firstLeg = matches[i];
                const originalRound = firstLeg.round;
                const matchIndexInRound = (i % matchesPerRound);
                
                const matchDate = new Date(returnDate);
                // Advance week according to round offset
                matchDate.setDate(matchDate.getDate() + ((originalRound - 1) * 7));
                matchDate.setHours(matchDate.getHours() + (matchIndexInRound * 2));

                matches.push({
                    leagueId: leagueId,
                    homeTeamId: firstLeg.awayTeamId, // Swap home and away
                    awayTeamId: firstLeg.homeTeamId,
                    date: matchDate.toISOString(),
                    status: 'Programado',
                    score: { home: 0, away: 0 },
                    round: originalRound + numRounds,
                    nextMatchId: null,
                    nextMatchHomeSlot: null
                });
            }
        }

        // Sort matches by date before returning
        return matches.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
};
