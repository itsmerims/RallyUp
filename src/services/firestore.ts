import { db, auth } from '../firebase';
import { 
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc, 
  onSnapshot, query, where, writeBatch 
} from 'firebase/firestore';
import { Player, Court, Match, FinancialConfig } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We do not throw here to prevent crashing the entire React app
  // when there are permission errors (e.g. from missing Firestore rules).
}

// Subscriptions
export const subscribeToPlayers = (userId: string, callback: (players: Player[]) => void) => {
  const path = `users/${userId}/players`;
  return onSnapshot(collection(db, path), (snapshot) => {
    const players: Player[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      players.push({
        id: doc.id,
        name: data.name,
        tier: data.tier,
        ratingScore: data.ratingScore,
        joinedAt: data.joinedAt,
        hasPaid: data.hasPaid,
        status: data.status,
        stats: data.stats,
      } as Player);
    });
    callback(players);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const subscribeToCourts = (userId: string, callback: (courts: Court[]) => void) => {
  const path = `users/${userId}/courts`;
  return onSnapshot(collection(db, path), (snapshot) => {
    const courts: Court[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      courts.push({
        id: doc.id,
        name: data.name,
        status: data.status,
        activeMatchId: data.activeMatchId,
        queue: data.queue || [],
      } as Court);
    });
    callback(courts);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const subscribeToMatches = (userId: string, callback: (matches: Match[]) => void) => {
  const path = `users/${userId}/matches`;
  return onSnapshot(collection(db, path), (snapshot) => {
    const matches: Match[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      matches.push({
        id: doc.id,
        courtId: data.courtId,
        teamA: data.teamA,
        teamB: data.teamB,
        startTime: data.startTime,
        status: data.status,
        scoreA: data.scoreA,
        scoreB: data.scoreB,
        shuttlecocksUsed: data.shuttlecocksUsed,
      } as Match);
    });
    callback(matches);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const subscribeToFinancialConfig = (userId: string, callback: (config: FinancialConfig | null) => void) => {
  const path = `users/${userId}/financialConfig/default`;
  return onSnapshot(doc(db, path), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({
        mode: data.mode,
        courtFee: data.courtFee,
        shuttleFee: data.shuttleFee,
        fixedRate: data.fixedRate,
      } as FinancialConfig);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

// Writes
export const savePlayer = async (userId: string, player: Player) => {
  const path = `users/${userId}/players/${player.id}`;
  try {
    await setDoc(doc(db, `users/${userId}/players`, player.id), {
      ...player,
      userId
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const updatePlayer = async (userId: string, playerId: string, updates: Partial<Player>) => {
  const path = `users/${userId}/players/${playerId}`;
  try {
    await updateDoc(doc(db, `users/${userId}/players`, playerId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deletePlayerDoc = async (userId: string, playerId: string) => {
  const path = `users/${userId}/players/${playerId}`;
  try {
    await deleteDoc(doc(db, `users/${userId}/players`, playerId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const saveCourt = async (userId: string, court: Court) => {
  const path = `users/${userId}/courts/${court.id}`;
  try {
    await setDoc(doc(db, `users/${userId}/courts`, court.id), {
      ...court,
      userId
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const updateCourt = async (userId: string, courtId: string, updates: Partial<Court>) => {
  const path = `users/${userId}/courts/${courtId}`;
  try {
    await updateDoc(doc(db, `users/${userId}/courts`, courtId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const saveMatch = async (userId: string, match: Match) => {
  const path = `users/${userId}/matches/${match.id}`;
  try {
    await setDoc(doc(db, `users/${userId}/matches`, match.id), {
      ...match,
      userId
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const updateMatch = async (userId: string, matchId: string, updates: Partial<Match>) => {
  const path = `users/${userId}/matches/${matchId}`;
  try {
    await updateDoc(doc(db, `users/${userId}/matches`, matchId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const saveFinancialConfig = async (userId: string, config: FinancialConfig) => {
  const path = `users/${userId}/financialConfig/default`;
  try {
    await setDoc(doc(db, path), {
      ...config,
      userId
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// Initialization helper
export const initializeDefaultCourts = async (userId: string) => {
  const courts: Court[] = [
    { id: 'c1', name: 'Court 1', status: 'Available', activeMatchId: null, queue: [] },
    { id: 'c2', name: 'Court 2', status: 'Available', activeMatchId: null, queue: [] },
    { id: 'c3', name: 'Court 3', status: 'Available', activeMatchId: null, queue: [] },
    { id: 'c4', name: 'Court 4', status: 'Available', activeMatchId: null, queue: [] },
  ];
  
  const batch = writeBatch(db);
  courts.forEach(court => {
    const courtRef = doc(db, `users/${userId}/courts`, court.id);
    batch.set(courtRef, { ...court, userId });
  });
  
  const configRef = doc(db, `users/${userId}/financialConfig/default`);
  batch.set(configRef, {
    mode: 'Breakdown',
    courtFee: 0,
    shuttleFee: 0,
    fixedRate: 0,
    userId
  });
  
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/courts`);
  }
};
