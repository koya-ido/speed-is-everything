export const calculateAverage = (reactions: readonly number[]): number => {
  return reactions.length
    ? reactions.reduce((a, b) => a + b, 0) / reactions.length
    : 0;
};

export const calculateRemainingTime = (
  totalTime: number,
  reactions: readonly number[],
): number => {
  return totalTime - reactions.reduce((a, b) => a + b, 0);
};

export const getValidReactions = (rawReactions: unknown): number[] => {
  if (!Array.isArray(rawReactions)) return [];
  return rawReactions.filter(
    (r): r is number => typeof r === "number" && Number.isFinite(r),
  );
};

export const calculateFastest = (
  reactions: readonly number[],
): number | null => {
  if (reactions.length === 0) return null;
  return reactions.reduce((min, r) => (r < min ? r : min), Infinity);
};

export const calculateSlowest = (
  reactions: readonly number[],
): number | null => {
  if (reactions.length === 0) return null;
  return reactions.reduce((max, r) => (r > max ? r : max), -Infinity);
};

export const calculateMedian = (reactions: readonly number[]): number => {
  if (reactions.length === 0) return 0;
  const sorted = [...reactions].sort((a, b) => a - b);
  const mid = Math.floor((sorted.length - 1) / 2);
  const mid2 = Math.ceil((sorted.length - 1) / 2);
  return (sorted[mid] + sorted[mid2]) / 2;
};
