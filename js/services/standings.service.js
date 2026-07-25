/* js/services/standings.service.js */

export const standingsService = {
    /**
     * Sorts teams based on league scoring rules:
     * 1. Points desc
     * 2. Goal difference desc
     * 3. Goals/Points for desc
     * 4. Name asc
     * @param {Array} teams 
     * @returns {Array} Sorted teams copy
     */
    getStandings(teams) {
        return [...teams].sort((a, b) => {
            const ptsA = a.stats.points || 0;
            const ptsB = b.stats.points || 0;
            if (ptsB !== ptsA) return ptsB - ptsA;

            const diffA = a.stats.goalsDiff || 0;
            const diffB = b.stats.goalsDiff || 0;
            if (diffB !== diffA) return diffB - diffA;

            const forA = a.stats.goalsFor || 0;
            const forB = b.stats.goalsFor || 0;
            if (forB !== forA) return forB - forA;

            return a.name.localeCompare(b.name, 'es');
        });
    },

    /**
     * Sorts players by goals/points to form the Top Scorer ranking.
     * @param {Array} players 
     * @returns {Array} Sorted players copy
     */
    getPlayerRanking(players) {
        return [...players]
            .filter(p => (p.stats.goals || 0) > 0)
            .sort((a, b) => {
                const goalsA = a.stats.goals || 0;
                const goalsB = b.stats.goals || 0;
                if (goalsB !== goalsA) return goalsB - goalsA;

                const playedA = a.stats.played || 0;
                const playedB = b.stats.played || 0;
                // Fewer matches played gets higher rank if goals are equal
                if (playedA !== playedB) return playedA - playedB;

                return a.name.localeCompare(b.name, 'es');
            });
    }
};
