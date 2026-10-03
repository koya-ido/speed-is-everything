import {
  BattlePlayerState,
  FoulReason,
  RoundResolutionResult,
} from "@/features/battle/types";
import {
  DeviceType,
  ReactionRank,
  getReactionRank as getBaseReactionRank,
} from "@/features/game";

export type ComboBonusDetails = {
  comboMultiplier: number;
  bonusType: "GODLIKE" | "EXCELLENT" | null;
  excellentBonus: number;
  godlikeBonus: number;
};

/**
 * 勝者がそのラウンドの攻撃で受けるコンボボーナス倍率を計算する
 * 混在ルール:
 * - excellentコンボボーナス: 1コンボにつき倍率10%増加 (1コンボ=1.1倍, 最大5コンボ=1.5倍)
 * - godlikeコンボボーナス: 1コンボにつき倍率20%増加 (1コンボ=1.2倍, 最大5コンボ=2.0倍)
 * - ランクがNORMALの場合: コンボボーナスなし (1.0倍)
 * - ランクがEXCELLENTの場合: excellentコンボボーナスのみ適用 (最大1.5倍)
 * - ランクがGODLIKEの場合: excellentとgodlikeのうち倍率が高い方を適用
 */
export const calculateComboBonus = (
  rank: ReactionRank,
  combo: number,
  godlikeCombo: number = rank === "GODLIKE" ? combo : 0,
): ComboBonusDetails => {
  if (rank === "NORMAL") {
    return {
      comboMultiplier: 1.0,
      bonusType: null,
      excellentBonus: 1.0,
      godlikeBonus: 1.0,
    };
  }

  const cappedCombo = Math.max(0, Math.min(5, Math.floor(combo)));
  const cappedGodlike = Math.max(0, Math.min(5, Math.floor(godlikeCombo)));

  const excellentBonus = cappedCombo > 0 ? 1.0 + cappedCombo * 0.1 : 1.0;
  const godlikeBonus = cappedGodlike > 0 ? 1.0 + cappedGodlike * 0.2 : 1.0;

  if (rank === "EXCELLENT") {
    return {
      comboMultiplier: Math.round(excellentBonus * 10) / 10,
      bonusType: cappedCombo > 0 ? "EXCELLENT" : null,
      excellentBonus: Math.round(excellentBonus * 10) / 10,
      godlikeBonus: 1.0,
    };
  }

  // rank === "GODLIKE"
  // 混在パターン: どちらか一方のコンボボーナスしか反映しない。倍率が高いほうが適用される。
  if (godlikeBonus > excellentBonus) {
    return {
      comboMultiplier: Math.round(godlikeBonus * 10) / 10,
      bonusType: "GODLIKE",
      excellentBonus: Math.round(excellentBonus * 10) / 10,
      godlikeBonus: Math.round(godlikeBonus * 10) / 10,
    };
  }

  if (excellentBonus > 1.0) {
    return {
      comboMultiplier: Math.round(excellentBonus * 10) / 10,
      bonusType: "EXCELLENT",
      excellentBonus: Math.round(excellentBonus * 10) / 10,
      godlikeBonus: Math.round(godlikeBonus * 10) / 10,
    };
  }

  return {
    comboMultiplier: 1.0,
    bonusType: null,
    excellentBonus: 1.0,
    godlikeBonus: 1.0,
  };
};

/**
 * HPバー上などの現在保持コンボ倍率表示用
 */
export const getActiveComboMultiplier = (
  combo: number,
  godlikeCombo: number = 0,
): { multiplier: number; rankType: "GODLIKE" | "EXCELLENT" | null } => {
  const cappedCombo = Math.max(0, Math.min(5, Math.floor(combo)));
  const cappedGodlike = Math.max(0, Math.min(5, Math.floor(godlikeCombo)));

  if (cappedCombo === 0 && cappedGodlike === 0) {
    return { multiplier: 1.0, rankType: null };
  }

  const excBonus = cappedCombo > 0 ? 1.0 + cappedCombo * 0.1 : 1.0;
  const godBonus = cappedGodlike > 0 ? 1.0 + cappedGodlike * 0.2 : 1.0;

  if (godBonus > excBonus) {
    return {
      multiplier: Math.round(godBonus * 10) / 10,
      rankType: "GODLIKE",
    };
  }
  return {
    multiplier: Math.round(excBonus * 10) / 10,
    rankType: "EXCELLENT",
  };
};

