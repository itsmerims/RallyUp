export type SkillTier = 'BEG' | 'ADV_BEG' | 'LOW_INT' | 'INT' | 'MID_INT' | 'UP_INT' | 'ADV' | 'EXP' | 'PRO';
export type PlayerStatus = 'waiting' | 'active' | 'resting' | 'timeout';
export type CourtStatus = 'Available' | 'Occupied' | 'Finishing Soon';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  skillTier: SkillTier;
  country: string;
  role: 'PLAYER' | 'QUEUE_MASTER';
  profileCompleted: boolean;
  hasSeenWelcomeModal: boolean;
  ratingScore?: number;
  joinedAt?: number;
  stats?: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    currentStreak: number;
  };
  fcmTokens?: string[];
  clubIds?: string[];
}

export interface Player {
  id: string;
  name: string;
  tier: SkillTier;
  status: PlayerStatus;
  ratingScore: number;
  joinedAt: number;
  waitingSince: number;
  hasPaid: boolean;
  userId?: string;
  fcmTokens?: string[];
  sessionId?: string;
  timeIn?: string;
  timeOut?: string;
  stats: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    currentStreak: number;
  };
}

export interface Match {
  id: string;
  teamA: string[];
  teamB: string[];
  courtId: string;
  startTime: number | null;
  status: 'Waiting' | 'Active' | 'Completed';
  shuttlecocksUsed: number;
  scoreA?: number;
  scoreB?: number;
  sessionId?: string;
}

export interface Court {
  id: string;
  name: string;
  status: CourtStatus;
  activeMatchId: string | null;
  queue: string[];
}

export interface FinancialConfig {
  mode: 'Breakdown' | 'Fixed';
  courtFee: number;
  shuttleFee: number;
  fixedRate: number;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  createdAt: number;
  joinCode: string;
  memberCount: number;
}

export interface ClubMember {
  id: string;
  role: 'owner' | 'member';
  joinedAt: number;
  name: string;
  fcmTokens?: string[];
}

export type NotificationType = 'NEXT_UP' | 'COURT_READY';

export interface FcmNotificationPayload {
  title: string;
  body: string;
  icon: string;
  click_action: string;
  type?: NotificationType;
  courtId?: string;
  matchId?: string;
}
