export type DeviceType = "PC" | "MOBILE";

export const REACTION_THRESHOLDS = {
  PC: {
    GODLIKE: 180,
    EXCELLENT: 200,
  },
  MOBILE: {
    GODLIKE: 250,
    EXCELLENT: 270,
  },
} as const;

export type ReactionRank = "GODLIKE" | "EXCELLENT" | "NORMAL";

export const getReactionRank = (
  reaction: number,
  deviceType: DeviceType = "PC",
): ReactionRank => {
  const threshold = REACTION_THRESHOLDS[deviceType];
  if (reaction < threshold.GODLIKE) return "GODLIKE";
  if (reaction < threshold.EXCELLENT) return "EXCELLENT";
  return "NORMAL";
};

export const getDeviceType = (): DeviceType => {
  if (typeof window === "undefined") return "PC";
  return "ontouchstart" in window ||
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
    ? "MOBILE"
    : "PC";
};
