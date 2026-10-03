import {
  checkBattleModeTitles,
  checkGameModeTitles,
} from "@/features/title/utils/titleChecker";
import { describe, expect, it } from "vitest";

describe("checkGameModeTitles", () => {
  it("detects apex_predator if first place", () => {
    const titles = checkGameModeTitles(
      {
        userId: "user-1",
        clearCount: 5,
        rawReactions: [180, 190, 185, 175, 170],
        deviceType: "PC",
        isFirstPlace: true,
      },
      { playCount: 5, foulCount: 0 },
    );
    expect(titles).toContain("apex_predator");
  });

  it("detects synapse_overload when all rounds are godlike", () => {
    // PC: < 170 is GODLIKE
    const titles = checkGameModeTitles(
      {
        userId: "user-1",
        clearCount: 3,
        rawReactions: [160, 155, 165],
        deviceType: "PC",
      },
      { playCount: 3, foulCount: 0 },
    );
    expect(titles).toContain("synapse_overload");
    expect(titles).toContain("high_frequency");
  });

  it("detects high_frequency when all rounds are excellent or godlike", () => {
    // PC: 170 <= time < 200 is EXCELLENT, < 170 is GODLIKE
    const titles = checkGameModeTitles(
      {
        userId: "user-1",
        clearCount: 2,
        rawReactions: [160, 185],
        deviceType: "PC",
      },
      { playCount: 2, foulCount: 0 },
    );
    expect(titles).not.toContain("synapse_overload");
    expect(titles).toContain("high_frequency");
  });

  it("does not award mobile_prodigy for fast mobile reactions", () => {
    const titles = checkGameModeTitles(
      {
        userId: "user-1",
        clearCount: 2,
        rawReactions: [145, 215],
        deviceType: "MOBILE",
      },
      { playCount: 2, foulCount: 0 },
    );
    expect(titles).toContain("light_speed");
    expect(titles).not.toContain("mobile_prodigy");
  });

  it("detects play count milestones", () => {
    const titles10 = checkGameModeTitles(
      {
        userId: "user-1",
        clearCount: 1,
        rawReactions: [250],
        deviceType: "PC",
      },
      { playCount: 10, foulCount: 0 },
    );
    expect(titles10).toContain("awakened");

    const titles50 = checkGameModeTitles(
      {
        userId: "user-1",
        clearCount: 1,
        rawReactions: [250],
        deviceType: "PC",
      },
      { playCount: 50, foulCount: 0 },
    );
    expect(titles50).toContain("awakened");
    expect(titles50).toContain("overclocked");

    const titles100 = checkGameModeTitles(
      {
        userId: "user-1",
        clearCount: 1,
        rawReactions: [250],
        deviceType: "PC",
      },
      { playCount: 100, foulCount: 0 },
    );
    expect(titles100).toContain("neural_master");
  });
});

describe("checkBattleModeTitles", () => {
  it("detects untouchable when winning without taking damage", () => {
    const titles = checkBattleModeTitles(
      {
        userId: "user-1",
        result: "win",
        remainingHp: 1500,
        initialHp: 1500,
        myDevice: "PC",
      },
      { battleWinCount: 1, foulCount: 0 },
    );
    expect(titles).toContain("untouchable");
  });

  it("detects clutch_god when winning from < 100ms HP", () => {
    const titles = checkBattleModeTitles(
      {
        userId: "user-1",
        result: "win",
        remainingHp: 80,
        initialHp: 1500,
        myDevice: "PC",
        wasUnder100HpBeforeWin: true,
      },
      { battleWinCount: 1, foulCount: 0 },
    );
    expect(titles).toContain("clutch_god");
  });

  it("does not award giant_slayer when mobile player defeats PC player", () => {
    const titles = checkBattleModeTitles(
      {
        userId: "user-1",
        result: "win",
        remainingHp: 500,
        initialHp: 1500,
        myDevice: "MOBILE",
        opponentDevice: "PC",
        reactionTimes: [200],
      },
      { battleWinCount: 1, foulCount: 0 },
    );
    expect(titles).not.toContain("giant_slayer");
    expect(titles).not.toContain("mobile_prodigy");
  });

  it("detects combo milestones and quantum mirror", () => {
    const titles = checkBattleModeTitles(
      {
        userId: "user-1",
        result: "draw",
        remainingHp: 0,
        myDevice: "PC",
        maxGodlikeCombo: 5,
        maxExcellentCombo: 5,
        drawCountInMatch: 2,
      },
      { battleWinCount: 0, foulCount: 0 },
    );
    expect(titles).toContain("gods_reflex");
    expect(titles).toContain("flow_state");
    expect(titles).toContain("quantum_mirror");
  });

  it("detects battle win milestones", () => {
    const titles = checkBattleModeTitles(
      {
        userId: "user-1",
        result: "win",
        remainingHp: 300,
        myDevice: "PC",
      },
      { battleWinCount: 100, foulCount: 0 },
    );
    expect(titles).toContain("contender");
    expect(titles).toContain("veteran");
    expect(titles).toContain("speed_gladiator");
  });
});
