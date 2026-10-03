import { getReactionRank } from "@/features/game";
import { TitleId } from "@/features/title/types";
import { prisma } from "@/lib/prisma";

export type GameModeEvaluationData = {
  userId: string;
  clearCount: number;
  rawReactions: number[];
  deviceType: "PC" | "MOBILE";
  isFirstPlace?: boolean;
  isFoul?: boolean;
};

export type BattleModeEvaluationData = {
  userId: string;
  result: "win" | "lose" | "draw";
  remainingHp: number;
  initialHp?: number;
  opponentHp?: number;
  myDevice: "PC" | "MOBILE";
  opponentDevice?: "PC" | "MOBILE";
  maxGodlikeCombo?: number;
  maxExcellentCombo?: number;
  wasUnder100HpBeforeWin?: boolean;
  drawCountInMatch?: number;
  reactionTimes?: number[];
  isFoul?: boolean;
};

/**
 * ゲームモード結果から獲得可能な称号を判定
 */
export const checkGameModeTitles = (
  data: GameModeEvaluationData,
  userStats: { playCount: number; foulCount: number },
): TitleId[] => {
  const titlesToUnlock: TitleId[] = [];
  const { clearCount, rawReactions, deviceType, isFirstPlace, isFoul } = data;

  // 1. ランキング1位
  if (isFirstPlace) {
    titlesToUnlock.push("apex_predator");
  }

  // 2. クリア状況判定
  if (clearCount > 0 && rawReactions.length === clearCount) {
    const ranks = rawReactions.map((r) => getReactionRank(r, deviceType));
    const allGodlike = ranks.every((r) => r === "GODLIKE");
    const allExcellentOrGodlike = ranks.every(
      (r) => r === "GODLIKE" || r === "EXCELLENT",
    );

    if (allGodlike) {
      titlesToUnlock.push("synapse_overload");
    }
    if (allExcellentOrGodlike) {
      titlesToUnlock.push("high_frequency");
    }
  }

  // 3. 単発タイム判定
  for (const time of rawReactions) {
    if (time < 150) {
      titlesToUnlock.push("light_speed");
    }
  }

  // 4. ゲームプレイ数
  const newPlayCount = userStats.playCount;
  if (newPlayCount >= 10) titlesToUnlock.push("awakened");
  if (newPlayCount >= 50) titlesToUnlock.push("overclocked");
  if (newPlayCount >= 100) titlesToUnlock.push("neural_master");

  // 5. フライング数
  const newFoulCount = userStats.foulCount + (isFoul ? 1 : 0);
  if (newFoulCount >= 50) titlesToUnlock.push("trigger_happy");

  return Array.from(new Set(titlesToUnlock));
};

/**
 * バトルモード結果から獲得可能な称号を判定
 */
export const checkBattleModeTitles = (
  data: BattleModeEvaluationData,
  userStats: { battleWinCount: number; foulCount: number },
): TitleId[] => {
  const titlesToUnlock: TitleId[] = [];
  const {
    result,
    remainingHp,
    initialHp = 1500,
    myDevice,
    opponentDevice,
    maxGodlikeCombo = 0,
    maxExcellentCombo = 0,
    wasUnder100HpBeforeWin = false,
    drawCountInMatch = 0,
    reactionTimes = [],
    isFoul = false,
  } = data;

  if (result === "win") {
    // ノーダメージ完封勝利
    if (remainingHp >= initialHp) {
      titlesToUnlock.push("untouchable");
    }

    // 残HP 100ms未満からの逆転勝利
    if (wasUnder100HpBeforeWin) {
      titlesToUnlock.push("clutch_god");
    }

    // バトル勝利数
    const newWins = userStats.battleWinCount;
    if (newWins >= 10) titlesToUnlock.push("contender");
    if (newWins >= 50) titlesToUnlock.push("veteran");
    if (newWins >= 100) titlesToUnlock.push("speed_gladiator");
  }

  // コンボ判定
  if (maxGodlikeCombo >= 5) {
    titlesToUnlock.push("gods_reflex");
  }
  if (maxExcellentCombo >= 5) {
    titlesToUnlock.push("flow_state");
  }

  // 同一試合でDRAW 2回以上
  if (drawCountInMatch >= 2) {
    titlesToUnlock.push("quantum_mirror");
  }

  // 単発タイム
  for (const time of reactionTimes) {
    if (time > 0 && time < 150) {
      titlesToUnlock.push("light_speed");
    }
  }

  // フライング
  const newFoulCount = userStats.foulCount + (isFoul ? 1 : 0);
  if (newFoulCount >= 50) {
    titlesToUnlock.push("trigger_happy");
  }

  return Array.from(new Set(titlesToUnlock));
};

/**
 * 獲得した称号をDBに保存し、新規解除された称号IDリストを返す
 */
export const grantTitles = async (
  userId: string,
  candidateTitles: TitleId[],
): Promise<TitleId[]> => {
  if (candidateTitles.length === 0) return [];

  const existingTitles = await prisma.userTitle.findMany({
    where: {
      userId,
      titleId: { in: candidateTitles },
    },
    select: { titleId: true },
  });

  const existingSet = new Set(existingTitles.map((t) => t.titleId));
  const newlyUnlocked = candidateTitles.filter((t) => !existingSet.has(t));

  if (newlyUnlocked.length > 0) {
    await prisma.userTitle.createMany({
      data: newlyUnlocked.map((titleId) => ({
        userId,
        titleId,
      })),
      skipDuplicates: true,
    });
  }

  return newlyUnlocked;
};
