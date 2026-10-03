import { soundManager } from "@/features/game/utils/sound";
import { describe, expect, it } from "vitest";

describe("soundManager", () => {
  it("initializes without throwing", () => {
    expect(soundManager).toBeDefined();
    expect(typeof soundManager.isMuted).toBe("boolean");
  });

  it("can toggle mute", () => {
    const initial = soundManager.isMuted;
    soundManager.toggleMute();
    expect(soundManager.isMuted).toBe(!initial);
    soundManager.setMuted(initial);
  });

  it("safe to call all audio methods in test environment", async () => {
    expect(() => {
      soundManager.unlock();
      soundManager.preloadAll();
      soundManager.playStart();
      soundManager.playBgm();
      soundManager.startTick();
      soundManager.stopTick();
      soundManager.playAction();
      soundManager.playHitNormal();
      soundManager.playCountdown();
      soundManager.playHitExcellent();
      soundManager.playHitGodlike();
      soundManager.playDamage();
      soundManager.playGameOver();
      soundManager.stopBgm();
    }).not.toThrow();
  });
});
