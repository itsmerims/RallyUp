import { SkillTier } from '../types';

export const TIER_SHORTCUTS: Record<string, SkillTier> = {
  '1': 'BEG',
  '2': 'ADV_BEG',
  '3': 'LOW_INT',
  '4': 'INT',
  '5': 'MID_INT',
  '6': 'UP_INT',
  '7': 'ADV',
  '8': 'EXP',
  '9': 'PRO',
};

export const TIER_LABELS: Record<SkillTier, string> = {
  BEG: 'BEG',
  ADV_BEG: 'ADV BEG',
  LOW_INT: 'LOW INT',
  INT: 'INT',
  MID_INT: 'MID INT',
  UP_INT: 'UP INT',
  ADV: 'ADV',
  EXP: 'EXP',
  PRO: 'PRO',
};

export const TIER_FULL_LABELS: Record<SkillTier, string> = {
  BEG: 'Beginner',
  ADV_BEG: 'Advanced Beginner',
  LOW_INT: 'Low Intermediate',
  INT: 'Intermediate',
  MID_INT: 'Mid Intermediate',
  UP_INT: 'Upper Intermediate',
  ADV: 'Advanced',
  EXP: 'Expert',
  PRO: 'Professional',
};

export const TIER_BASE_RATINGS: Record<SkillTier, number> = {
  BEG: 800,
  ADV_BEG: 1000,
  LOW_INT: 1200,
  INT: 1400,
  MID_INT: 1600,
  UP_INT: 1800,
  ADV: 2000,
  EXP: 2200,
  PRO: 2400,
};

export const getTierFromShortcut = (input: string): SkillTier | null => {
  return TIER_SHORTCUTS[input] || null;
};

export const getTierLabel = (tier: SkillTier): string => {
  return TIER_LABELS[tier] || tier;
};

export const getTierFullLabel = (tier: SkillTier): string => {
  return TIER_FULL_LABELS[tier] || tier;
};

export const getBaseRating = (tier: SkillTier): number => {
  return TIER_BASE_RATINGS[tier] || 800;
};
