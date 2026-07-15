import { create } from 'zustand';
import { Player, Court, Match, FinancialConfig, SkillTier, Club, ClubMember } from './types';
import { getBaseRating } from './utils/tiers';
import * as firestoreService from './services/firestore';
import { sendMatchNotification } from './services/notifications';
import { ConnectionMode, getConnectionMode, saveConnectionMode, writeWorkspacePart } from './services/localData';

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
  connectionMode: ConnectionMode;
  
  // Internal setters for syncing
  setPlayers: (players: Player[]) => void;
  setCourts: (courts: Court[]) => void;
  setMatches: (matches: Match[]) => void;
  setFinancialConfig: (config: FinancialConfig) => void;
  setClubs: (clubs: Club[]) => void;
  setClubMembers: (members: ClubMember[]) => void;
  setDataLoaded: (loaded: boolean) => void;
  setCurrentSessionId: (id: string) => void;
  setConnectionMode: (mode: ConnectionMode) => void;

  // Actions
  addPlayer: (userId: string, player: Omit<Player, 'id' | 'hasPaid' | 'ratingScore' | 'joinedAt' | 'waitingSince' | 'stats' | 'status'> & { status?: Player['status'] }) => Promise<void>;
  updatePlayerStatus: (userId: string, id: string, status: Player['status']) => Promise<void>;
  togglePlayerPaid: (userId: string, id: string) => Promise<void>;
  deletePlayer: (userId: string, id: string) => Promise<void>;
  
  addMatch: (userId: string, match: Omit<Match, 'id' | 'startTime' | 'status' | 'shuttlecocksUsed'>) => Promise<void>;
  startMatch: (userId: string, courtId: string) => Promise<void>;
  resetMatchTimer: (userId: string, matchId: string) => Promise<void>;
  cancelMatch: (userId: string, matchId: string) => Promise<void>;
  completeMatch: (userId: string, matchId: string, teamAScore: number, teamBScore: number, shuttlesUsed: number) => Promise<void>;
  
  updateFinancialConfig: (userId: string, config: FinancialConfig) => Promise<void>;
  initializeCourts: (userId: string) => Promise<void>;
  addCourt: (userId: string, name: string) => Promise<void>;
  deleteCourt: (userId: string, courtId: string) => Promise<void>;
}



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
    connectionMode: getConnectionMode(),
    
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
    setConnectionMode: (mode) => {
      saveConnectionMode(mode);
      set({ connectionMode: mode });
    },
    
    addPlayer: async (userId, playerData) => {
      const sessionId = get().currentSessionId;
      const newPlayer: Player = {
        ...playerData,
        id: Math.random().toString(36).substring(7),
        joinedAt: Date.now(),
        hasPaid: false,
        ratingScore: getBaseRating(playerData.tier),
        status: playerData.status ?? 'waiting',
        waitingSince: Date.now(),
        ...(sessionId ? { sessionId } : {}),
        stats: {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          currentStreak: 0
        }
      };
      const players = [...get().players, newPlayer];
      set({ players });
      writeWorkspacePart(userId, 'players', players);
      if (get().connectionMode === 'online') await firestoreService.savePlayer(userId, newPlayer);
    },

    deletePlayer: async (userId, id) => {
      const players = get().players.filter(player => player.id !== id);
      set({ players });
      writeWorkspacePart(userId, 'players', players);
      if (get().connectionMode === 'online') await firestoreService.deletePlayerDoc(userId, id);
    },
    
    updatePlayerStatus: async (userId, id, status) => {
      const waitingSince = status === 'waiting' ? Date.now() : undefined;
      const players = get().players.map(player => player.id === id ? { ...player, status, ...(waitingSince ? { waitingSince } : {}) } : player);
      set({ players });
      writeWorkspacePart(userId, 'players', players);
      if (get().connectionMode === 'online') await firestoreService.updatePlayer(userId, id, { status, ...(waitingSince ? { waitingSince } : {}) });
    },

    togglePlayerPaid: async (userId, id) => {
      const player = get().players.find(p => p.id === id);
      if (player) {
        const players = get().players.map(item => item.id === id ? { ...item, hasPaid: !item.hasPaid } : item);
        set({ players });
        writeWorkspacePart(userId, 'players', players);
        if (get().connectionMode === 'online') await firestoreService.updatePlayer(userId, id, { hasPaid: !player.hasPaid });
      }
    },

    addMatch: async (userId, matchData) => {
      const state = get();
      const court = state.courts.find(c => c.id === matchData.courtId);
      if (!court) return;

      const playerIds = [...matchData.teamA, ...matchData.teamB].filter(Boolean);
      const uniquePlayerIds = new Set(playerIds);
      const allAvailable = playerIds.every(id => state.players.some(p => p.id === id && p.status === 'waiting'));
      if (playerIds.length !== 4 || uniquePlayerIds.size !== 4 || !allAvailable) {
        throw new Error('A queued match requires four unique waiting players.');
      }

      const newMatch: Match = {
        ...matchData,
        id: Math.random().toString(36).substring(7),
        startTime: null,
        status: 'Waiting',
        shuttlecocksUsed: 0,
        sessionId: get().currentSessionId || undefined,
      };

      const matches = [...state.matches, newMatch];
      const courts = state.courts.map(item => item.id === court.id
        ? { ...item, queue: [...item.queue, newMatch.id] }
        : item);
      const players = state.players.map(player => uniquePlayerIds.has(player.id)
        ? { ...player, status: 'active' as const }
        : player);

      set({ matches, courts, players });
      writeWorkspacePart(userId, 'matches', matches);
      writeWorkspacePart(userId, 'courts', courts);
      writeWorkspacePart(userId, 'players', players);

      if (get().connectionMode === 'online') {
        await firestoreService.saveMatch(userId, newMatch);
        await firestoreService.updateCourt(userId, court.id, { queue: [...court.queue, newMatch.id] });
        await Promise.all(playerIds.map(id => firestoreService.updatePlayer(userId, id, { status: 'active' })));
      }

      if (get().connectionMode === 'online') {
        sendMatchNotification({
          playerIds,
          qmUserId: userId,
          title: 'Next Up',
          body: `Your match is queued for ${court.name}.`,
          type: 'NEXT_UP',
          courtId: newMatch.courtId,
          matchId: newMatch.id,
        });
      }
    },

    startMatch: async (userId, courtId) => {
      const state = get();
      const court = state.courts.find(c => c.id === courtId);
      if (!court || court.activeMatchId) return;
      const ownQueuedMatch = court.queue
        .map(matchId => state.matches.find(match => match.id === matchId && match.status === 'Waiting'))
        .find((match): match is Match => Boolean(match));
      const queuedMatch = ownQueuedMatch || state.matches.find(match => match.status === 'Waiting');
      if (!queuedMatch) return;
      const matchId = queuedMatch.id;

      const startTime = Date.now();
      const matches = state.matches.map(match => match.id === matchId
        ? { ...match, courtId, status: 'Active' as const, startTime }
        : match);
      const courts = state.courts.map(item => ({
        ...item,
        ...(item.id === courtId ? { status: 'Occupied' as const, activeMatchId: matchId } : {}),
        queue: item.queue.filter(id => id !== matchId),
      }));
      set({ matches, courts });
      writeWorkspacePart(userId, 'matches', matches);
      writeWorkspacePart(userId, 'courts', courts);

      if (get().connectionMode === 'online') {
        await firestoreService.updateMatch(userId, matchId, { courtId, status: 'Active', startTime });
        await Promise.all(courts.filter((item, index) => {
          const previous = state.courts[index];
          return item.activeMatchId !== previous.activeMatchId || item.status !== previous.status || item.queue.length !== previous.queue.length;
        }).map(item => firestoreService.updateCourt(userId, item.id, {
          status: item.status, activeMatchId: item.activeMatchId, queue: item.queue,
        })));
        sendMatchNotification({
          playerIds: [...queuedMatch.teamA, ...queuedMatch.teamB], qmUserId: userId,
          title: 'Court Ready', body: `Please proceed to ${court.name}.`, type: 'COURT_READY',
          courtId, matchId,
        });
      }
    },

    resetMatchTimer: async (userId, matchId) => {
      const startTime = Date.now();
      const matches = get().matches.map(match => match.id === matchId ? { ...match, startTime } : match);
      set({ matches });
      writeWorkspacePart(userId, 'matches', matches);
      if (get().connectionMode === 'online') await firestoreService.updateMatch(userId, matchId, { startTime });
    },

    cancelMatch: async (userId, matchId) => {
      const state = get();
      const match = state.matches.find(item => item.id === matchId);
      if (!match || match.status === 'Completed') return;
      const playerIds = new Set([...match.teamA, ...match.teamB]);
      const matches = state.matches.filter(item => item.id !== matchId);
      const players = state.players.map(player => playerIds.has(player.id)
        ? { ...player, status: 'waiting' as const, waitingSince: Date.now() }
        : player);
      const courts = state.courts.map(court => ({
        ...court,
        activeMatchId: court.activeMatchId === matchId ? null : court.activeMatchId,
        status: court.activeMatchId === matchId ? 'Available' as const : court.status,
        queue: court.queue.filter(id => id !== matchId),
      }));
      set({ matches, players, courts });
      writeWorkspacePart(userId, 'matches', matches);
      writeWorkspacePart(userId, 'players', players);
      writeWorkspacePart(userId, 'courts', courts);
      if (get().connectionMode === 'online') {
        await firestoreService.deleteMatchDoc(userId, matchId);
        await Promise.all(players.filter(player => playerIds.has(player.id)).map(player =>
          firestoreService.updatePlayer(userId, player.id, { status: 'waiting', waitingSince: player.waitingSince })));
        const court = state.courts.find(item => item.activeMatchId === matchId || item.queue.includes(matchId));
        if (court) await firestoreService.updateCourt(userId, court.id, {
          activeMatchId: court.activeMatchId === matchId ? null : court.activeMatchId,
          status: court.activeMatchId === matchId ? 'Available' : court.status,
          queue: court.queue.filter(id => id !== matchId),
        });
      }
    },

    completeMatch: async (userId, matchId, teamAScore, teamBScore, shuttlesUsed) => {
      const state = get();
      const match = state.matches.find(m => m.id === matchId);
      if (!match) return;

      const aWon = teamAScore > teamBScore;
      const bWon = teamBScore > teamAScore;
      const waitingSince = Date.now();
      const completedPlayerIds = [...match.teamA, ...match.teamB];
      const players = state.players.map(player => {
        if (!completedPlayerIds.includes(player.id)) return player;
        const stats = player.stats ? { ...player.stats } : { gamesPlayed: 0, wins: 0, losses: 0, currentStreak: 0 };
        let ratingScore = player.ratingScore || 1000;
        stats.gamesPlayed += 1;
        const onTeamA = match.teamA.includes(player.id);
        const won = (onTeamA && aWon) || (!onTeamA && bWon);
        const lost = (onTeamA && bWon) || (!onTeamA && aWon);
        if (won) { stats.wins += 1; stats.currentStreak = stats.currentStreak > 0 ? stats.currentStreak + 1 : 1; ratingScore += 15; }
        if (lost) { stats.losses += 1; stats.currentStreak = stats.currentStreak < 0 ? stats.currentStreak - 1 : -1; ratingScore -= 10; }
        return { ...player, status: 'waiting' as const, waitingSince, stats, ratingScore };
      });
      const matches = state.matches.map(item => item.id === matchId ? {
        ...item, status: 'Completed' as const, shuttlecocksUsed: shuttlesUsed, scoreA: teamAScore, scoreB: teamBScore,
      } : item);
      const courts = state.courts.map(court => court.activeMatchId === matchId
        ? { ...court, activeMatchId: null, status: 'Available' as const }
        : court);
      set({ players, matches, courts });
      writeWorkspacePart(userId, 'players', players);
      writeWorkspacePart(userId, 'matches', matches);
      writeWorkspacePart(userId, 'courts', courts);

      if (get().connectionMode === 'online') {
        await firestoreService.updateMatch(userId, matchId, { status: 'Completed', shuttlecocksUsed: shuttlesUsed, scoreA: teamAScore, scoreB: teamBScore });
        await Promise.all(players.filter(player => completedPlayerIds.includes(player.id)).map(player =>
          firestoreService.updatePlayer(userId, player.id, { status: player.status, waitingSince, stats: player.stats, ratingScore: player.ratingScore })));
        const court = state.courts.find(item => item.activeMatchId === matchId);
        if (court) await firestoreService.updateCourt(userId, court.id, { activeMatchId: null, status: 'Available' });
      }

      if (get().connectionMode === 'online') sendMatchNotification({
        playerIds: completedPlayerIds,
        qmUserId: userId,
        title: 'Match Completed',
        body: aWon ? 'Team A wins!' : bWon ? 'Team B wins!' : 'Match ended in a draw.',
        courtId: match.courtId,
        matchId: match.id,
      });

    },

    updateFinancialConfig: async (userId, config) => {
      set({ financialConfig: config }); writeWorkspacePart(userId, 'financialConfig', config);
      if (get().connectionMode === 'online') await firestoreService.saveFinancialConfig(userId, config);
    },
    
    initializeCourts: async (userId) => {
      if (get().connectionMode === 'online') await firestoreService.initializeDefaultCourts(userId);
      else {
        const courts = Array.from({ length: 4 }, (_, index) => ({ id: `c${index + 1}`, name: `Court ${index + 1}`, status: 'Available' as const, activeMatchId: null, queue: [] }));
        set({ courts }); writeWorkspacePart(userId, 'courts', courts);
      }
    },

    addCourt: async (userId, name) => {
      const newCourt: Court = {
        id: 'c' + Math.random().toString(36).substring(7),
        name,
        status: 'Available',
        activeMatchId: null,
        queue: [],
      };
      const courts = [...get().courts, newCourt]; set({ courts }); writeWorkspacePart(userId, 'courts', courts);
      if (get().connectionMode === 'online') await firestoreService.saveCourt(userId, newCourt);
    },

    deleteCourt: async (userId, courtId) => {
      const court = get().courts.find(item => item.id === courtId);
      if (!court || court.activeMatchId || court.queue.length) return;
      const courts = get().courts.filter(item => item.id !== courtId); set({ courts }); writeWorkspacePart(userId, 'courts', courts);
      if (get().connectionMode === 'online') await firestoreService.deleteCourtDoc(userId, courtId);
    }
  })
);
