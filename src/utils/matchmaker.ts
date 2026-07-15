import { Match, Player, SkillTier } from '../types';

const POOL_SIZE = 12;
const CRITICAL_WAIT_MS = 12 * 60 * 1000;
const WAIT_CAP_MS = 20 * 60 * 1000;

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

const pairRepeatWeight = (a: string, b: string, history: Match[], asPartners: boolean) => history.reduce((score, match, index) => {
  const teamAHasBoth = match.teamA.includes(a) && match.teamA.includes(b);
  const teamBHasBoth = match.teamB.includes(a) && match.teamB.includes(b);
  const facedEachOther = (match.teamA.includes(a) && match.teamB.includes(b)) || (match.teamB.includes(a) && match.teamA.includes(b));
  const repeated = asPartners ? teamAHasBoth || teamBHasBoth : facedEachOther;
  return repeated ? score + Math.exp(-index * 0.18) : score;
}, 0);

const scoreTeams = (teamA: [Player, Player], teamB: [Player, Player], history: Match[], now: number, criticalWait: boolean) => {
  const all = [...teamA, ...teamB];
  const strengthA = teamA.reduce((sum, player) => sum + playerStrength(player), 0);
  const strengthB = teamB.reduce((sum, player) => sum + playerStrength(player), 0);
  const teamDelta = Math.abs(strengthA - strengthB) / 350;
  const balanceScore = Math.exp(-0.5 * teamDelta * teamDelta);

  const tierSpread = Math.max(...all.map(player => getTierWeight(player.tier))) - Math.min(...all.map(player => getTierWeight(player.tier)));
  const compatibilityScore = Math.exp(-0.12 * tierSpread * tierSpread);
  const waitScore = all.reduce((sum, player) => sum + Math.min(1, (now - (player.waitingSince || player.joinedAt)) / WAIT_CAP_MS), 0) / 4;

  const partnerRepeats = pairRepeatWeight(teamA[0].id, teamA[1].id, history, true) + pairRepeatWeight(teamB[0].id, teamB[1].id, history, true);
  const partnerNovelty = Math.exp(-0.7 * partnerRepeats);
  const opponentRepeats = teamA.reduce((sum, playerA) => sum + teamB.reduce((inner, playerB) => inner + pairRepeatWeight(playerA.id, playerB.id, history, false), 0), 0);
  const opponentNovelty = Math.exp(-0.18 * opponentRepeats);
  const exactGroupRepeats = history.reduce((count, match) => {
    const ids = new Set([...match.teamA, ...match.teamB]);
    return all.every(player => ids.has(player.id)) ? count + 1 : count;
  }, 0);
  const groupNovelty = Math.exp(-0.45 * exactGroupRepeats);

  const balanceWeight = criticalWait ? 0.29 : 0.39;
  const waitWeight = criticalWait ? 0.34 : 0.24;
  return balanceScore * balanceWeight
    + compatibilityScore * 0.12
    + waitScore * waitWeight
    + partnerNovelty * 0.15
    + opponentNovelty * 0.05
    + groupNovelty * 0.05;
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
  const history = matches.filter(match => match.status === 'Completed').slice().reverse().slice(0, 30);
  let best: { players: Player[]; score: number } | null = null;

  // Always include the longest-waiting player to prevent starvation, then evaluate
  // every candidate trio and all three possible doubles team arrangements.
  for (let b = 1; b < pool.length - 2; b++) {
    for (let c = b + 1; c < pool.length - 1; c++) {
      for (let d = c + 1; d < pool.length; d++) {
        const four = [oldest, pool[b], pool[c], pool[d]];
        const splits: Array<[[number, number], [number, number]]> = [
          [[0, 1], [2, 3]],
          [[0, 2], [1, 3]],
          [[0, 3], [1, 2]],
        ];
        for (const [aSlots, bSlots] of splits) {
          const teamA: [Player, Player] = [four[aSlots[0]], four[aSlots[1]]];
          const teamB: [Player, Player] = [four[bSlots[0]], four[bSlots[1]]];
          const score = scoreTeams(teamA, teamB, history, now, criticalWait);
          if (!best || score > best.score) best = { players: [...teamA, ...teamB], score };
        }
      }
    }
  }

  return best?.players || null;
};
