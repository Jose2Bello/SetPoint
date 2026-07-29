import { getDB } from './connection.js';

/**
 * Activa una liga y desactiva las demás.
 * @param {number} leagueId 
 * @returns {Promise<void>}
 */
export function activateLeague(leagueId) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('leagues', 'readwrite');
        const store = tx.objectStore('leagues');
        
        const req = store.openCursor();
        req.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const league = cursor.value;
                const shouldBeActive = league.id === Number(leagueId);
                
                if (league.isActive !== shouldBeActive) {
                    league.isActive = shouldBeActive;
                    cursor.update(league);
                }
                cursor.continue();
            }
        };
        
        tx.oncomplete = () => {
            window.dispatchEvent(new CustomEvent('league-activated'));
            resolve();
        };
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('Transaction aborted'));
    });
}

/**
 * Elimina una liga y sus entidades asociadas en cascada.
 * @param {number} leagueId 
 * @returns {Promise<void>}
 */
export function deleteLeagueCascade(leagueId) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const targetLeagueId = Number(leagueId);
        const stores = ['leagues', 'teams', 'players', 'matches', 'events'];
        const tx = db.transaction(stores, 'readwrite');
        
        // 1. Delete League
        tx.objectStore('leagues').delete(targetLeagueId);
        
        // 2. Fetch and delete teams and their players
        const teamsStore = tx.objectStore('teams');
        const playersStore = tx.objectStore('players');
        const teamsIndex = teamsStore.index('leagueId');
        
        const teamIdsToDelete = [];
        
        teamsIndex.openCursor(targetLeagueId).onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                const teamId = cursor.value.id;
                teamIdsToDelete.push(teamId);
                cursor.delete();
                cursor.continue();
            } else {
                for (const teamId of teamIdsToDelete) {
                    playersStore.index('teamId').openCursor(teamId).onsuccess = (pe) => {
                        const pCursor = pe.target.result;
                        if (pCursor) {
                            pCursor.delete();
                            pCursor.continue();
                        }
                    };
                }
            }
        };
        
        // 3. Delete matches and match events
        const matchesStore = tx.objectStore('matches');
        const eventsStore = tx.objectStore('events');
        
        matchesStore.index('leagueId').openCursor(targetLeagueId).onsuccess = (me) => {
            const cursor = me.target.result;
            if (cursor) {
                const matchId = cursor.value.id;
                cursor.delete();
                
                eventsStore.index('matchId').openCursor(matchId).onsuccess = (ee) => {
                    const eCursor = ee.target.result;
                    if (eCursor) {
                        eCursor.delete();
                        eCursor.continue();
                    }
                };
                cursor.continue();
            }
        };
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('Transaction aborted'));
    });
}

/**
 * Finaliza un partido, registra eventos, actualiza estadísticas y avanza el ganador si es eliminatoria.
 * @param {number} matchId 
 * @param {Array} eventsList 
 * @param {number|null} manualWinnerId 
 * @returns {Promise<void>}
 */
