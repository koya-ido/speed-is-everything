import {
  calculateDamage,
  calculateNextCombo,
  calculateRankMultiplier,
  checkFoul,
  clampHp,
  formatRoomId,
  generateRoomId,
  generateRoundDelay,
  getActiveComboMultiplier,
  getBattleReactionRank,
  resolveRound,
} from "@/features/battle/utils/battleLogic";
import { describe, expect, it } from "vitest";

describe("battleLogic", () => {
  describe("calculateRankMultiplier", () => {
    it("NORMAL: always 1.0 multiplier regardless of combo", () => {
      expect(calculateRankMultiplier("NORMAL", 0)).toBe(1.0);
      expect(calculateRankMultiplier("NORMAL", 3)).toBe(1.0);
      expect(calculateRankMultiplier("NORMAL", 5)).toBe(1.0);
    });

    it("EXCELLENT: 2.0 * (1 + combo / 10), max 3.0 at 5 combo", () => {
      expect(calculateRankMultiplier("EXCELLENT", 0)).toBe(2.0);
      expect(calculateRankMultiplier("EXCELLENT", 1)).toBeCloseTo(2.2);
      expect(calculateRankMultiplier("EXCELLENT", 3)).toBeCloseTo(2.6);
      expect(calculateRankMultiplier("EXCELLENT", 5)).toBe(3.0);
      // caps at 5
      expect(calculateRankMultiplier("EXCELLENT", 10)).toBe(3.0);
    });

    it("GODLIKE: 3.0 * (1 + (combo * 2) / 10), max 6.0 at 5 combo", () => {
      expect(calculateRankMultiplier("GODLIKE", 0)).toBe(3.0);
      expect(calculateRankMultiplier("GODLIKE", 1)).toBeCloseTo(3.6);
      expect(calculateRankMultiplier("GODLIKE", 2)).toBeCloseTo(4.2);
      expect(calculateRankMultiplier("GODLIKE", 5)).toBe(6.0);
      // caps at 5
      expect(calculateRankMultiplier("GODLIKE", 8)).toBe(6.0);
    });
  });

  describe("calculateDamage", () => {
    it("deals damage when player is faster than opponent", () => {
      // (250 - 180) * 3.0 (GODLIKE, combo 0) = 70 * 3 = 210
      const damage = calculateDamage(180, 250, "GODLIKE", 0);
      expect(damage).toBe(210);
    });

    it("deals 0 damage when player is slower than opponent", () => {
      const damage = calculateDamage(250, 180, "GODLIKE", 0);
      expect(damage).toBe(0);
    });

    it("deals 0 damage when times are identical (DRAW)", () => {
      const damage = calculateDamage(200, 200, "EXCELLENT", 2);
      expect(damage).toBe(0);
    });

    it("applies combo multiplier to damage correctly", () => {
      // (300 - 200) = 100 diff
      // EXCELLENT with 5 combo = 3.0x multiplier -> 300 damage
      const damage = calculateDamage(200, 300, "EXCELLENT", 5);
      expect(damage).toBe(300);
    });
  });

  describe("calculateNextCombo", () => {
    it("increments combo on round win with EXCELLENT or GODLIKE up to 5", () => {
      expect(calculateNextCombo(0, true, false, "EXCELLENT")).toBe(1);
      expect(calculateNextCombo(1, true, false, "GODLIKE")).toBe(2);
      expect(calculateNextCombo(4, true, false, "GODLIKE")).toBe(5);
      expect(calculateNextCombo(5, true, false, "GODLIKE")).toBe(5);
    });

    it("resets combo to 0 on round win if rank is NORMAL", () => {
      expect(calculateNextCombo(3, true, false, "NORMAL")).toBe(0);
    });

    it("resets combo to 0 on round loss", () => {
      expect(calculateNextCombo(4, false, false, "GODLIKE")).toBe(0);
      expect(calculateNextCombo(2, false, false, "NORMAL")).toBe(0);
    });

    it("maintains combo on DRAW", () => {
      expect(calculateNextCombo(3, false, true, "EXCELLENT")).toBe(3);
      expect(calculateNextCombo(0, false, true, "NORMAL")).toBe(0);
    });
  });

  describe("getBattleReactionRank", () => {
    it("determines correct rank for PC and mobile", () => {
      expect(getBattleReactionRank(170, "desktop")).toBe("GODLIKE");
      expect(getBattleReactionRank(190, "desktop")).toBe("EXCELLENT");
      expect(getBattleReactionRank(220, "desktop")).toBe("NORMAL");

      expect(getBattleReactionRank(170, "mobile")).toBe("GODLIKE");
      expect(getBattleReactionRank(190, "mobile")).toBe("EXCELLENT");
      expect(getBattleReactionRank(220, "mobile")).toBe("NORMAL");
    });
  });

  describe("generateRoomId and formatRoomId", () => {
    it("generates a 6-digit room code with hyphen format XXX-XXX", () => {
      const code = generateRoomId();
      expect(code).toMatch(/^\d{3}-\d{3}$/);
    });

    it("formats arbitrary input correctly", () => {
      expect(formatRoomId("123456")).toBe("123-456");
      expect(formatRoomId("123-456")).toBe("123-456");
      expect(formatRoomId("12")).toBe("12");
      expect(formatRoomId("123")).toBe("123");
      expect(formatRoomId("1234")).toBe("123-4");
      expect(formatRoomId("ab12cd34")).toBe("AB1-2CD");
    });
  });

  describe("generateRoundDelay", () => {
    it("generates delay between 2000ms and 4500ms", () => {
      for (let i = 0; i < 20; i++) {
        const delay = generateRoundDelay();
        expect(delay).toBeGreaterThanOrEqual(2000);
        expect(delay).toBeLessThanOrEqual(4500);
      }
    });
  });

  describe("checkFoul", () => {
    it("detects early click", () => {
      expect(checkFoul(null, true)).toBe("early_click");
      expect(checkFoul(150, true)).toBe("early_click");
    });

    it("detects abnormal time under 100ms", () => {
      expect(checkFoul(99, false)).toBe("too_fast");
      expect(checkFoul(50, false)).toBe("too_fast");
    });

    it("returns null for normal valid clicks", () => {
      expect(checkFoul(150, false)).toBeNull();
      expect(checkFoul(250, false)).toBeNull();
    });
  });

  describe("resolveRound", () => {
    it("resolves player early foul as immediate opponent win", () => {
      const res = resolveRound(
        {
          hp: 1000,
          combo: 2,
          currentRoundTime: null,
          currentRoundRank: null,
          currentRoundFoul: "early_click",
        },
        {
          hp: 1000,
          combo: 0,
          currentRoundTime: 200,
          currentRoundRank: "EXCELLENT",
          currentRoundFoul: null,
        },
      );
      expect(res.winner).toBe("opponent");
      expect(res.matchOver).toBe(true);
      expect(res.matchWinner).toBe("opponent");
      expect(res.reason).toBe("foul");
      expect(res.playerNewHp).toBe(0);
      expect(res.playerNewCombo).toBe(0);
    });

    it("resolves opponent foul as immediate player win", () => {
      const res = resolveRound(
        {
          hp: 1000,
          combo: 1,
          currentRoundTime: 180,
          currentRoundRank: "GODLIKE",
          currentRoundFoul: null,
        },
        {
          hp: 1000,
          combo: 3,
          currentRoundTime: 80,
          currentRoundRank: "GODLIKE",
          currentRoundFoul: "too_fast",
        },
      );
      expect(res.winner).toBe("player");
      expect(res.matchOver).toBe(true);
      expect(res.matchWinner).toBe("player");
      expect(res.reason).toBe("foul");
      expect(res.opponentNewHp).toBe(0);
    });

    it("resolves draw round correctly without HP reduction and maintains combo", () => {
      const res = resolveRound(
        {
          hp: 1000,
          combo: 2,
          currentRoundTime: 200,
          currentRoundRank: "EXCELLENT",
          currentRoundFoul: null,
        },
        {
          hp: 1000,
          combo: 1,
          currentRoundTime: 200,
          currentRoundRank: "EXCELLENT",
          currentRoundFoul: null,
        },
      );
      expect(res.winner).toBe("draw");
      expect(res.playerDamageTaken).toBe(0);
      expect(res.opponentDamageTaken).toBe(0);
      expect(res.playerNewHp).toBe(1000);
      expect(res.opponentNewHp).toBe(1000);
      expect(res.playerNewCombo).toBe(2);
      expect(res.opponentNewCombo).toBe(1);
      expect(res.matchOver).toBe(false);
    });

    it("resolves player win with damage and combo increment", () => {
      // player: 160ms (GODLIKE, combo 0 -> 3.0x), opponent: 260ms (diff 100ms * 3.0 = 300 damage)
      const res = resolveRound(
        {
          hp: 1000,
          combo: 0,
          currentRoundTime: 160,
          currentRoundRank: "GODLIKE",
          currentRoundFoul: null,
        },
        {
          hp: 1000,
          combo: 2,
          currentRoundTime: 260,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      expect(res.winner).toBe("player");
      expect(res.opponentDamageTaken).toBe(300);
      expect(res.opponentNewHp).toBe(700);
      expect(res.playerNewCombo).toBe(1);
      expect(res.opponentNewCombo).toBe(0);
      expect(res.matchOver).toBe(false);
    });

    it("triggers matchOver when HP drops to 0", () => {
      const res = resolveRound(
        {
          hp: 500,
          combo: 1,
          currentRoundTime: 150,
          currentRoundRank: "GODLIKE",
          currentRoundFoul: null,
        },
        {
          hp: 200,
          combo: 0,
          currentRoundTime: 300,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      // diff 150 * 3.6 = 540 damage > 200 HP -> 0 HP
      expect(res.winner).toBe("player");
      expect(res.opponentNewHp).toBe(0);
      expect(res.matchOver).toBe(true);
      expect(res.matchWinner).toBe("player");
      expect(res.reason).toBe("hp_zero");
    });

    it("matches the combo bonus progression rule: 1st win has 0 bonus, 2nd win has 1st bonus, max at 6 consecutive wins", () => {
      // 1st win: combo before = 0 -> appliedCombo = 0 -> multiplier = 2.0 (no combo bonus)
      const r1 = resolveRound(
        {
          hp: 1500,
          combo: 0,
          currentRoundTime: 180,
          currentRoundRank: "EXCELLENT",
          currentRoundFoul: null,
        },
        {
          hp: 1500,
          combo: 0,
          currentRoundTime: 280,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      expect(r1.appliedCombo).toBe(0);
      expect(r1.playerMultiplier).toBe(2.0); // 1st win: NO combo bonus
      expect(r1.playerNewCombo).toBe(1);

      // 2nd consecutive win: combo before = 1 -> appliedCombo = 1 -> multiplier = 2.2 (1st combo bonus)
      const r2 = resolveRound(
        {
          hp: 1500,
          combo: r1.playerNewCombo,
          currentRoundTime: 180,
          currentRoundRank: "EXCELLENT",
          currentRoundFoul: null,
        },
        {
          hp: 1500,
          combo: 0,
          currentRoundTime: 280,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      expect(r2.appliedCombo).toBe(1);
      expect(r2.playerMultiplier).toBeCloseTo(2.2); // 2nd win: 1st combo bonus (+10%)
      expect(r2.playerNewCombo).toBe(2);

      // 3rd consecutive win
      const r3 = resolveRound(
        {
          hp: 1500,
          combo: r2.playerNewCombo,
          currentRoundTime: 180,
          currentRoundRank: "EXCELLENT",
          currentRoundFoul: null,
        },
        {
          hp: 1500,
          combo: 0,
          currentRoundTime: 280,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      expect(r3.appliedCombo).toBe(2);
      expect(r3.playerMultiplier).toBeCloseTo(2.4);

      // 4th consecutive win
      const r4 = resolveRound(
        {
          hp: 1500,
          combo: r3.playerNewCombo,
          currentRoundTime: 180,
          currentRoundRank: "EXCELLENT",
          currentRoundFoul: null,
        },
        {
          hp: 1500,
          combo: 0,
          currentRoundTime: 280,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      expect(r4.appliedCombo).toBe(3);
      expect(r4.playerMultiplier).toBeCloseTo(2.6);

      // 5th consecutive win
      const r5 = resolveRound(
        {
          hp: 1500,
          combo: r4.playerNewCombo,
          currentRoundTime: 180,
          currentRoundRank: "EXCELLENT",
          currentRoundFoul: null,
        },
        {
          hp: 1500,
          combo: 0,
          currentRoundTime: 280,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      expect(r5.appliedCombo).toBe(4);
      expect(r5.playerMultiplier).toBeCloseTo(2.8);

      // 6th consecutive win (MAX)
      const r6 = resolveRound(
        {
          hp: 1500,
          combo: r5.playerNewCombo,
          currentRoundTime: 180,
          currentRoundRank: "EXCELLENT",
          currentRoundFoul: null,
        },
        {
          hp: 1500,
          combo: 0,
          currentRoundTime: 280,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      expect(r6.appliedCombo).toBe(5);
      expect(r6.playerMultiplier).toBe(3.0); // max at 6 consecutive wins!
      expect(r6.playerNewCombo).toBe(5);
    });

    it("clamps near-zero float residual values (<= 0.05) to exactly 0", () => {
      expect(clampHp(0.04)).toBe(0);
      expect(clampHp(0.05)).toBe(0);
      expect(clampHp(0.0001)).toBe(0);
      expect(clampHp(-10)).toBe(0);
      expect(clampHp(0.06)).toBe(0.1);
      expect(clampHp(1.23)).toBe(1.2);
    });

    it("triggers matchOver if remaining HP would be a tiny float below 0.05", () => {
      // opponent has 100 HP, damage is 99.96 -> residual 0.04 -> clamped to 0 -> matchOver: true
      const res = resolveRound(
        {
          hp: 500,
          combo: 0,
          currentRoundTime: 150,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
        {
          hp: 100,
          combo: 0,
          currentRoundTime: 250,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      // diff 100ms * 1.0 = 100 damage -> 100 - 100 = 0
      expect(res.opponentNewHp).toBe(0);
      expect(res.matchOver).toBe(true);
      expect(res.matchWinner).toBe("player");
    });

    it("triggers matchOver on DRAW if either player HP is already 0", () => {
      const res = resolveRound(
        {
          hp: 0,
          combo: 0,
          currentRoundTime: 200,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
        {
          hp: 500,
          combo: 0,
          currentRoundTime: 200,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      expect(res.winner).toBe("draw");
      expect(res.matchOver).toBe(true);
      expect(res.matchWinner).toBe("opponent"); // player has 0 HP, opponent has 500
      expect(res.reason).toBe("hp_zero");
    });
  });

  describe("combo bonus specification (mixed pattern & streak logic)", () => {
    it("getActiveComboMultiplier returns correct multiplier and rankType for HP bar badge", () => {
      expect(getActiveComboMultiplier(0, 0)).toEqual({
        multiplier: 1.0,
        rankType: null,
      });
      // 1 godlike win gives 1.2x with GODLIKE styling
      expect(getActiveComboMultiplier(1, 1)).toEqual({
        multiplier: 1.2,
        rankType: "GODLIKE",
      });
      // 1 excellent win gives 1.1x with EXCELLENT styling
      expect(getActiveComboMultiplier(1, 0)).toEqual({
        multiplier: 1.1,
        rankType: "EXCELLENT",
      });
      // 5 godlike streak gives 2.0x
      expect(getActiveComboMultiplier(5, 5)).toEqual({
        multiplier: 2.0,
        rankType: "GODLIKE",
      });
    });

    it("executes the exact 10-step sequence specified by the user", () => {
      let playerCombo = 0;
      let playerGodlikeCombo = 0;

      // 1. excellent
      const r1 = resolveRound(
        {
          hp: 5000,
          combo: playerCombo,
          godlikeCombo: playerGodlikeCombo,
          currentRoundTime: 190,
          currentRoundRank: "EXCELLENT",
          currentRoundFoul: null,
        },
        {
          hp: 5000,
          combo: 0,
          godlikeCombo: 0,
          currentRoundTime: 300,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      expect(r1.appliedCombo).toBe(0);
      expect(r1.appliedComboMult).toBe(1.0);
      expect(r1.appliedBonusType).toBeNull();
      playerCombo = r1.playerNewCombo;
      playerGodlikeCombo = r1.playerNewGodlikeCombo;
      expect(playerCombo).toBe(1);
      expect(playerGodlikeCombo).toBe(0);

      // 2. godlike ← excellent以上なので、excellentコンボボーナス発生1.1倍発生
      const r2 = resolveRound(
        {
          hp: 5000,
          combo: playerCombo,
          godlikeCombo: playerGodlikeCombo,
          currentRoundTime: 160,
          currentRoundRank: "GODLIKE",
          currentRoundFoul: null,
        },
        {
          hp: 5000,
          combo: 0,
          godlikeCombo: 0,
          currentRoundTime: 300,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      expect(r2.appliedCombo).toBe(1);
      expect(r2.appliedComboMult).toBe(1.1);
      expect(r2.appliedBonusType).toBe("EXCELLENT");
      playerCombo = r2.playerNewCombo;
      playerGodlikeCombo = r2.playerNewGodlikeCombo;
      expect(playerCombo).toBe(2);
      expect(playerGodlikeCombo).toBe(1);

      // 3. excellent ← excellent以上なので、excellentコンボボーナス継続1.2倍発生
      const r3 = resolveRound(
        {
          hp: 5000,
          combo: playerCombo,
          godlikeCombo: playerGodlikeCombo,
          currentRoundTime: 190,
          currentRoundRank: "EXCELLENT",
          currentRoundFoul: null,
        },
        {
          hp: 5000,
          combo: 0,
          godlikeCombo: 0,
          currentRoundTime: 300,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      expect(r3.appliedCombo).toBe(2);
      expect(r3.appliedComboMult).toBe(1.2);
      expect(r3.appliedBonusType).toBe("EXCELLENT");
      playerCombo = r3.playerNewCombo;
      playerGodlikeCombo = r3.playerNewGodlikeCombo;
      expect(playerCombo).toBe(3);
      expect(playerGodlikeCombo).toBe(0); // godlike streak reset by EXCELLENT!

      // 4. godlike ← excellent以上なので、excellentコンボボーナス継続1.3倍発生
      const r4 = resolveRound(
        {
          hp: 5000,
          combo: playerCombo,
          godlikeCombo: playerGodlikeCombo,
          currentRoundTime: 160,
          currentRoundRank: "GODLIKE",
          currentRoundFoul: null,
        },
        {
          hp: 5000,
          combo: 0,
          godlikeCombo: 0,
          currentRoundTime: 300,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      expect(r4.appliedCombo).toBe(3);
      expect(r4.appliedComboMult).toBe(1.3);
      expect(r4.appliedBonusType).toBe("EXCELLENT");
      playerCombo = r4.playerNewCombo;
      playerGodlikeCombo = r4.playerNewGodlikeCombo;
      expect(playerCombo).toBe(4);
      expect(playerGodlikeCombo).toBe(1);

      // 5. godlike ← godlike以上が2連続目なので、godlikeコンボボーナス1.2倍だが、excellentコンボボーナス1.4倍のほうが倍率が大きいためexcellentボーナスを優先
      const r5 = resolveRound(
        {
          hp: 5000,
          combo: playerCombo,
          godlikeCombo: playerGodlikeCombo,
          currentRoundTime: 160,
          currentRoundRank: "GODLIKE",
          currentRoundFoul: null,
        },
        {
          hp: 5000,
          combo: 0,
          godlikeCombo: 0,
          currentRoundTime: 300,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      expect(r5.appliedCombo).toBe(4);
      expect(r5.appliedComboMult).toBe(1.4);
      expect(r5.appliedBonusType).toBe("EXCELLENT");
      playerCombo = r5.playerNewCombo;
      playerGodlikeCombo = r5.playerNewGodlikeCombo;
      expect(playerCombo).toBe(5);
      expect(playerGodlikeCombo).toBe(2);

      // 6. godlike ← まだexcellentボーナスの1.5倍のほうがgodlikeの1.4倍より大きいのでexcellentボーナスを優先
      const r6 = resolveRound(
        {
          hp: 5000,
          combo: playerCombo,
          godlikeCombo: playerGodlikeCombo,
          currentRoundTime: 160,
          currentRoundRank: "GODLIKE",
          currentRoundFoul: null,
        },
        {
          hp: 5000,
          combo: 0,
          godlikeCombo: 0,
          currentRoundTime: 300,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      expect(r6.appliedCombo).toBe(5);
      expect(r6.appliedComboMult).toBe(1.5);
      expect(r6.appliedBonusType).toBe("EXCELLENT");
      playerCombo = r6.playerNewCombo;
      playerGodlikeCombo = r6.playerNewGodlikeCombo;
      expect(playerCombo).toBe(5);
      expect(playerGodlikeCombo).toBe(3);

      // 7. godlike ← godlikeコンボボーナス1.6倍となり、excellentボーナスを超えたためgodlikeボーナスを優先する
      const r7 = resolveRound(
        {
          hp: 5000,
          combo: playerCombo,
          godlikeCombo: playerGodlikeCombo,
          currentRoundTime: 160,
          currentRoundRank: "GODLIKE",
          currentRoundFoul: null,
        },
        {
          hp: 5000,
          combo: 0,
          godlikeCombo: 0,
          currentRoundTime: 300,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      expect(r7.appliedCombo).toBe(5);
      expect(r7.appliedComboMult).toBe(1.6);
      expect(r7.appliedBonusType).toBe("GODLIKE");
      playerCombo = r7.playerNewCombo;
      playerGodlikeCombo = r7.playerNewGodlikeCombo;
      expect(playerCombo).toBe(5);
      expect(playerGodlikeCombo).toBe(4);

      // 8. excellent ← godlikeコンボボーナスが途切れる。しかし、excellentボーナスは継続されていて1.5倍が適用される
      const r8 = resolveRound(
        {
          hp: 5000,
          combo: playerCombo,
          godlikeCombo: playerGodlikeCombo,
          currentRoundTime: 190,
          currentRoundRank: "EXCELLENT",
          currentRoundFoul: null,
        },
        {
          hp: 5000,
          combo: 0,
          godlikeCombo: 0,
          currentRoundTime: 300,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      expect(r8.appliedCombo).toBe(5);
      expect(r8.appliedComboMult).toBe(1.5);
      expect(r8.appliedBonusType).toBe("EXCELLENT");
      playerCombo = r8.playerNewCombo;
      playerGodlikeCombo = r8.playerNewGodlikeCombo;
      expect(playerCombo).toBe(5);
      expect(playerGodlikeCombo).toBe(0); // godlike combo reset

      // 9. godlike ← godlikeコンボボーナスはリセットされているのでexcellentコンボボーナスの1.5倍のみ
      const r9 = resolveRound(
        {
          hp: 5000,
          combo: playerCombo,
          godlikeCombo: playerGodlikeCombo,
          currentRoundTime: 160,
          currentRoundRank: "GODLIKE",
          currentRoundFoul: null,
        },
        {
          hp: 5000,
          combo: 0,
          godlikeCombo: 0,
          currentRoundTime: 300,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      expect(r9.appliedCombo).toBe(5);
      expect(r9.appliedComboMult).toBe(1.5);
      expect(r9.appliedBonusType).toBe("EXCELLENT");
      playerCombo = r9.playerNewCombo;
      playerGodlikeCombo = r9.playerNewGodlikeCombo;
      expect(playerCombo).toBe(5);
      expect(playerGodlikeCombo).toBe(1);

      // 10. normal ← excellent, godlike どちらのコンボボーナスもリセット。倍率なし。
      const r10 = resolveRound(
        {
          hp: 5000,
          combo: playerCombo,
          godlikeCombo: playerGodlikeCombo,
          currentRoundTime: 230,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
        {
          hp: 5000,
          combo: 0,
          godlikeCombo: 0,
          currentRoundTime: 300,
          currentRoundRank: "NORMAL",
          currentRoundFoul: null,
        },
      );
      expect(r10.appliedCombo).toBe(5);
      expect(r10.appliedComboMult).toBe(1.0);
      expect(r10.appliedBonusType).toBeNull();
      playerCombo = r10.playerNewCombo;
      playerGodlikeCombo = r10.playerNewGodlikeCombo;
      expect(playerCombo).toBe(0);
      expect(playerGodlikeCombo).toBe(0);
    });
  });
});
