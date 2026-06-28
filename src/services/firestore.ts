import { db, auth } from '../firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, 
  onSnapshot, query, where, writeBatch 
} from 'firebase/firestore';
import { Player, Court, Match, FinancialConfig, SkillTier } from '../types';

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
export const subscribeToPlayers = (userId: string, callback: (players: Player[]) => void, sessionId?: string) => {
  const path = `users/${userId}/players`;
  const ref = sessionId
    ? query(collection(db, path), where('sessionId', '==', sessionId))
    : collection(db, path);
  return onSnapshot(ref, (snapshot) => {
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
        fcmTokens: data.fcmTokens || [],
        sessionId: data.sessionId,
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

export const subscribeToMatches = (userId: string, callback: (matches: Match[]) => void, sessionId?: string) => {
  const path = `users/${userId}/matches`;
  const ref = sessionId
    ? query(collection(db, path), where('sessionId', '==', sessionId))
    : collection(db, path);
  return onSnapshot(ref, (snapshot) => {
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
        sessionId: data.sessionId,
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

export const deleteCourtDoc = async (userId: string, courtId: string) => {
  const path = `users/${userId}/courts/${courtId}`;
  try {
    await deleteDoc(doc(db, `users/${userId}/courts`, courtId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
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

// Auto-register a player into a QM's roster when they join a session
export const autoRegisterPlayer = async (qmUserId: string, playerId: string, name: string, tier: SkillTier, sessionId: string) => {
  const path = `users/${qmUserId}/players/${playerId}`;
  try {
    await setDoc(doc(db, path), {
      userId: qmUserId,
      name,
      tier,
      ratingScore: 1000,
      joinedAt: Date.now(),
      hasPaid: false,
      status: 'WAITING',
      sessionId,
      autoRegistered: true,
      stats: { gamesPlayed: 0, wins: 0, losses: 0, currentStreak: 0 },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

// Global Profile operations
export const subscribeToUserProfile = (userId: string, callback: (profile: any | null) => void) => {
  const path = `profiles/${userId}`;
  return onSnapshot(doc(db, 'profiles', userId), (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
    callback(null);
  });
};

export const saveUserProfile = async (userId: string, profile: any) => {
  const path = `profiles/${userId}`;
  try {
    await setDoc(doc(db, 'profiles', userId), profile);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const updateUserProfile = async (userId: string, updates: any) => {
  const path = `profiles/${userId}`;
  try {
    await updateDoc(doc(db, 'profiles', userId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteUserProfile = async (userId: string) => {
  const path = `profiles/${userId}`;
  try {
    await deleteDoc(doc(db, 'profiles', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const subscribeToGlobalProfiles = (callback: (profiles: any[]) => void) => {
  const path = 'profiles';
  return onSnapshot(collection(db, 'profiles'), (snapshot) => {
    const profiles: any[] = [];
    snapshot.forEach((docSnap) => {
      profiles.push({ id: docSnap.id, ...docSnap.data() });
    });
    callback(profiles);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

// Session mapping operations (6-digit code mapping to QM's userId)
export const saveSessionMapping = async (sessionId: string, qmUserId: string, active: boolean, matchSessionId?: string) => {
  const path = `sessions/${sessionId}`;
  try {
    await setDoc(doc(db, 'sessions', sessionId), { qmUserId, active, matchSessionId });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getSessionMapping = async (sessionId: string): Promise<{ qmUserId: string; matchSessionId?: string } | null> => {
  const path = `sessions/${sessionId}`;
  try {
    const docSnap = await getDoc(doc(db, 'sessions', sessionId));
    if (docSnap.exists() && docSnap.data().active) {
      return { qmUserId: docSnap.data().qmUserId, matchSessionId: docSnap.data().matchSessionId };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

// Batch operations for Settings data reset
export const deleteAllMatches = async (userId: string) => {
  const path = `users/${userId}/matches`;
  try {
    const snapshot = await getDocs(collection(db, path));
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const deleteAllPlayers = async (userId: string) => {
  const path = `users/${userId}/players`;
  try {
    const snapshot = await getDocs(collection(db, path));
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const deleteAllCourts = async (userId: string) => {
  const path = `users/${userId}/courts`;
  try {
    const snapshot = await getDocs(collection(db, path));
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