export function finalizeMatch(matchId, eventsList, manualWinnerId = null) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const targetMatchId = Number(matchId);
        const stores = ['matches', 'teams', 'players', 'events', 'leagues'];
        const tx = db.transaction(stores, 'readwrite');
        
        const matchesStore = tx.objectStore('matches');
        const teamsStore = tx.objectStore('teams');
        const playersStore = tx.objectStore('players');
        const eventsStore = tx.objectStore('events');
        
        let match = null;
        let league = null;
        
        const matchReq = matchesStore.get(targetMatchId);
        matchReq.onsuccess = () => {
            match = matchReq.result;
            if (!match) {
                tx.abort();
                reject(new Error('Match not found'));
                return;
            }
            if (match.status === 'Finalizado') {
                tx.abort();
                reject(new Error('Match is already finalized'));
                return;
            }
            
            tx.objectStore('leagues').get(match.leagueId).onsuccess = (le) => {
                league = le.target.result;
                processFinalization();
            };
        };
        
        function processFinalization() {
            let homeScore = 0;
            let awayScore = 0;
            
            eventsList.forEach(ev => {
                if (Number(ev.teamId) === match.homeTeamId) {
                    homeScore++;
                } else if (Number(ev.teamId) === match.awayTeamId) {
                    awayScore++;
                }
            });
            
            match.score = { home: homeScore, away: awayScore };
            match.status = 'Finalizado';
            
            let winnerTeamId = null;
            
            if (homeScore > awayScore) {
                winnerTeamId = match.homeTeamId;
            } else if (awayScore > homeScore) {
                winnerTeamId = match.awayTeamId;
            } else {
                if (league.mode === 'eliminacion' || league.mode === 'doble-eliminacion') {
                    if (!manualWinnerId) {
                        tx.abort();
                        reject(new Error('En llaves de eliminación no se permiten empates. Debe declarar un ganador.'));
                        return;
                    }
                    winnerTeamId = Number(manualWinnerId);
                }
            }
            
            match.winnerId = winnerTeamId;
            matchesStore.put(match);
            
            eventsList.forEach(ev => {
                eventsStore.add({
                    matchId: targetMatchId,
                    playerId: Number(ev.playerId),
                    teamId: Number(ev.teamId),
                    type: ev.type,
                    minute: ev.minute ? Number(ev.minute) : null,
                    createdAt: new Date().toISOString()
                });
            });
            
            if (league.mode === 'liga') {
                teamsStore.get(match.homeTeamId).onsuccess = (e) => {
                    const team = e.target.result;
                    if (team) {
                        team.stats.played += 1;
                        team.stats.goalsFor += homeScore;
                        team.stats.goalsAgainst += awayScore;
                        team.stats.goalsDiff = team.stats.goalsFor - team.stats.goalsAgainst;
                        
                        if (homeScore > awayScore) {
                            team.stats.won += 1;
                            team.stats.points += 3;
                        } else if (homeScore === awayScore) {
                            team.stats.drawn += 1;
                            team.stats.points += 1;
                        } else {
                            team.stats.lost += 1;
                        }
                        teamsStore.put(team);
                    }
                };
                
                teamsStore.get(match.awayTeamId).onsuccess = (e) => {
                    const team = e.target.result;
                    if (team) {
                        team.stats.played += 1;
                        team.stats.goalsFor += awayScore;
                        team.stats.goalsAgainst += homeScore;
                        team.stats.goalsDiff = team.stats.goalsFor - team.stats.goalsAgainst;
                        
                        if (awayScore > homeScore) {
                            team.stats.won += 1;
                            team.stats.points += 3;
                        } else if (homeScore === awayScore) {
                            team.stats.drawn += 1;
                            team.stats.points += 1;
                        } else {
                            team.stats.lost += 1;
                        }
                        teamsStore.put(team);
                    }
                };
            }
            
            const playerScores = {};
            eventsList.forEach(ev => {
                const pid = Number(ev.playerId);
                playerScores[pid] = (playerScores[pid] || 0) + 1;
            });
            
            for (const [pidStr, goalsScored] of Object.entries(playerScores)) {
                const pid = Number(pidStr);
                playersStore.get(pid).onsuccess = (e) => {
                    const player = e.target.result;
                    if (player) {
                        player.stats.played += 1;
                        player.stats.goals += goalsScored;
                        playersStore.put(player);
                    }
                };
            }
            
            if ((league.mode === 'eliminacion' || league.mode === 'doble-eliminacion') && match.nextMatchId) {
                const nextMatchId = Number(match.nextMatchId);
                matchesStore.get(nextMatchId).onsuccess = (ne) => {
                    const nextMatch = ne.target.result;
                    if (nextMatch) {
                        if (match.nextMatchHomeSlot) {
                            nextMatch.homeTeamId = winnerTeamId;
                        } else {
                            nextMatch.awayTeamId = winnerTeamId;
                        }
                        matchesStore.put(nextMatch);
                    }
                };
            }

            if (league.mode === 'doble-eliminacion' && match.loserNextMatchId) {
                const loserNextMatchId = Number(match.loserNextMatchId);
                const loserTeamId = (winnerTeamId === match.homeTeamId) ? match.awayTeamId : match.homeTeamId;
                if (loserTeamId) {
                    matchesStore.get(loserNextMatchId).onsuccess = (le) => {
                        const loserMatch = le.target.result;
                        if (loserMatch) {
                            if (match.loserNextMatchHomeSlot) {
                                loserMatch.homeTeamId = loserTeamId;
                            } else {
                                loserMatch.awayTeamId = loserTeamId;
                            }
                            matchesStore.put(loserMatch);
                        }
                    };
                }
            }
        }
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('Transaction aborted'));
    });
}

