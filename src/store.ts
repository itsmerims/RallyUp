import { create } from 'zustand';
import { Player, Court, Match, FinancialConfig, SkillTier, Club, ClubMember } from './types';
import * as firestoreService from './services/firestore';
import { sendMatchNotification } from './services/notifications';

interface AppState {
  players: Player[];
  courts: Court[];
  matches: Match[];
  financialConfig: FinancialConfig;
  clubs: Club[];
  clubMembers: ClubMember[];
  isLoading: boolean;
  dataLoaded: boolean;
  currentSessionId: string;
  
  // Internal setters for syncing
  setPlayers: (players: Player[]) => void;
  setCourts: (courts: Court[]) => void;
  setMatches: (matches: Match[]) => void;
  setFinancialConfig: (config: FinancialConfig) => void;
  setClubs: (clubs: Club[]) => void;
  setClubMembers: (members: ClubMember[]) => void;
  setDataLoaded: (loaded: boolean) => void;
  setCurrentSessionId: (id: string) => void;

  // Actions
  addPlayer: (userId: string, player: Omit<Player, 'id' | 'hasPaid' | 'ratingScore' | 'joinedAt' | 'stats' | 'status'>) => void;
  updatePlayerStatus: (userId: string, id: string, status: Player['status']) => void;
  togglePlayerPaid: (userId: string, id: string) => void;
  deletePlayer: (userId: string, id: string) => void;
  
  addMatch: (userId: string, match: Omit<Match, 'id' | 'startTime' | 'status' | 'shuttlecocksUsed'>) => void;
  completeMatch: (userId: string, matchId: string, teamAScore: number, teamBScore: number, shuttlesUsed: number) => void;
  
  updateFinancialConfig: (userId: string, config: FinancialConfig) => void;
  initializeCourts: (userId: string) => void;
  addCourt: (userId: string, name: string) => void;
  deleteCourt: (userId: string, courtId: string) => void;
}

const getBaseRating = (tier: SkillTier) => {
  switch(tier) {
    case 'BEGINNER': return 1000;
    case 'LOW_INTERMEDIATE': return 1400;
    case 'INTERMEDIATE': return 1800;
    case 'ADVANCED': return 2200;
    default: return 1000;
  }
};

