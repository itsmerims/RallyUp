import type { Court, FinancialConfig, Match, Player } from '../types';

export type ConnectionMode = 'online' | 'offline';

export interface LocalWorkspace {
  players: Player[];
  courts: Court[];
  matches: Match[];
  financialConfig: FinancialConfig | null;
}

const storageKey = (userId: string, collection: keyof LocalWorkspace) =>
  `rallyup_workspace_${userId}_${collection}`;

const hydratedKey = (userId: string, collection: keyof LocalWorkspace) =>
  `rallyup_workspace_${userId}_${collection}_hydrated`;

const read = <T>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
};

export const getConnectionMode = (): ConnectionMode =>
  localStorage.getItem('rallyup_connection_mode') === 'offline' ? 'offline' : 'online';

export const saveConnectionMode = (mode: ConnectionMode) =>
  localStorage.setItem('rallyup_connection_mode', mode);

export const readWorkspace = (userId: string): LocalWorkspace => {
  const matches = read<Match[]>(storageKey(userId, 'matches'), []);
  const validQueuedMatchIds = new Set(matches.filter(match => match.status === 'Waiting').map(match => match.id));
  const courts = read<Court[]>(storageKey(userId, 'courts'), []).map(court => ({
    ...court,
    // Older builds stored player IDs here. A court queue now contains match IDs only.
    queue: (court.queue || []).filter(id => validQueuedMatchIds.has(id)),
  }));
  const players = read<Player[]>(storageKey(userId, 'players'), []).map(player => ({
    ...player,
    // Self-heal legacy/corrupted records so they never vanish from the queue panel.
    status: (player.status === 'waiting' || player.status === 'reserved' || player.status === 'active' || player.status === 'resting' || player.status === 'timeout') ? player.status : 'waiting',
    stats: player.stats || { gamesPlayed: 0, wins: 0, losses: 0, currentStreak: 0 },
  }));
  return {
    players,
    courts,
    matches,
    financialConfig: read(storageKey(userId, 'financialConfig'), null),
  };
};

export const writeWorkspacePart = <K extends keyof LocalWorkspace>(
  userId: string,
  collection: K,
  value: LocalWorkspace[K],
) => localStorage.setItem(storageKey(userId, collection), JSON.stringify(value));

// Per-collection hydration marker. Local storage is the source of truth, so a
// workspace collection is only seeded from Firestore once (e.g. on a brand-new
// device). After that, local changes always win.
export const isCollectionHydrated = (userId: string, collection: keyof LocalWorkspace): boolean =>
  localStorage.getItem(hydratedKey(userId, collection)) === 'true';

export const markCollectionHydrated = (userId: string, collection: keyof LocalWorkspace) =>
  localStorage.setItem(hydratedKey(userId, collection), 'true');

export const clearWorkspace = (userId: string) => {
  const collections: (keyof LocalWorkspace)[] = ['players', 'courts', 'matches', 'financialConfig'];
  collections.forEach(collection => {
    localStorage.removeItem(storageKey(userId, collection));
    localStorage.removeItem(hydratedKey(userId, collection));
  });
};