/**
 * Revierte un partido finalizado a programado.
 * @param {number} matchId 
 * @returns {Promise<void>}
 */
export function undoMatch(matchId) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const targetMatchId = Number(matchId);
        const stores = ['matches', 'teams', 'players', 'events', 'leagues'];
        const tx = db.transaction(stores, 'readwrite');
        
        const matchesStore = tx.objectStore('matches');
        const teamsStore = tx.objectStore('teams');
        const playersStore = tx.objectStore('players');
        const eventsStore = tx.objectStore('events');
        
        let match = null;
        let league = null;
        let eventsList = [];
        
        const matchReq = matchesStore.get(targetMatchId);
        matchReq.onsuccess = () => {
            match = matchReq.result;
            if (!match) {
                tx.abort();
                reject(new Error('Match not found'));
                return;
            }
            if (match.status !== 'Finalizado') {
                tx.abort();
                reject(new Error('Match is not finalized'));
                return;
            }
            
            tx.objectStore('leagues').get(match.leagueId).onsuccess = (le) => {
                league = le.target.result;
                
                const nextId = match.nextMatchId ? Number(match.nextMatchId) : null;
                const loserNextId = match.loserNextMatchId ? Number(match.loserNextMatchId) : null;

                const checkFinalized = [];
                if (nextId) checkFinalized.push(nextId);
                if (loserNextId) checkFinalized.push(loserNextId);

                if ((league.mode === 'eliminacion' || league.mode === 'doble-eliminacion') && checkFinalized.length > 0) {
                    let checkedCount = 0;
                    let hasFinalizedNext = false;
                    checkFinalized.forEach(nid => {
                        matchesStore.get(nid).onsuccess = (ne) => {
                            const nextMatch = ne.target.result;
                            if (nextMatch && nextMatch.status === 'Finalizado') {
                                hasFinalizedNext = true;
                            }
                            checkedCount++;
                            if (checkedCount === checkFinalized.length) {
                                if (hasFinalizedNext) {
                                    tx.abort();
                                    reject(new Error('No se puede deshacer un partido si el partido de la siguiente ronda ya está finalizado. Deshaz el siguiente partido primero.'));
                                    return;
                                }
                                fetchEventsAndRevert();
                            }
                        };
                    });
                } else {
                    fetchEventsAndRevert();
                }
            };
        };
        
        function fetchEventsAndRevert() {
            eventsStore.index('matchId').getAll(targetMatchId).onsuccess = (ee) => {
                eventsList = ee.target.result;
                processRevert();
            };
        }
        
        function processRevert() {
            const homeScore = match.score.home;
            const awayScore = match.score.away;
            
            if ((league.mode === 'eliminacion' || league.mode === 'doble-eliminacion') && match.nextMatchId) {
                const nextMatchId = Number(match.nextMatchId);
                matchesStore.get(nextMatchId).onsuccess = (ne) => {
                    const nextMatch = ne.target.result;
                    if (nextMatch) {
                        if (match.nextMatchHomeSlot) {
                            nextMatch.homeTeamId = null;
                        } else {
                            nextMatch.awayTeamId = null;
                        }
                        matchesStore.put(nextMatch);
                    }
                };
            }

            if (league.mode === 'doble-eliminacion' && match.loserNextMatchId) {
                const loserNextMatchId = Number(match.loserNextMatchId);
                matchesStore.get(loserNextMatchId).onsuccess = (le) => {
                    const loserMatch = le.target.result;
                    if (loserMatch) {
                        if (match.loserNextMatchHomeSlot) {
                            loserMatch.homeTeamId = null;
                        } else {
                            loserMatch.awayTeamId = null;
                        }
                        matchesStore.put(loserMatch);
                    }
                };
            }
            
            match.status = 'Programado';
            match.score = { home: 0, away: 0 };
            match.winnerId = null;
            matchesStore.put(match);
            
            eventsList.forEach(ev => {
                eventsStore.delete(ev.id);
            });
            
            if (league.mode === 'liga') {
                teamsStore.get(match.homeTeamId).onsuccess = (e) => {
                    const team = e.target.result;
                    if (team) {
                        team.stats.played -= 1;
                        team.stats.goalsFor -= homeScore;
                        team.stats.goalsAgainst -= awayScore;
                        team.stats.goalsDiff = team.stats.goalsFor - team.stats.goalsAgainst;
                        
                        if (homeScore > awayScore) {
                            team.stats.won -= 1;
                            team.stats.points -= 3;
                        } else if (homeScore === awayScore) {
                            team.stats.drawn -= 1;
                            team.stats.points -= 1;
                        } else {
                            team.stats.lost -= 1;
                        }
                        teamsStore.put(team);
                    }
                };
                
                teamsStore.get(match.awayTeamId).onsuccess = (e) => {
                    const team = e.target.result;
                    if (team) {
                        team.stats.played -= 1;
                        team.stats.goalsFor -= awayScore;
                        team.stats.goalsAgainst -= homeScore;
                        team.stats.goalsDiff = team.stats.goalsFor - team.stats.goalsAgainst;
                        
                        if (awayScore > homeScore) {
                            team.stats.won -= 1;
                            team.stats.points -= 3;
                        } else if (homeScore === awayScore) {
                            team.stats.drawn -= 1;
                            team.stats.points -= 1;
                        } else {
                            team.stats.lost -= 1;
                        }
                        teamsStore.put(team);
                    }
                };
            }
            
            const playerScores = {};
            eventsList.forEach(ev => {
                const pid = Number(ev.playerId);
                playerScores[pid] = (playerScores[pid] || 0) + 1;
            });
            
            for (const [pidStr, goalsScored] of Object.entries(playerScores)) {
                const pid = Number(pidStr);
                playersStore.get(pid).onsuccess = (e) => {
                    const player = e.target.result;
                    if (player) {
                        player.stats.played -= 1;
                        player.stats.goals -= goalsScored;
                        playersStore.put(player);
                    }
                };
            }
        }
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('Transaction aborted'));
    });
}

