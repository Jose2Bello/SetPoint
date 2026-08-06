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
        
        // Obtener liga para saber el modo
        const league = await new Promise((resolve, reject) => {
            const tx = db.transaction('leagues', 'readonly');
            const req = tx.objectStore('leagues').get(Number(leagueId));
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (!league) throw new Error('Liga no encontrada');
        const isDoubleElim = league.mode === 'doble-eliminacion';

        const tx = db.transaction('matches', 'readwrite');
        const store = tx.objectStore('matches');

        let currentDate = new Date();
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(18, 0, 0, 0);

        function getDateOffset(days) {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + days);
            return d.toISOString();
        }

        const shuffledTeams = [...teamIds].sort(() => Math.random() - 0.5);

        async function createMatch(matchData) {
            const request = store.add(matchData);
            return new Promise((resolveReq, rejectReq) => {
                request.onsuccess = () => resolveReq(request.result);
                request.onerror = () => rejectReq(request.error);
            });
        }

        if (isDoubleElim) {
            if (N === 4) {
                // 6 Matches
                const gfId = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(5), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Gran Final', winnerId: null, nextMatchId: null, nextMatchHomeSlot: null,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const lfId = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(4), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Final Perdedores', winnerId: null, nextMatchId: gfId, nextMatchHomeSlot: false,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const wfId = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(3), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Final Ganadores', winnerId: null, nextMatchId: gfId, nextMatchHomeSlot: true,
                    loserNextMatchId: lfId, loserNextMatchHomeSlot: false, createdAt: new Date().toISOString()
                });

                const lr1Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(2), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Ronda 1 Perdedores', winnerId: null, nextMatchId: lfId, nextMatchHomeSlot: true,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const wsf2Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: shuffledTeams[2], awayTeamId: shuffledTeams[3],
                    date: getDateOffset(1), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Semifinal Ganadores', winnerId: null, nextMatchId: wfId, nextMatchHomeSlot: false,
                    loserNextMatchId: lr1Id, loserNextMatchHomeSlot: false, createdAt: new Date().toISOString()
                });

                const wsf1Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: shuffledTeams[0], awayTeamId: shuffledTeams[1],
                    date: getDateOffset(1), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Semifinal Ganadores', winnerId: null, nextMatchId: wfId, nextMatchHomeSlot: true,
                    loserNextMatchId: lr1Id, loserNextMatchHomeSlot: true, createdAt: new Date().toISOString()
                });
            } else if (N === 8) {
                // 14 Matches
                const gfId = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(8), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Gran Final', winnerId: null, nextMatchId: null, nextMatchHomeSlot: null,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const lfId = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(7), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Final Perdedores', winnerId: null, nextMatchId: gfId, nextMatchHomeSlot: false,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const wfId = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(6), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Final Ganadores', winnerId: null, nextMatchId: gfId, nextMatchHomeSlot: true,
                    loserNextMatchId: lfId, loserNextMatchHomeSlot: false, createdAt: new Date().toISOString()
                });

                const lr3Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(5), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Ronda 3 Perdedores', winnerId: null, nextMatchId: lfId, nextMatchHomeSlot: true,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const lr2_2Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(4), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Ronda 2 Perdedores', winnerId: null, nextMatchId: lr3Id, nextMatchHomeSlot: false,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const lr2_1Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(4), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Ronda 2 Perdedores', winnerId: null, nextMatchId: lr3Id, nextMatchHomeSlot: true,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const wsf2Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(3), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Semifinal Ganadores', winnerId: null, nextMatchId: wfId, nextMatchHomeSlot: false,
                    loserNextMatchId: lr2_1Id, loserNextMatchHomeSlot: false, createdAt: new Date().toISOString()
                });

                const wsf1Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(3), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Semifinal Ganadores', winnerId: null, nextMatchId: wfId, nextMatchHomeSlot: true,
                    loserNextMatchId: lr2_2Id, loserNextMatchHomeSlot: false, createdAt: new Date().toISOString()
                });

                const lr1_2Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(2), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Ronda 1 Perdedores', winnerId: null, nextMatchId: lr2_2Id, nextMatchHomeSlot: true,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const lr1_1Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(2), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Ronda 1 Perdedores', winnerId: null, nextMatchId: lr2_1Id, nextMatchHomeSlot: true,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const wqf4Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: shuffledTeams[6], awayTeamId: shuffledTeams[7],
                    date: getDateOffset(1), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Cuartos Ganadores', winnerId: null, nextMatchId: wsf2Id, nextMatchHomeSlot: false,
                    loserNextMatchId: lr1_2Id, loserNextMatchHomeSlot: false, createdAt: new Date().toISOString()
                });

                const wqf3Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: shuffledTeams[4], awayTeamId: shuffledTeams[5],
                    date: getDateOffset(1), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Cuartos Ganadores', winnerId: null, nextMatchId: wsf2Id, nextMatchHomeSlot: true,
                    loserNextMatchId: lr1_2Id, loserNextMatchHomeSlot: true, createdAt: new Date().toISOString()
                });

                const wqf2Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: shuffledTeams[2], awayTeamId: shuffledTeams[3],
                    date: getDateOffset(1), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Cuartos Ganadores', winnerId: null, nextMatchId: wsf1Id, nextMatchHomeSlot: false,
                    loserNextMatchId: lr1_1Id, loserNextMatchHomeSlot: false, createdAt: new Date().toISOString()
                });

                const wqf1Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: shuffledTeams[0], awayTeamId: shuffledTeams[1],
                    date: getDateOffset(1), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Cuartos Ganadores', winnerId: null, nextMatchId: wsf1Id, nextMatchHomeSlot: true,
                    loserNextMatchId: lr1_1Id, loserNextMatchHomeSlot: true, createdAt: new Date().toISOString()
                });
            } else if (N === 16) {
                // 30 Matches
                const gfId = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(11), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Gran Final', winnerId: null, nextMatchId: null, nextMatchHomeSlot: null,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const lfId = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(10), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Final Perdedores', winnerId: null, nextMatchId: gfId, nextMatchHomeSlot: false,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const wfId = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(9), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Final Ganadores', winnerId: null, nextMatchId: gfId, nextMatchHomeSlot: true,
                    loserNextMatchId: lfId, loserNextMatchHomeSlot: false, createdAt: new Date().toISOString()
                });

                const lr5Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(8), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Ronda 5 Perdedores', winnerId: null, nextMatchId: lfId, nextMatchHomeSlot: true,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const lr4_2Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(7), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Ronda 4 Perdedores', winnerId: null, nextMatchId: lr5Id, nextMatchHomeSlot: false,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const lr4_1Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(7), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Ronda 4 Perdedores', winnerId: null, nextMatchId: lr5Id, nextMatchHomeSlot: true,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const wsf2Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(6), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Semifinal Ganadores', winnerId: null, nextMatchId: wfId, nextMatchHomeSlot: false,
                    loserNextMatchId: lr4_1Id, loserNextMatchHomeSlot: false, createdAt: new Date().toISOString()
                });

                const wsf1Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(6), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Semifinal Ganadores', winnerId: null, nextMatchId: wfId, nextMatchHomeSlot: true,
                    loserNextMatchId: lr4_2Id, loserNextMatchHomeSlot: false, createdAt: new Date().toISOString()
                });

                const lr3_2Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(5), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Ronda 3 Perdedores', winnerId: null, nextMatchId: lr4_2Id, nextMatchHomeSlot: true,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const lr3_1Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(5), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Ronda 3 Perdedores', winnerId: null, nextMatchId: lr4_1Id, nextMatchHomeSlot: true,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const lr2_4Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(4), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Ronda 2 Perdedores', winnerId: null, nextMatchId: lr3_2Id, nextMatchHomeSlot: false,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const lr2_3Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(4), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Ronda 2 Perdedores', winnerId: null, nextMatchId: lr3_2Id, nextMatchHomeSlot: true,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const lr2_2Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(4), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Ronda 2 Perdedores', winnerId: null, nextMatchId: lr3_1Id, nextMatchHomeSlot: false,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const lr2_1Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(4), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Ronda 2 Perdedores', winnerId: null, nextMatchId: lr3_1Id, nextMatchHomeSlot: true,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const wqf4Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(3), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Cuartos Ganadores', winnerId: null, nextMatchId: wsf2Id, nextMatchHomeSlot: false,
                    loserNextMatchId: lr2_1Id, loserNextMatchHomeSlot: false, createdAt: new Date().toISOString()
                });

                const wqf3Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(3), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Cuartos Ganadores', winnerId: null, nextMatchId: wsf2Id, nextMatchHomeSlot: true,
                    loserNextMatchId: lr2_2Id, loserNextMatchHomeSlot: false, createdAt: new Date().toISOString()
                });

                const wqf2Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(3), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Cuartos Ganadores', winnerId: null, nextMatchId: wsf1Id, nextMatchHomeSlot: false,
                    loserNextMatchId: lr2_3Id, loserNextMatchHomeSlot: false, createdAt: new Date().toISOString()
                });

                const wqf1Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(3), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Cuartos Ganadores', winnerId: null, nextMatchId: wsf1Id, nextMatchHomeSlot: true,
                    loserNextMatchId: lr2_4Id, loserNextMatchHomeSlot: false, createdAt: new Date().toISOString()
                });

                const lr1_4Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(2), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Ronda 1 Perdedores', winnerId: null, nextMatchId: lr2_4Id, nextMatchHomeSlot: true,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const lr1_3Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(2), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Ronda 1 Perdedores', winnerId: null, nextMatchId: lr2_3Id, nextMatchHomeSlot: true,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const lr1_2Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(2), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Ronda 1 Perdedores', winnerId: null, nextMatchId: lr2_2Id, nextMatchHomeSlot: true,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                const lr1_1Id = await createMatch({
                    leagueId: Number(leagueId), homeTeamId: null, awayTeamId: null,
                    date: getDateOffset(2), status: 'Programado', score: { home: 0, away: 0 },
                    round: 'Ronda 1 Perdedores', winnerId: null, nextMatchId: lr2_1Id, nextMatchHomeSlot: true,
                    loserNextMatchId: null, loserNextMatchHomeSlot: null, createdAt: new Date().toISOString()
                });

                // Winners Octavos (Initial seeding)
                for (let m = 0; m < 8; m++) {
                    const nextMatchIndex = Math.floor(m / 2);
                    const nextIds = [wqf1Id, wqf2Id, wqf3Id, wqf4Id];
                    const lr1Ids = [lr1_1Id, lr1_2Id, lr1_3Id, lr1_4Id];

                    await createMatch({
                        leagueId: Number(leagueId), homeTeamId: shuffledTeams[m * 2], awayTeamId: shuffledTeams[m * 2 + 1],
                        date: getDateOffset(1), status: 'Programado', score: { home: 0, away: 0 },
                        round: 'Octavos Ganadores', winnerId: null,
                        nextMatchId: nextIds[nextMatchIndex], nextMatchHomeSlot: (m % 2 === 0),
                        loserNextMatchId: lr1Ids[nextMatchIndex], loserNextMatchHomeSlot: (m % 2 === 0),
                        createdAt: new Date().toISOString()
                    });
                }
            }
        } else {
            const roundsCount = Math.log2(N);
            let nextRoundMatchIds = [];

            for (let r = roundsCount; r >= 1; r--) {
                const matchesInRound = Math.pow(2, roundsCount - r);
                const currentRoundMatchIds = [];
                const isFirstRound = r === 1;

                for (let m = 0; m < matchesInRound; m++) {
                    let homeTeamId = null;
                    let awayTeamId = null;

                    if (isFirstRound) {
                        homeTeamId = shuffledTeams[m * 2];
                        awayTeamId = shuffledTeams[m * 2 + 1];
                    }

                    let nextMatchId = null;
                    let nextMatchHomeSlot = null;

                    if (nextRoundMatchIds.length > 0) {
                        const nextMatchIndex = Math.floor(m / 2);
                        nextMatchId = nextRoundMatchIds[nextMatchIndex];
                        nextMatchHomeSlot = (m % 2 === 0);
                    }

                    const matchDate = new Date(currentDate);
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

                    const request = store.add(matchData);
                    
                    await new Promise((resolveReq, rejectReq) => {
                        request.onsuccess = () => {
                            currentRoundMatchIds.push(request.result);
                            resolveReq();
                        };
                        request.onerror = () => rejectReq(request.error);
                    });
                }
                nextRoundMatchIds = currentRoundMatchIds;
            }

            function getRoundLabel(roundNumber) {
                const relativeRound = roundsCount - roundNumber + 1;
                if (relativeRound === 1) return 'Final';
                if (relativeRound === 2) return 'Semifinal';
                if (relativeRound === 3) return 'Cuartos de Final';
                if (relativeRound === 4) return 'Octavos de Final';
                return `Ronda ${roundNumber}`;
            }
        }

        return new Promise((resolveTx, rejectTx) => {
            tx.oncomplete = () => resolveTx();
            tx.onerror = () => rejectTx(tx.error);
        });
    },

    async updateMatchResult(matchId, homeScore, awayScore, status, winnerIdOverride = null, homeTeamId = undefined, awayTeamId = undefined) {
        const db = getDB();
        const tx = db.transaction('matches', 'readwrite');
        const store = tx.objectStore('matches');

        async function updateSingleMatch(mId, hScore, aScore, stat, wIdOverride, hTeamId, aTeamId) {
            const match = await new Promise((res, rej) => {
                const req = store.get(Number(mId));
                req.onsuccess = () => res(req.result);
                req.onerror = () => rej(req.error);
            });

            if (!match) throw new Error('Partido no encontrado');

            if (hTeamId !== undefined) match.homeTeamId = hTeamId ? Number(hTeamId) : null;
            if (aTeamId !== undefined) match.awayTeamId = aTeamId ? Number(aTeamId) : null;

            const finalHomeScore = hScore !== undefined ? Number(hScore) : (match.homeScore ?? 0);
            const finalAwayScore = aScore !== undefined ? Number(aScore) : (match.awayScore ?? 0);
            const finalStatus = stat !== undefined ? stat : (match.status || 'Programado');

            let winnerId = wIdOverride ? Number(wIdOverride) : null;
            if (!winnerId && finalStatus === 'Finalizado') {
                if (finalHomeScore > finalAwayScore && match.homeTeamId) winnerId = Number(match.homeTeamId);
                else if (finalAwayScore > finalHomeScore && match.awayTeamId) winnerId = Number(match.awayTeamId);
            }

            let loserId = null;
            if (winnerId && finalStatus === 'Finalizado') {
                if (winnerId === Number(match.homeTeamId)) loserId = match.awayTeamId ? Number(match.awayTeamId) : null;
                else if (winnerId === Number(match.awayTeamId)) loserId = match.homeTeamId ? Number(match.homeTeamId) : null;
            }

            match.homeScore = finalHomeScore;
            match.awayScore = finalAwayScore;
            match.score = { home: finalHomeScore, away: finalAwayScore };
            match.status = finalStatus;
            match.winnerId = winnerId;
            match.updatedAt = new Date().toISOString();

            await new Promise((res, rej) => {
                const req = store.put(match);
                req.onsuccess = () => res();
                req.onerror = () => rej(req.error);
            });

            // Propagar ganador
            if (match.nextMatchId) {
                const nextMatch = await new Promise((res, rej) => {
                    const req = store.get(Number(match.nextMatchId));
                    req.onsuccess = () => res(req.result);
                    req.onerror = () => rej(req.error);
                });

                if (nextMatch) {
                    const targetWinnerId = (finalStatus === 'Finalizado') ? winnerId : null;
                    let nextHomeTeamId = nextMatch.homeTeamId;
                    let nextAwayTeamId = nextMatch.awayTeamId;
                    let changed = false;

                    if (match.nextMatchHomeSlot) {
                        if (nextMatch.homeTeamId !== targetWinnerId) {
                            nextHomeTeamId = targetWinnerId;
                            changed = true;
                        }
                    } else {
                        if (nextMatch.awayTeamId !== targetWinnerId) {
                            nextAwayTeamId = targetWinnerId;
                            changed = true;
                        }
                    }

                    if (changed) {
                        let nextStatus = nextMatch.status;
                        if (!nextHomeTeamId || !nextAwayTeamId) {
                            nextStatus = 'Programado';
                        }
                        await updateSingleMatch(
                            nextMatch.id,
                            nextMatch.homeScore,
                            nextMatch.awayScore,
                            nextStatus,
                            null,
                            nextHomeTeamId,
                            nextAwayTeamId
                        );
                    }
                }
            }

            // Propagar perdedor (para doble eliminación)
            if (match.loserNextMatchId) {
                const loserNextMatch = await new Promise((res, rej) => {
                    const req = store.get(Number(match.loserNextMatchId));
                    req.onsuccess = () => res(req.result);
                    req.onerror = () => rej(req.error);
                });

                if (loserNextMatch) {
                    const targetLoserId = (finalStatus === 'Finalizado') ? loserId : null;
                    let nextHomeTeamId = loserNextMatch.homeTeamId;
                    let nextAwayTeamId = loserNextMatch.awayTeamId;
                    let changed = false;

                    if (match.loserNextMatchHomeSlot) {
                        if (loserNextMatch.homeTeamId !== targetLoserId) {
                            nextHomeTeamId = targetLoserId;
                            changed = true;
                        }
                    } else {
                        if (loserNextMatch.awayTeamId !== targetLoserId) {
                            nextAwayTeamId = targetLoserId;
                            changed = true;
                        }
                    }

                    if (changed) {
                        let nextStatus = loserNextMatch.status;
                        if (!nextHomeTeamId || !nextAwayTeamId) {
                            nextStatus = 'Programado';
                        }
                        await updateSingleMatch(
                            loserNextMatch.id,
                            loserNextMatch.homeScore,
                            loserNextMatch.awayScore,
                            nextStatus,
                            null,
                            nextHomeTeamId,
                            nextAwayTeamId
                        );
                    }
                }
            }
        }

        await updateSingleMatch(matchId, homeScore, awayScore, status, winnerIdOverride, homeTeamId, awayTeamId);

        return new Promise((resolveTx, rejectTx) => {
            tx.oncomplete = () => resolveTx();
            tx.onerror = () => rejectTx(tx.error);
        });
    }
};
