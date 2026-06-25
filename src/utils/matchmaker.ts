import { Player, SkillTier } from '../types';

export const getTierWeight = (tier: SkillTier) => {
  switch (tier) {
    case 'BEGINNER': return 1;
    case 'LOW_INTERMEDIATE': return 2;
    case 'INTERMEDIATE': return 3;
    case 'ADVANCED': return 4;
    default: return 1;
  }
};

export const calculateVariance = (players: Player[]) => {
  const weights = players.map(p => getTierWeight(p.tier));
  const mean = weights.reduce((a, b) => a + b, 0) / weights.length;
  return weights.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / weights.length;
};

export const generateOptimalMatch = (players: Player[]): Player[] | null => {
  const waiting = players.filter(p => p.status === 'WAITING');
  if (waiting.length < 4) return null;

  const sortedCandidates = [...waiting].sort((a, b) => a.joinedAt - b.joinedAt);
  const locked = [sortedCandidates[0], sortedCandidates[1]];
  const remaining = sortedCandidates.slice(2);
  
  let bestPair = [remaining[0], remaining[1]];
  
  if (remaining.length > 2) {
      let lowestVariance = Infinity;
      for (let i = 0; i < remaining.length - 1; i++) {
        for (let j = i + 1; j < remaining.length; j++) {
          const currentGroup = [...locked, remaining[i], remaining[j]];
          const v = calculateVariance(currentGroup);
          if (v < lowestVariance) {
            lowestVariance = v;
            bestPair = [remaining[i], remaining[j]];
          }
        }
      }
  }
  
  return [...locked, ...bestPair];
};