export const useAppStore = create<AppState>()(
  (set, get) => ({
    players: [],
    courts: [],
    matches: [],
    clubs: [],
    clubMembers: [],
    financialConfig: {
      mode: 'Breakdown',
      courtFee: 0,
      shuttleFee: 0,
      fixedRate: 0,
    },
    isLoading: true,
    dataLoaded: false,
    currentSessionId: localStorage.getItem('rallyup_current_session_id') || '',
    
    setPlayers: (players) => set({ players }),
    setCourts: (courts) => set({ courts }),
    setMatches: (matches) => set({ matches }),
    setFinancialConfig: (config) => set({ financialConfig: config }),
    setClubs: (clubs) => set({ clubs }),
    setClubMembers: (members) => set({ clubMembers: members }),
    setDataLoaded: (loaded) => set({ dataLoaded: loaded, isLoading: !loaded }),
    setCurrentSessionId: (id) => {
      if (id) {
        localStorage.setItem('rallyup_current_session_id', id);
      } else {
        localStorage.removeItem('rallyup_current_session_id');
      }
      set({ currentSessionId: id });
    },
    
    addPlayer: async (userId, playerData) => {
      const sessionId = get().currentSessionId || undefined;
      const newPlayer: Player = {
        ...playerData,
        id: Math.random().toString(36).substring(7),
        joinedAt: Date.now(),
        hasPaid: false,
        ratingScore: getBaseRating(playerData.tier),
        status: 'WAITING',
        sessionId,
        stats: {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          currentStreak: 0
        }
      };
      await firestoreService.savePlayer(userId, newPlayer);
    },

    deletePlayer: async (userId, id) => {
      await firestoreService.deletePlayerDoc(userId, id);
    },
    
    updatePlayerStatus: async (userId, id, status) => {
      await firestoreService.updatePlayer(userId, id, { status });
    },

    togglePlayerPaid: async (userId, id) => {
      const player = get().players.find(p => p.id === id);
      if (player) {
        await firestoreService.updatePlayer(userId, id, { hasPaid: !player.hasPaid });
      }
    },

    addMatch: async (userId, matchData) => {
      const state = get();
      const court = state.courts.find(c => c.id === matchData.courtId);
      if (!court) return;

      const newMatch: Match = {
        ...matchData,
        id: Math.random().toString(36).substring(7),
        startTime: court.status === 'Available' ? Date.now() : null,
        status: court.status === 'Available' ? 'Active' : 'Waiting',
        shuttlecocksUsed: 0,
        sessionId: get().currentSessionId || undefined,
      };

      await firestoreService.saveMatch(userId, newMatch);

      if (court.status === 'Available') {
        await firestoreService.updateCourt(userId, court.id, { status: 'Occupied', activeMatchId: newMatch.id });
      } else {
        await firestoreService.updateCourt(userId, court.id, { queue: [...court.queue, newMatch.id] });
      }

      const playersToUpdate = [...newMatch.teamA, ...newMatch.teamB].filter(Boolean) as string[];
      for (const pId of playersToUpdate) {
        await firestoreService.updatePlayer(userId, pId, { status: newMatch.status === 'Active' ? 'PLAYING' : 'WAITING' });
      }

      if (newMatch.status === 'Active') {
        sendMatchNotification({
          playerIds: playersToUpdate,
          qmUserId: userId,
          title: 'Court Ready',
          body: 'Your match is ready! Please proceed to the court.',
          type: 'COURT_READY',
          courtId: newMatch.courtId,
          matchId: newMatch.id,
        });
      } else {
        sendMatchNotification({
          playerIds: playersToUpdate,
          qmUserId: userId,
          title: 'Next Up',
          body: 'You are next in queue for a court. Please stay ready.',
          type: 'NEXT_UP',
          courtId: newMatch.courtId,
          matchId: newMatch.id,
        });
      }
    },

    completeMatch: async (userId, matchId, teamAScore, teamBScore, shuttlesUsed) => {
      const state = get();
      const match = state.matches.find(m => m.id === matchId);
      if (!match) return;

      await firestoreService.updateMatch(userId, matchId, { 
        status: 'Completed', 
        shuttlecocksUsed: shuttlesUsed,
        scoreA: teamAScore,
        scoreB: teamBScore
      });

      const aWon = teamAScore > teamBScore;
      const bWon = teamBScore > teamAScore;
      
      const playersToUpdate = state.players.filter(p => match.teamA.includes(p.id) || match.teamB.includes(p.id));
      
      for (const p of playersToUpdate) {
         let stats = p.stats ? { ...p.stats } : { gamesPlayed: 0, wins: 0, losses: 0, currentStreak: 0 };
         let ratingScore = p.ratingScore || 1000;
         stats.gamesPlayed += 1;
         
         const isOnTeamA = match.teamA.includes(p.id);
         const wonGame = (isOnTeamA && aWon) || (!isOnTeamA && bWon);
         const lostGame = (isOnTeamA && bWon) || (!isOnTeamA && aWon);

         if (wonGame) {
           stats.wins += 1;
           stats.currentStreak = stats.currentStreak > 0 ? stats.currentStreak + 1 : 1;
           ratingScore += 15;
         } else if (lostGame) {
           stats.losses += 1;
           stats.currentStreak = stats.currentStreak < 0 ? stats.currentStreak - 1 : -1;
           ratingScore -= 10;
         }
         
         await firestoreService.updatePlayer(userId, p.id, {
           status: 'RESTING',
           stats,
           ratingScore
         });
      }

      const completedPlayerIds = [...match.teamA, ...match.teamB];
      sendMatchNotification({
        playerIds: completedPlayerIds,
        qmUserId: userId,
        title: 'Match Completed',
        body: aWon ? 'Team A wins!' : bWon ? 'Team B wins!' : 'Match ended in a draw.',
        courtId: match.courtId,
        matchId: match.id,
      });

      const court = state.courts.find(c => c.activeMatchId === matchId);
      if (court) {
        if (court.queue.length > 0) {
          const nextMatchId = court.queue[0];
          await firestoreService.updateCourt(userId, court.id, { 
            activeMatchId: nextMatchId, 
            queue: court.queue.slice(1), 
            status: 'Occupied' 
          });
          
          await firestoreService.updateMatch(userId, nextMatchId, { status: 'Active', startTime: Date.now() });
          
          const nextMatch = state.matches.find(m => m.id === nextMatchId);
          if (nextMatch) {
            const nextPlayers = [...nextMatch.teamA, ...nextMatch.teamB].filter(Boolean);
            for (const pId of nextPlayers) {
              await firestoreService.updatePlayer(userId, pId, { status: 'PLAYING' });
            }

            sendMatchNotification({
              playerIds: nextPlayers,
              qmUserId: userId,
              title: 'Court Ready',
              body: 'Your match is ready! Please proceed to the court.',
              type: 'COURT_READY',
              courtId: court.id,
              matchId: nextMatchId,
            });
          }
        } else {
          await firestoreService.updateCourt(userId, court.id, { activeMatchId: null, status: 'Available' });
        }
      }
    },

    updateFinancialConfig: async (userId, config) => {
      await firestoreService.saveFinancialConfig(userId, config);
    },
    
    initializeCourts: async (userId) => {
      await firestoreService.initializeDefaultCourts(userId);
    },

    addCourt: async (userId, name) => {
      const newCourt: Court = {
        id: 'c' + Math.random().toString(36).substring(7),
        name,
        status: 'Available',
        activeMatchId: null,
        queue: [],
      };
      await firestoreService.saveCourt(userId, newCourt);
    },

    deleteCourt: async (userId, courtId) => {
      await firestoreService.deleteCourtDoc(userId, courtId);
    }
  })
);
