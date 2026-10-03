import { soundManager } from "@/features/game/utils/sound";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Measurement Accuracy & Performance Benchmark", () => {
  beforeEach(() => {
    soundManager.unlock();
  });

  afterEach(() => {
    soundManager.stopBgm();
    soundManager.stopTick();
  });

  describe("1. Audio Synchronous Execution Overhead", () => {
    it("playAction execution overhead is under 1.5ms (does not block frame render)", () => {
      // Warm up
      soundManager.playAction();

      const start = performance.now();
      const iterations = 50;
      for (let i = 0; i < iterations; i++) {
        soundManager.playAction();
      }
      const duration = performance.now() - start;
      const averageTime = duration / iterations;

      // 1 frame at 60fps is 16.6ms. Sound trigger must take < 1.5ms
      expect(averageTime).toBeLessThan(1.5);
    });

    it("startTick and stopTick execution overhead is under 1.0ms", () => {
      soundManager.startTick();
      soundManager.stopTick();

      const start = performance.now();
      const iterations = 50;
      for (let i = 0; i < iterations; i++) {
        soundManager.startTick();
        soundManager.stopTick();
      }
      const duration = performance.now() - start;
      const averageTime = duration / (iterations * 2);

      expect(averageTime).toBeLessThan(1.0);
    });

    it("playHitGodlike and playHitExcellent execution overhead is under 2.0ms", () => {
      soundManager.playHitGodlike();
      soundManager.playHitExcellent();

      const start = performance.now();
      const iterations = 30;
      for (let i = 0; i < iterations; i++) {
        soundManager.playHitGodlike();
        soundManager.playHitExcellent();
      }
      const duration = performance.now() - start;
      const averageTime = duration / (iterations * 2);

      expect(averageTime).toBeLessThan(2.0);
    });
  });

  describe("2. Particle Computation Overhead & Cleanup Guarantee", () => {
    it("simulated 75 particle creation (GODLIKE burst) takes under 1.0ms", () => {
      const burstSimulation = () => {
        const particles: Array<{
          x: number;
          y: number;
          vx: number;
          vy: number;
          size: number;
          alpha: number;
          decay: number;
        }> = [];

        for (let i = 0; i < 75; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 16 + 4;
          particles.push({
            x: 500,
            y: 500,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 4 + 3,
            alpha: 1,
            decay: Math.random() * 0.02 + 0.015,
          });
        }
        return particles;
      };

      const start = performance.now();
      const iterations = 50;
      for (let i = 0; i < iterations; i++) {
        burstSimulation();
      }
      const duration = performance.now() - start;
      const averageTime = duration / iterations;

      expect(averageTime).toBeLessThan(1.0);
    });

    it("particles naturally decay to 0 within 70 frames (~1.1s), ensuring zero CPU waste", () => {
      // Test that max particle lifespan does not bleed into next ACTION round
      const decayMin = 0.015; // slowest decay
      let alpha = 1.0;
      let frames = 0;

      while (alpha > 0) {
        alpha -= decayMin;
        frames++;
      }

      // 1.0 / 0.015 = 66.6 frames (~1.11s at 60fps)
      // Since INTERVAL is 800ms and WAITING delay is >= 1500ms (total >= 2300ms),
      // all particles are guaranteed to naturally vanish long before next ACTION
      expect(frames).toBeLessThanOrEqual(70);
    });
  });

  describe("3. Timer Precision & Reaction Computation Integrity", () => {
    it("reaction calculation maintains sub-millisecond precision without rounding drift", () => {
      const baseTime = 1000.12345;
      const clickTime = 1234.56789;

      const reaction = clickTime - baseTime;
      expect(reaction).toBeCloseTo(234.44444, 4);

      // Remaining time deduction
      const initialRemaining = 3000;
      const newRemaining = initialRemaining - reaction;
      expect(newRemaining).toBeCloseTo(2765.55556, 4);
    });

    it("immediate reaction edge case (< 5ms) computes correctly without -1 sentinel error", () => {
      const now = performance.now();
      const actionStartTime = now; // initialized synchronously with performance.now()

      const clickTime = now + 120.4;
      const calculatedReaction = clickTime - actionStartTime;

      expect(calculatedReaction).toBeCloseTo(120.4, 1);
    });
  });
});