/**
 * 判定ランクとコンボ数に基づく攻撃力倍率を計算する
 * Normal: 1.0倍
 * Excellent: 2.0 * excellentComboMultiplier (最大3.0倍)
 * Godlike: 3.0 * comboMultiplier (最大6.0倍)
 */
export const calculateRankMultiplier = (
  rank: ReactionRank,
  combo: number,
  godlikeCombo: number = rank === "GODLIKE" ? combo : 0,
): number => {
  const base = rank === "GODLIKE" ? 3.0 : rank === "EXCELLENT" ? 2.0 : 1.0;
  const { comboMultiplier } = calculateComboBonus(rank, combo, godlikeCombo);
  return Math.round(base * comboMultiplier * 10) / 10;
};

/**
 * 与ダメージ計算式:
 * 与ダメージ = (相手の反応速度 - 自分の反応速度) * 自分のランク倍率
 * (相手より速い場合のみダメージを与える。DRAWまたは遅い場合は0)
 */
export const calculateDamage = (
  myTime: number,
  opponentTime: number,
  myRank: ReactionRank,
  myCombo: number,
  myGodlikeCombo: number = myRank === "GODLIKE" ? myCombo : 0,
): number => {
  if (myTime >= opponentTime) {
    return 0;
  }
  const diff = opponentTime - myTime;
  const multiplier = calculateRankMultiplier(myRank, myCombo, myGodlikeCombo);
  const damage = diff * multiplier;
  return Math.round(damage * 10) / 10;
};

/**
 * 次のコンボ数を計算する（ExcellentコンボとGodlikeコンボを個別集計）
 * 1. コンボ加算: ラウンド勝利 かつ (Excellent または Godlike) (上限5)
 *    - Godlike勝利時: combo + 1, godlikeCombo + 1
 *    - Excellent勝利時: combo + 1, godlikeCombo は 0 にリセット
 * 2. コンボリセット (0): 負けた場合、または 勝利したがNormalだった場合
 * 3. DRAW時: コンボ数は維持
 */
export const calculateNextCombos = (
  currentCombo: number,
  currentGodlikeCombo: number,
  isWinner: boolean,
  isDraw: boolean,
  rank: ReactionRank,
): {
  newCombo: number;
  newGodlikeCombo: number;
  comboRank: "GODLIKE" | "EXCELLENT" | null;
} => {
  if (isDraw) {
    const cappedCombo = Math.max(0, Math.min(5, Math.floor(currentCombo)));
    const cappedGodlike = Math.max(
      0,
      Math.min(5, Math.floor(currentGodlikeCombo)),
    );
    const excBonus = cappedCombo > 0 ? 1.0 + cappedCombo * 0.1 : 1.0;
    const godBonus = cappedGodlike > 0 ? 1.0 + cappedGodlike * 0.2 : 1.0;
    const comboRank =
      godBonus > excBonus ? "GODLIKE" : excBonus > 1.0 ? "EXCELLENT" : null;

    return {
      newCombo: currentCombo,
      newGodlikeCombo: currentGodlikeCombo,
      comboRank,
    };
  }

  if (!isWinner || rank === "NORMAL") {
    return {
      newCombo: 0,
      newGodlikeCombo: 0,
      comboRank: null,
    };
  }

  // 勝者かつ (EXCELLENT または GODLIKE)
  const newCombo = Math.min(5, currentCombo + 1);
  const newGodlikeCombo =
    rank === "GODLIKE" ? Math.min(5, currentGodlikeCombo + 1) : 0;

  // 次回ラウンドで有効となるボーナス種別
  const excBonus = newCombo > 0 ? 1.0 + newCombo * 0.1 : 1.0;
  const godBonus = newGodlikeCombo > 0 ? 1.0 + newGodlikeCombo * 0.2 : 1.0;
  const comboRank =
    godBonus > excBonus ? "GODLIKE" : excBonus > 1.0 ? "EXCELLENT" : null;

  return {
    newCombo,
    newGodlikeCombo,
    comboRank,
  };
};

/**
 * 既存互換用: calculateNextCombo
 */
export const calculateNextCombo = (
  currentCombo: number,
  isWinner: boolean,
  isDraw: boolean,
  rank: ReactionRank,
): number => {
  return calculateNextCombos(currentCombo, 0, isWinner, isDraw, rank).newCombo;
};

/**
 * 反応速度とデバイスタイプから判定ランクを正規化して取得
 */
