export const formatWaitTime = (waitingSince: number): string => {
  const elapsed = Date.now() - waitingSince;
  const ms = Math.max(0, elapsed);
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}hr`;
  if (minutes > 0) return `${minutes}min`;
  return `${seconds}s`;
};

export const getWaitTimeMinutes = (waitingSince: number): number => {
  return Math.floor((Date.now() - waitingSince) / 60000);
};
