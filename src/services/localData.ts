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
  return {
    players: read(storageKey(userId, 'players'), []),
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