export const getBattleReactionRank = (
  time: number,
  device: "desktop" | "mobile" | DeviceType,
): ReactionRank => {
  const deviceType: DeviceType =
    device === "mobile" || device === "MOBILE" ? "MOBILE" : "PC";
  return getBaseReactionRank(time, deviceType);
};

/**
 * ランダムな6桁ルームコードを生成 (例: "389-102")
 */
export const generateRoomId = (): string => {
  const part1 = Math.floor(100 + Math.random() * 900).toString();
  const part2 = Math.floor(100 + Math.random() * 900).toString();
  return `${part1}-${part2}`;
};

/**
 * ルームコードのフォーマット整形 (入力時に数字のみ抽出し、3桁-3桁に自動フォーマット)
 */
export const formatRoomId = (input: string): string => {
  const cleaned = input
    .replace(/[^0-9A-Za-z]/g, "")
    .slice(0, 6)
    .toUpperCase();
  if (cleaned.length <= 3) return cleaned;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
};

/**
 * 緑色に切り替わるまでのランダム遅延時間 (仕様: 2000ms〜4500ms)
 */
export const generateRoundDelay = (): number => {
  const minDelay = 2000;
  const maxDelay = 4500;
  return Math.floor(minDelay + Math.random() * (maxDelay - minDelay));
};

/**
 * 異常値またはフライングのチェック (100ms未満は異常値ペナルティ)
 */
export const checkFoul = (
  time: number | null,
  isEarlyClick: boolean,
): FoulReason | null => {
  if (isEarlyClick) return "early_click";
  if (time !== null && time < 100) return "too_fast";
  return null;
};

/**
 * 異常値や浮動小数点を考慮し、0.05以下は確実に0に丸めるクランプ関数
 */
export const clampHp = (val: number): number => {
  if (val <= 0.05) return 0;
  return Math.round(val * 10) / 10;
};

/**
 * ラウンドの勝敗・ダメージ・HP・コンボの決着を計算するコア関数
 */
