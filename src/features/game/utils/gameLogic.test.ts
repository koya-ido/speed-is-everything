import {
  getShareUrl,
  getUnpredictableDelay,
} from "@/features/game/utils/gameLogic";
import { describe, expect, it, vi } from "vitest";

describe("gameLogic", () => {
  describe("getUnpredictableDelay", () => {
    it("returns a delay between 1500 and 7000", () => {
      // ランダム値のモック化をせずに複数回テストして範囲内に収まるか確認
      for (let i = 0; i < 100; i++) {
        const delay = getUnpredictableDelay();
        expect(delay).toBeGreaterThanOrEqual(1500);
        expect(delay).toBeLessThanOrEqual(7000);
      }
    });

    it("uses exponential distribution correctly (mocked random)", () => {
      const mathRandomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
      const delay = getUnpredictableDelay();
      // -Math.log(1 - 0.5) / 0.0012 = 577.6...
      // 1500 + 577.6... = 2077.6...
      expect(delay).toBeCloseTo(2077.6, 0);
      mathRandomSpy.mockRestore();
    });
  });

  describe("getShareUrl", () => {
    it("generates a correct twitter share URL", () => {
      const stats = {
        clearCount: 5,
        remainingTime: 1200.5,
        average: 250.1,
        median: 245.0,
        deviceType: "PC",
      };

      const url = getShareUrl(stats);
      expect(url).toContain("https://twitter.com/intent/tweet?text=");

      const decodedText = decodeURIComponent(
        url.split("text=")[1].split("&url=")[0],
      );
      expect(decodedText).toContain("スコア: 5回クリア！");
      expect(decodedText).toContain("残りタイム: 1200.5ms");
      expect(decodedText).toContain("平均: 250.1ms");
      expect(decodedText).toContain("中央値: 245.0ms");
      expect(decodedText).toContain("部門: PC");
      expect(decodedText).toContain("#SpeedIsEverything");
    });
  });
});