/**
 * Guarda una lista de partidos programados.
 * @param {Array} matchesList 
 * @returns {Promise<void>}
 */
export function saveMatchesList(matchesList) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const tx = db.transaction('matches', 'readwrite');
        const store = tx.objectStore('matches');
        
        matchesList.forEach(m => {
            store.add({
                leagueId: Number(m.leagueId),
                homeTeamId: m.homeTeamId ? Number(m.homeTeamId) : null,
                awayTeamId: m.awayTeamId ? Number(m.awayTeamId) : null,
                date: m.date || null,
                status: m.status || 'Programado',
                score: m.score || { home: 0, away: 0 },
                round: m.round !== undefined ? m.round : null,
                nextMatchId: m.nextMatchId ? Number(m.nextMatchId) : null,
                nextMatchHomeSlot: m.nextMatchHomeSlot !== undefined ? m.nextMatchHomeSlot : null,
                winnerId: null,
                createdAt: new Date().toISOString()
            });
        });
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * Importa los datos completos de una liga.
 * @param {object} dump 
 * @returns {Promise<void>}
 */
export function importLeagueData(dump) {
    return new Promise((resolve, reject) => {
        const db = getDB();
        const stores = ['leagues', 'teams', 'players', 'matches', 'events'];
        const tx = db.transaction(stores, 'readwrite');
        
        const leaguesStore = tx.objectStore('leagues');
        const teamsStore = tx.objectStore('teams');
        const playersStore = tx.objectStore('players');
        const matchesStore = tx.objectStore('matches');
        const eventsStore = tx.objectStore('events');
        
        const teamIdMap = {};
        const playerIdMap = {};
        const matchIdMap = {};
        
        const oldLeague = dump.league;
        const newLeagueData = {
            name: oldLeague.name.trim(),
            sport: oldLeague.sport,
            mode: oldLeague.mode,
            rounds: oldLeague.rounds || null,
            bracketTeamsCount: oldLeague.bracketTeamsCount || null,
            season: oldLeague.season.trim(),
            description: oldLeague.description || '',
            isActive: false,
            createdAt: oldLeague.createdAt || new Date().toISOString()
        };
        
        const leagueAddReq = leaguesStore.add(newLeagueData);
        leagueAddReq.onsuccess = () => {
            const newLeagueId = leagueAddReq.result;
            let teamsImported = 0;
            const teamsToImport = dump.teams || [];
            
            if (teamsToImport.length === 0) {
                importMatches();
                return;
            }
            
            teamsToImport.forEach(team => {
                const oldTeamId = team.id;
                const newTeamData = {
                    leagueId: newLeagueId,
                    name: team.name,
                    shield: team.shield || '',
                    primaryColor: team.primaryColor || '#3b82f6',
                    secondaryColor: team.secondaryColor || '#1e3a8a',
                    city: team.city || '',
                    stats: team.stats || { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalsDiff: 0, points: 0 },
                    createdAt: team.createdAt || new Date().toISOString()
                };
                
                const teamAddReq = teamsStore.add(newTeamData);
                teamAddReq.onsuccess = () => {
                    const newTeamId = teamAddReq.result;
                    teamIdMap[oldTeamId] = newTeamId;
                    teamsImported++;
                    
                    const teamPlayers = (dump.players || []).filter(p => p.teamId === oldTeamId);
                    teamPlayers.forEach(player => {
                        const oldPlayerId = player.id;
                        const newPlayerData = {
                            teamId: newTeamId,
                            name: player.name,
                            photo: player.photo || '',
                            position: player.position || '',
                            number: player.number,
                            stats: player.stats || { played: 0, goals: 0 },
                            createdAt: player.createdAt || new Date().toISOString()
                        };
                        
                        const playerAddReq = playersStore.add(newPlayerData);
                        playerAddReq.onsuccess = () => {
                            playerIdMap[oldPlayerId] = playerAddReq.result;
                        };
                    });
                    
                    if (teamsImported === teamsToImport.length) {
                        importMatches();
                    }
                };
            });
            
            function importMatches() {
                const matchesToImport = dump.matches || [];
                let matchesImported = 0;
                
                if (matchesToImport.length === 0) {
                    resolve();
                    return;
                }
                
                const pendingNextMatchResolutions = [];
                
                matchesToImport.forEach(match => {
                    const oldMatchId = match.id;
                    const newMatchData = {
                        leagueId: newLeagueId,
                        homeTeamId: match.homeTeamId ? teamIdMap[match.homeTeamId] : null,
                        awayTeamId: match.awayTeamId ? teamIdMap[match.awayTeamId] : null,
                        date: match.date || null,
                        status: match.status || 'Programado',
                        score: match.score || { home: 0, away: 0 },
                        round: match.round !== undefined ? match.round : null,
                        nextMatchId: null,
                        nextMatchHomeSlot: match.nextMatchHomeSlot !== undefined ? match.nextMatchHomeSlot : null,
                        winnerId: match.winnerId ? teamIdMap[match.winnerId] : null,
                        createdAt: match.createdAt || new Date().toISOString()
                    };
                    
                    const matchAddReq = matchesStore.add(newMatchData);
                    matchAddReq.onsuccess = () => {
                        const newMatchId = matchAddReq.result;
                        matchIdMap[oldMatchId] = newMatchId;
                        matchesImported++;
                        
                        if (match.nextMatchId) {
                            pendingNextMatchResolutions.push({
                                newMatchId: newMatchId,
                                oldNextMatchId: match.nextMatchId
                            });
                        }
                        
                        const matchEvents = (dump.events || []).filter(e => e.matchId === oldMatchId);
                        matchEvents.forEach(ev => {
                            eventsStore.add({
                                matchId: newMatchId,
                                playerId: playerIdMap[ev.playerId],
                                teamId: teamIdMap[ev.teamId],
                                type: ev.type,
                                minute: ev.minute ? Number(ev.minute) : null,
                                createdAt: ev.createdAt || new Date().toISOString()
                            });
                        });
                        
                        if (matchesImported === matchesToImport.length) {
                            resolveNextMatches();
                        }
                    };
                });
                
                function resolveNextMatches() {
                    if (pendingNextMatchResolutions.length === 0) {
                        resolve();
                        return;
                    }
                    
                    let resolvedCount = 0;
                    pendingNextMatchResolutions.forEach(res => {
                        matchesStore.get(res.newMatchId).onsuccess = (e) => {
                            const m = e.target.result;
                            if (m) {
                                m.nextMatchId = matchIdMap[res.oldNextMatchId] || null;
                                matchesStore.put(m).onsuccess = () => {
                                    resolvedCount++;
                                    if (resolvedCount === pendingNextMatchResolutions.length) {
                                        resolve();
                                    }
                                };
                            }
                        };
                    });
                }
            }
        };
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// Aliases nombrados alternativos para compatibilidad
export const revertMatch = undoMatch;

// Compatibilidad con exportación por objeto
export const transactions = {
    activateLeague,
    deleteLeagueCascade,
    finalizeMatch,
    undoMatch,
    revertMatch,
    saveMatchesList,
    importLeagueData
};