export const resolveRound = (
  player: Pick<
    BattlePlayerState,
    | "hp"
    | "combo"
    | "currentRoundTime"
    | "currentRoundRank"
    | "currentRoundFoul"
  > & { godlikeCombo?: number; comboRank?: "GODLIKE" | "EXCELLENT" | null },
  opponent: Pick<
    BattlePlayerState,
    | "hp"
    | "combo"
    | "currentRoundTime"
    | "currentRoundRank"
    | "currentRoundFoul"
  > & { godlikeCombo?: number; comboRank?: "GODLIKE" | "EXCELLENT" | null },
): RoundResolutionResult => {
  const pCombo = player.combo || 0;
  const pGodlikeCombo = player.godlikeCombo || 0;
  const oCombo = opponent.combo || 0;
  const oGodlikeCombo = opponent.godlikeCombo || 0;

  // 1. ファール・即死ペナルティ（Knockout）の判定
  if (player.currentRoundFoul && opponent.currentRoundFoul) {
    return {
      winner: "draw",
      playerDamageTaken: player.hp,
      opponentDamageTaken: opponent.hp,
      playerHpBefore: player.hp,
      opponentHpBefore: opponent.hp,
      playerNewHp: 0,
      opponentNewHp: 0,
      playerNewCombo: 0,
      opponentNewCombo: 0,
      playerNewGodlikeCombo: 0,
      opponentNewGodlikeCombo: 0,
      playerNewComboRank: null,
      opponentNewComboRank: null,
      playerMultiplier: 1.0,
      opponentMultiplier: 1.0,
      appliedCombo: 0,
      appliedComboMult: 1.0,
      appliedRankMult: 1.0,
      appliedBonusType: null,
      playerComboBefore: pCombo,
      opponentComboBefore: oCombo,
      playerGodlikeComboBefore: pGodlikeCombo,
      opponentGodlikeComboBefore: oGodlikeCombo,
      matchOver: true,
      matchWinner: "draw",
      reason: "foul",
    };
  }

  if (player.currentRoundFoul) {
    // プレイヤーがファール -> 相手の即勝利
    return {
      winner: "opponent",
      playerDamageTaken: player.hp,
      opponentDamageTaken: 0,
      playerHpBefore: player.hp,
      opponentHpBefore: opponent.hp,
      playerNewHp: 0,
      opponentNewHp: opponent.hp,
      playerNewCombo: 0,
      opponentNewCombo: oCombo,
      playerNewGodlikeCombo: 0,
      opponentNewGodlikeCombo: oGodlikeCombo,
      playerNewComboRank: null,
      opponentNewComboRank: opponent.comboRank ?? null,
      playerMultiplier: 1.0,
      opponentMultiplier: 1.0,
      appliedCombo: 0,
      appliedComboMult: 1.0,
      appliedRankMult: 1.0,
      appliedBonusType: null,
      playerComboBefore: pCombo,
      opponentComboBefore: oCombo,
      playerGodlikeComboBefore: pGodlikeCombo,
      opponentGodlikeComboBefore: oGodlikeCombo,
      matchOver: true,
      matchWinner: "opponent",
      reason: "foul",
    };
  }

  if (opponent.currentRoundFoul) {
    // 相手がファール -> プレイヤーの即勝利
    return {
      winner: "player",
      playerDamageTaken: 0,
      opponentDamageTaken: opponent.hp,
      playerHpBefore: player.hp,
      opponentHpBefore: opponent.hp,
      playerNewHp: player.hp,
      opponentNewHp: 0,
      playerNewCombo: pCombo,
      opponentNewCombo: 0,
      playerNewGodlikeCombo: pGodlikeCombo,
      opponentNewGodlikeCombo: 0,
      playerNewComboRank: player.comboRank ?? null,
      opponentNewComboRank: null,
      playerMultiplier: 1.0,
      opponentMultiplier: 1.0,
      appliedCombo: 0,
      appliedComboMult: 1.0,
      appliedRankMult: 1.0,
      appliedBonusType: null,
      playerComboBefore: pCombo,
      opponentComboBefore: oCombo,
      playerGodlikeComboBefore: pGodlikeCombo,
      opponentGodlikeComboBefore: oGodlikeCombo,
      matchOver: true,
      matchWinner: "player",
      reason: "foul",
    };
  }

  const pTime = player.currentRoundTime ?? 9999;
  const oTime = opponent.currentRoundTime ?? 9999;
  const pRank = player.currentRoundRank ?? "NORMAL";
  const oRank = opponent.currentRoundRank ?? "NORMAL";

  const pMultiplier = calculateRankMultiplier(pRank, pCombo, pGodlikeCombo);
  const oMultiplier = calculateRankMultiplier(oRank, oCombo, oGodlikeCombo);

  // 2. タイム差とダメージの計算
  if (pTime === oTime) {
    // DRAW
    const playerNewHp = clampHp(player.hp);
    const opponentNewHp = clampHp(opponent.hp);
    const isEitherHpZero = playerNewHp <= 0 || opponentNewHp <= 0;
    let matchWinner: "player" | "opponent" | "draw" | null = null;
    if (isEitherHpZero) {
      if (playerNewHp <= 0 && opponentNewHp <= 0) matchWinner = "draw";
      else if (playerNewHp <= 0) matchWinner = "opponent";
      else matchWinner = "player";
    }

    const pNext = calculateNextCombos(
      pCombo,
      pGodlikeCombo,
      false,
      true,
      pRank,
    );
    const oNext = calculateNextCombos(
      oCombo,
      oGodlikeCombo,
      false,
      true,
      oRank,
    );

    return {
      winner: "draw",
      playerDamageTaken: 0,
      opponentDamageTaken: 0,
      playerHpBefore: player.hp,
      opponentHpBefore: opponent.hp,
      playerNewHp,
      opponentNewHp,
      playerNewCombo: pNext.newCombo,
      opponentNewCombo: oNext.newCombo,
      playerNewGodlikeCombo: pNext.newGodlikeCombo,
      opponentNewGodlikeCombo: oNext.newGodlikeCombo,
      playerNewComboRank: pNext.comboRank,
      opponentNewComboRank: oNext.comboRank,
      playerMultiplier: pMultiplier,
      opponentMultiplier: oMultiplier,
      appliedCombo: 0,
      appliedComboMult: 1.0,
      appliedRankMult: 1.0,
      appliedBonusType: null,
      playerComboBefore: pCombo,
      opponentComboBefore: oCombo,
      playerGodlikeComboBefore: pGodlikeCombo,
      opponentGodlikeComboBefore: oGodlikeCombo,
      matchOver: isEitherHpZero,
      matchWinner,
      reason: isEitherHpZero ? "hp_zero" : undefined,
    };
  }

  if (pTime < oTime) {
    // プレイヤーのラウンド勝利
    const damage = calculateDamage(pTime, oTime, pRank, pCombo, pGodlikeCombo);
    const comboDetails = calculateComboBonus(pRank, pCombo, pGodlikeCombo);
    const pRankBase =
      pRank === "GODLIKE" ? 3.0 : pRank === "EXCELLENT" ? 2.0 : 1.0;
    const playerNewHp = clampHp(player.hp);
    const opponentNewHp = clampHp(opponent.hp - damage);
    const pNext = calculateNextCombos(
      pCombo,
      pGodlikeCombo,
      true,
      false,
      pRank,
    );
    const oNext = calculateNextCombos(
      oCombo,
      oGodlikeCombo,
      false,
      false,
      oRank,
    );
    const matchOver = opponentNewHp <= 0 || playerNewHp <= 0;
    let matchWinner: "player" | "opponent" | "draw" | null = null;
    if (matchOver) {
      if (opponentNewHp <= 0 && playerNewHp <= 0) matchWinner = "draw";
      else if (opponentNewHp <= 0) matchWinner = "player";
      else matchWinner = "opponent";
    }

    return {
      winner: "player",
      playerDamageTaken: 0,
      opponentDamageTaken: damage,
      playerHpBefore: player.hp,
      opponentHpBefore: opponent.hp,
      playerNewHp,
      opponentNewHp,
      playerNewCombo: pNext.newCombo,
      opponentNewCombo: oNext.newCombo,
      playerNewGodlikeCombo: pNext.newGodlikeCombo,
      opponentNewGodlikeCombo: oNext.newGodlikeCombo,
      playerNewComboRank: pNext.comboRank,
      opponentNewComboRank: oNext.comboRank,
      playerMultiplier: pMultiplier,
      opponentMultiplier: oMultiplier,
      appliedCombo: pCombo,
      appliedComboMult: comboDetails.comboMultiplier,
      appliedBonusType: comboDetails.bonusType,
      appliedRankMult: pRankBase,
      playerComboBefore: pCombo,
      opponentComboBefore: oCombo,
      playerGodlikeComboBefore: pGodlikeCombo,
      opponentGodlikeComboBefore: oGodlikeCombo,
      matchOver,
      matchWinner,
      reason: matchOver ? "hp_zero" : undefined,
    };
  } else {
    // 相手のラウンド勝利
    const damage = calculateDamage(oTime, pTime, oRank, oCombo, oGodlikeCombo);
    const comboDetails = calculateComboBonus(oRank, oCombo, oGodlikeCombo);
    const oRankBase =
      oRank === "GODLIKE" ? 3.0 : oRank === "EXCELLENT" ? 2.0 : 1.0;
    const playerNewHp = clampHp(player.hp - damage);
    const opponentNewHp = clampHp(opponent.hp);
    const pNext = calculateNextCombos(
      pCombo,
      pGodlikeCombo,
      false,
      false,
      pRank,
    );
    const oNext = calculateNextCombos(
      oCombo,
      oGodlikeCombo,
      true,
      false,
      oRank,
    );
    const matchOver = playerNewHp <= 0 || opponentNewHp <= 0;
    let matchWinner: "player" | "opponent" | "draw" | null = null;
    if (matchOver) {
      if (playerNewHp <= 0 && opponentNewHp <= 0) matchWinner = "draw";
      else if (playerNewHp <= 0) matchWinner = "opponent";
      else matchWinner = "player";
    }

    return {
      winner: "opponent",
      playerDamageTaken: damage,
      opponentDamageTaken: 0,
      playerHpBefore: player.hp,
      opponentHpBefore: opponent.hp,
      playerNewHp,
      opponentNewHp,
      playerNewCombo: pNext.newCombo,
      opponentNewCombo: oNext.newCombo,
      playerNewGodlikeCombo: pNext.newGodlikeCombo,
      opponentNewGodlikeCombo: oNext.newGodlikeCombo,
      playerNewComboRank: pNext.comboRank,
      opponentNewComboRank: oNext.comboRank,
      playerMultiplier: pMultiplier,
      opponentMultiplier: oMultiplier,
      appliedCombo: oCombo,
      appliedComboMult: comboDetails.comboMultiplier,
      appliedBonusType: comboDetails.bonusType,
      appliedRankMult: oRankBase,
      playerComboBefore: pCombo,
      opponentComboBefore: oCombo,
      playerGodlikeComboBefore: pGodlikeCombo,
      opponentGodlikeComboBefore: oGodlikeCombo,
      matchOver,
      matchWinner,
      reason: matchOver ? "hp_zero" : undefined,
    };
  }
};
