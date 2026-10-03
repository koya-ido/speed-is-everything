import {
  getDeviceType,
  getReactionRank,
  REACTION_THRESHOLDS,
} from "@/features/game/utils/thresholds";
import { describe, expect, it } from "vitest";

describe("thresholds", () => {
  it("has correct threshold definitions", () => {
    expect(REACTION_THRESHOLDS.PC.GODLIKE).toBe(180);
    expect(REACTION_THRESHOLDS.PC.EXCELLENT).toBe(200);
    expect(REACTION_THRESHOLDS.MOBILE.GODLIKE).toBe(180);
    expect(REACTION_THRESHOLDS.MOBILE.EXCELLENT).toBe(200);
  });

  describe("getReactionRank for PC", () => {
    it("returns GODLIKE for < 180ms", () => {
      expect(getReactionRank(179.9, "PC")).toBe("GODLIKE");
      expect(getReactionRank(150, "PC")).toBe("GODLIKE");
    });

    it("returns EXCELLENT for 180ms - 199.9ms", () => {
      expect(getReactionRank(180, "PC")).toBe("EXCELLENT");
      expect(getReactionRank(199.9, "PC")).toBe("EXCELLENT");
    });

    it("returns NORMAL for >= 200ms", () => {
      expect(getReactionRank(200, "PC")).toBe("NORMAL");
      expect(getReactionRank(250, "PC")).toBe("NORMAL");
    });
  });

  describe("getReactionRank for MOBILE", () => {
    it("returns GODLIKE for < 180ms", () => {
      expect(getReactionRank(179.9, "MOBILE")).toBe("GODLIKE");
      expect(getReactionRank(170, "MOBILE")).toBe("GODLIKE");
    });

    it("returns EXCELLENT for 180ms - 199.9ms", () => {
      expect(getReactionRank(180, "MOBILE")).toBe("EXCELLENT");
      expect(getReactionRank(190.5, "MOBILE")).toBe("EXCELLENT");
      expect(getReactionRank(199.9, "MOBILE")).toBe("EXCELLENT");
    });

    it("returns NORMAL for >= 200ms", () => {
      expect(getReactionRank(200, "MOBILE")).toBe("NORMAL");
      expect(getReactionRank(230.1, "MOBILE")).toBe("NORMAL");
    });
  });

  describe("getDeviceType", () => {
    it("detects MOBILE when ontouchstart is in window", () => {
      (window as unknown as Record<string, unknown>).ontouchstart = null;
      try {
        expect(getDeviceType()).toBe("MOBILE");
      } finally {
        delete (window as unknown as Record<string, unknown>).ontouchstart;
      }
    });

    it("returns PC when touch features are not present", () => {
      delete (window as unknown as Record<string, unknown>).ontouchstart;
      const originalMax = navigator.maxTouchPoints;
      Object.defineProperty(navigator, "maxTouchPoints", {
        value: 0,
        configurable: true,
      });

      try {
        expect(getDeviceType()).toBe("PC");
      } finally {
        Object.defineProperty(navigator, "maxTouchPoints", {
          value: originalMax,
          configurable: true,
        });
      }
    });
  });
});
