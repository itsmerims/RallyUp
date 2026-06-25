export type SkillTier = 'BEGINNER' | 'LOW_INTERMEDIATE' | 'INTERMEDIATE' | 'ADVANCED';
export type PlayerStatus = 'PLAYING' | 'WAITING' | 'RESTING' | 'OUT';
export type CourtStatus = 'Available' | 'Occupied' | 'Finishing Soon';

export interface Player {
  id: string;
  name: string;
  tier: SkillTier;
  status: PlayerStatus;
  ratingScore: number;
  joinedAt: number;
  hasPaid: boolean;
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
