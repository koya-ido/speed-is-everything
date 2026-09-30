import {
  clearPendingScore,
  getPendingScore,
  hasPendingScore,
  setPendingScore,
} from "@/features/game/utils/pendingScore";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("pendingScore", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("sets and gets pending score correctly", () => {
    const mockScore = { clear_count: 5, remaining_time: 1500 };
    setPendingScore(mockScore);
    expect(getPendingScore()).toEqual(mockScore);
    expect(hasPendingScore()).toBe(true);
  });

  it("returns null if no score is pending", () => {
    expect(getPendingScore()).toBeNull();
    expect(hasPendingScore()).toBe(false);
  });

  it("clears pending score", () => {
    const mockScore = { clear_count: 5, remaining_time: 1500 };
    setPendingScore(mockScore);
    clearPendingScore();
    expect(getPendingScore()).toBeNull();
    expect(hasPendingScore()).toBe(false);
  });
});
