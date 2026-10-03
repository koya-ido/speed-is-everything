import { haptics } from "@/features/game/utils/haptics";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("haptics utility", () => {
  const originalVibrate = navigator.vibrate;

  beforeEach(() => {
    navigator.vibrate = vi.fn(() => true);
  });

  afterEach(() => {
    if (originalVibrate) {
      navigator.vibrate = originalVibrate;
    } else {
      delete (navigator as unknown as { vibrate?: unknown }).vibrate;
    }
  });

  it("checks support accurately", () => {
    expect(haptics.isSupported()).toBe(true);
  });

  it("calls navigator.vibrate on action", () => {
    haptics.action();
    expect(navigator.vibrate).toHaveBeenCalledWith(25);
  });

  it("calls navigator.vibrate on normal hit", () => {
    haptics.hitNormal();
    expect(navigator.vibrate).toHaveBeenCalledWith(35);
  });

  it("calls navigator.vibrate on excellent hit", () => {
    haptics.hitExcellent();
    expect(navigator.vibrate).toHaveBeenCalledWith([30, 40, 40]);
  });

  it("calls navigator.vibrate on godlike hit", () => {
    haptics.hitGodlike();
    expect(navigator.vibrate).toHaveBeenCalledWith([50, 40, 80]);
  });

  it("calls navigator.vibrate on gameOver", () => {
    haptics.gameOver();
    expect(navigator.vibrate).toHaveBeenCalledWith([80, 50, 80]);
  });

  it("safely handles when vibrate is not supported", () => {
    delete (navigator as unknown as { vibrate?: unknown }).vibrate;
    expect(haptics.isSupported()).toBe(false);
    expect(() => {
      haptics.action();
      haptics.hitNormal();
      haptics.hitExcellent();
      haptics.hitGodlike();
      haptics.gameOver();
    }).not.toThrow();
  });
});
