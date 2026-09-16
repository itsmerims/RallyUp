import { Match, Player, SkillTier } from '../types';

// --- Tunable matchmaking constants ---
const POOL_SIZE = 12; // max waiting players considered for each search
const CRITICAL_WAIT_MS = 12 * 60 * 1000; // oldest-pending wait that flips scoring toward fairness
const WAIT_CAP_MS = 20 * 60 * 1000; // wait time treated as fully maxed
const HISTORY_WINDOW = 30; // recent completed matches used for novelty scoring
const HARD_REPEAT_WINDOW = 4; // matches within this recency get an extra repeat penalty
const GROUP_REPEAT_EXPONENT = 0.6; // exact same-4 group repeats
const PARTNER_REPEAT_EXPONENT = 1.0; // same partner revisited
const OPPONENT_REPEAT_EXPONENT = 0.25; // faced each other again
const EXACT_REPEAT_PENALTY = 0.25; // score multiplier when the quartet is the last completed match
const RATING_SPREAD_MAX = 800; // strength spread considered "perfectly balanced"

const easeInCubic = (x: number) => x * x * x;

export const getTierWeight = (tier: SkillTier) => {
  const tiers: SkillTier[] = ['BEG', 'ADV_BEG', 'LOW_INT', 'INT', 'MID_INT', 'UP_INT', 'ADV', 'EXP', 'PRO'];
  return tiers.indexOf(tier) + 1;
};

export const calculateVariance = (players: Player[]) => {
  const weights = players.map(player => getTierWeight(player.tier));
  const mean = weights.reduce((sum, weight) => sum + weight, 0) / weights.length;
  return weights.reduce((sum, weight) => sum + Math.pow(weight - mean, 2), 0) / weights.length;
};

const playerStrength = (player: Player) => player.ratingScore || getTierWeight(player.tier) * 200;

// Decays over history (index 0 = most recent) with an extra boost inside the hard window.
const recencyWeight = (index: number) => {
  const decay = Math.exp(-index * 0.18);
  return index < HARD_REPEAT_WINDOW ? decay * (1.6 - index / HARD_REPEAT_WINDOW) : decay;
};

const pairRepeatWeight = (a: string, b: string, history: Match[], asPartners: boolean) => history.reduce((score, match, index) => {
  const teamAHasBoth = match.teamA.includes(a) && match.teamA.includes(b);
  const teamBHasBoth = match.teamB.includes(a) && match.teamB.includes(b);
  const facedEachOther = (match.teamA.includes(a) && match.teamB.includes(b)) || (match.teamB.includes(a) && match.teamA.includes(b));
  const repeated = asPartners ? teamAHasBoth || teamBHasBoth : facedEachOther;
  return repeated ? score + recencyWeight(index) : score;
}, 0);

const scoreTeams = (teamA: [Player, Player], teamB: [Player, Player], history: Match[], now: number, criticalWait: boolean) => {
  const all = [...teamA, ...teamB];
  const strengthA = teamA.reduce((sum, player) => sum + playerStrength(player), 0);
  const strengthB = teamB.reduce((sum, player) => sum + playerStrength(player), 0);
  const teamDelta = Math.abs(strengthA - strengthB) / 350;
  const balanceScore = Math.exp(-0.5 * teamDelta * teamDelta);

  // Rating-aware quartet compactness: when ratings exist, prefer four players of
  // similar strength; otherwise falls back to tier-derived strength via playerStrength.
  const strengths = all.map(playerStrength);
  const strengthSpread = Math.max(...strengths) - Math.min(...strengths);
  const hasRatings = all.some(player => player.ratingScore > 0);
  const ratingBalance = hasRatings ? 1 - Math.min(1, strengthSpread / RATING_SPREAD_MAX) : 0;

  const tierSpread = Math.max(...all.map(player => getTierWeight(player.tier))) - Math.min(...all.map(player => getTierWeight(player.tier)));
  const compatibilityScore = Math.exp(-0.12 * tierSpread * tierSpread);
  const waitScore = all.reduce((sum, player) => sum + easeInCubic(Math.min(1, (now - (player.waitingSince || player.joinedAt)) / WAIT_CAP_MS)), 0) / 4;

  const partnerRepeats = pairRepeatWeight(teamA[0].id, teamA[1].id, history, true) + pairRepeatWeight(teamB[0].id, teamB[1].id, history, true);
  const partnerNovelty = Math.exp(-PARTNER_REPEAT_EXPONENT * partnerRepeats);
  const opponentRepeats = teamA.reduce((sum, playerA) => sum + teamB.reduce((inner, playerB) => inner + pairRepeatWeight(playerA.id, playerB.id, history, false), 0), 0);
  const opponentNovelty = Math.exp(-OPPONENT_REPEAT_EXPONENT * opponentRepeats);
  const exactGroupRepeats = history.reduce((count, match, index) => {
    const ids = new Set([...match.teamA, ...match.teamB]);
    return all.every(player => ids.has(player.id)) ? count + recencyWeight(index) : count;
  }, 0);
  const groupNovelty = Math.exp(-GROUP_REPEAT_EXPONENT * exactGroupRepeats);

  const balanceWeight = criticalWait ? 0.29 : 0.39;
  const waitWeight = criticalWait ? 0.34 : 0.24;
  return balanceScore * balanceWeight
    + compatibilityScore * 0.10
    + ratingBalance * 0.08
    + waitScore * waitWeight
    + partnerNovelty * 0.15
    + opponentNovelty * 0.06
    + groupNovelty * 0.04;
};

export const generateOptimalMatch = (players: Player[], matches: Match[] = []): Player[] | null => {
  const now = Date.now();
  const pool = players
    .filter(player => player.status === 'waiting')
    .sort((a, b) => (a.waitingSince || a.joinedAt) - (b.waitingSince || b.joinedAt))
    .slice(0, POOL_SIZE);
  if (pool.length < 4) return null;

  const oldest = pool[0];
  const criticalWait = now - (oldest.waitingSince || oldest.joinedAt) >= CRITICAL_WAIT_MS;
  const history = matches.filter(match => match.status === 'Completed').slice().reverse().slice(0, HISTORY_WINDOW);
  const lastMatch = history[0];
  const lastIds = lastMatch ? new Set([...lastMatch.teamA, ...lastMatch.teamB]) : null;
  let best: { players: Player[]; score: number } | null = null;

  // Always include the longest-waiting player to prevent starvation, then evaluate
  // every candidate trio and all three possible doubles team arrangements.
  for (let b = 1; b < pool.length - 2; b++) {
    for (let c = b + 1; c < pool.length - 1; c++) {
      for (let d = c + 1; d < pool.length; d++) {
        const four = [oldest, pool[b], pool[c], pool[d]];
        const exactRepeat = lastIds && lastIds.size === 4 && four.every(player => lastIds.has(player.id));
        const splits: Array<[[number, number], [number, number]]> = [
          [[0, 1], [2, 3]],
          [[0, 2], [1, 3]],
          [[0, 3], [1, 2]],
        ];
        for (const [aSlots, bSlots] of splits) {
          const teamA: [Player, Player] = [four[aSlots[0]], four[aSlots[1]]];
          const teamB: [Player, Player] = [four[bSlots[0]], four[bSlots[1]]];
          const score = (exactRepeat ? EXACT_REPEAT_PENALTY : 1) * scoreTeams(teamA, teamB, history, now, criticalWait);
          if (!best || score > best.score) best = { players: [...teamA, ...teamB], score };
        }
      }
    }
  }

  return best?.players || null;
};