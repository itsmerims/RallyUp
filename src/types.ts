export type SkillTier = 'BEGINNER' | 'LOW_INTERMEDIATE' | 'INTERMEDIATE' | 'ADVANCED';
export type PlayerStatus = 'PLAYING' | 'WAITING' | 'RESTING' | 'OUT';
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
}

export interface Player {
  id: string;
  name: string;
  tier: SkillTier;
  status: PlayerStatus;
  ratingScore: number;
  joinedAt: number;
  hasPaid: boolean;
  userId?: string;
  fcmTokens?: string[];
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
