import { DeviceType, ReactionRank } from "@/features/game";

export type { DeviceType, ReactionRank };

export type InitialHpOption = number;

export type BattleRoomRole = "PLAYER_1" | "PLAYER_2" | "SPECTATOR";

export type BattleRoomParticipant = {
  sessionId: string;
  userName: string;
  device?: "desktop" | "mobile";
  role: BattleRoomRole;
  joinOrder: number;
  isOwner: boolean;
  isGameHost: boolean;
  connected: boolean;
};

export type BattleRoomSnapshot = {
  code: string;
  status: "ACTIVE" | "ENDED";
  createdAt: string;
  expiresAt: string;
  stateRevision: number;
  stateSnapshot: unknown;
};

export type BattleRoomAdmission = {
  room: BattleRoomSnapshot;
  participants: BattleRoomParticipant[];
  participant: BattleRoomParticipant;
  credentials: { sessionId: string; token: string };
};

export const INITIAL_HP_MIN = 500;
export const INITIAL_HP_MAX = 3000;
export const INITIAL_HP_STEP = 500;
export const INITIAL_HP_DEFAULT = 1500;

/** 任意の値を許容範囲・ステップに丸めて返す (不正値はデフォルト) */
export const normalizeInitialHp = (value: unknown): InitialHpOption => {
  const n = Number(value);
  if (!Number.isFinite(n) || value === null || value === "") {
    return INITIAL_HP_DEFAULT;
  }
  const stepped = Math.round(n / INITIAL_HP_STEP) * INITIAL_HP_STEP;
  return Math.min(INITIAL_HP_MAX, Math.max(INITIAL_HP_MIN, stepped));
};

/** 初期HPの区分: 500,1000=QUICK / 1500,2000=STANDARD / 2500,3000=PRO */
export const getInitialHpTier = (hp: number): "QUICK" | "STANDARD" | "PRO" =>
  hp <= 1000 ? "QUICK" : hp <= 2000 ? "STANDARD" : "PRO";

export const REACTION_EMOJIS = ["👍", "🥹", "😎", "⬆️", "⬇️", "👀"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];
export type SpectatorReaction = {
  id: string;
  senderId: string;
  emoji: ReactionEmoji;
  userName: string;
  receivedAt: number;
  horizontalPosition: number;
};
export const MAX_ACTIVE_SPECTATOR_REACTIONS = 12;
/** リアクションの表示時間 (ms) */
export const REACTION_DISPLAY_MS = 2000;
/** 試合中に流れる観戦者スタンプの表示時間 (ms) */
export const SPECTATOR_REACTION_DISPLAY_MS = 4000;
/** 連打対策: 同一プレイヤーが送信できる最小間隔 (ms) */
export const REACTION_COOLDOWN_MS = 1000;

export const isReactionEmoji = (v: unknown): v is ReactionEmoji =>
  typeof v === "string" && (REACTION_EMOJIS as readonly string[]).includes(v);

export type PresencePayload = {
  userId: string;
  sessionId?: string;
  userName: string;
  device: "desktop" | "mobile";
  isReady: boolean;
  initialHp: number; // ホストのみ指定 (500〜3000, 500刻み)
  isHost?: boolean;
  role?: BattleRoomRole;
  hpTimestamp?: number;
};

export type UpdateHpPayload = {
  initialHp: InitialHpOption;
  timestamp: number;
};

export type FoulReason = "early_click" | "too_fast";

export type RoundPlayerSnapshot = {
  hp: number;
  combo: number;
  godlikeCombo: number;
  comboRank: "GODLIKE" | "EXCELLENT" | null;
};

export type RoundStartPayload = {
  round: number;
  delay: number;
  initialHp?: number;
  startTime?: number;
  hostState?: RoundPlayerSnapshot;
  guestState?: RoundPlayerSnapshot;
  roundLogs?: BattleRoundLog[];
};

export type RoundActionSnapshot = Pick<
  BattlePlayerState,
  "currentRoundTime" | "currentRoundRank" | "currentRoundFoul"
>;

export type RoundResolvedPayload = {
  round: number;
  hostAction: RoundActionSnapshot;
  guestAction: RoundActionSnapshot;
};

export type SubmitTimePayload = {
  round: number;
  time: number;
  rank: ReactionRank;
};

export type FoulPayload = {
  round: number;
  reason: FoulReason;
};

export type RematchPayload = {
  fromUserId: string;
};

export type DeviceWarningAcceptPayload = {
  userId: string;
};

export type MatchFinishedPayload = {
  winner: "player" | "opponent" | "draw" | null;
  reason: "hp_zero" | "foul" | "opponent_left" | "both_hp_zero";
  playerHp: number;
  opponentHp: number;
  roundLogs?: BattleRoundLog[];
};

export type BattlePlayerState = {
  userId: string;
  userName: string;
  device: "desktop" | "mobile";
  hp: number;
  combo: number;
  godlikeCombo: number;
  comboRank?: "GODLIKE" | "EXCELLENT" | null;
  currentRoundTime: number | null;
  currentRoundRank: ReactionRank | null;
  currentRoundFoul: FoulReason | null;
  isReady: boolean;
  isHost?: boolean;
};

export type BattlePhase =
  | "LOBBY" // 待機中
  | "DEVICE_WARNING" // デバイス不一致の確認中
  | "COUNTDOWN" // ラウンド前カウントダウン
  | "WAITING" // 赤画面：待機中
  | "ACTION" // 緑画面：タップ受付中
  | "RESOLVING" // 激突演出・ダメージ反映中
  | "MATCH_FINISHED"; // 決着（勝敗決定）

export type RoundResolutionResult = {
  winner: "player" | "opponent" | "draw" | null;
  playerDamageTaken: number;
  opponentDamageTaken: number;
  playerHpBefore: number;
  opponentHpBefore: number;
  playerNewHp: number;
  opponentNewHp: number;
  playerNewCombo: number;
  opponentNewCombo: number;
  playerNewGodlikeCombo: number;
  opponentNewGodlikeCombo: number;
  playerNewComboRank?: "GODLIKE" | "EXCELLENT" | null;
  opponentNewComboRank?: "GODLIKE" | "EXCELLENT" | null;
  playerMultiplier: number;
  opponentMultiplier: number;
  appliedCombo?: number;
  appliedBonusType?: "GODLIKE" | "EXCELLENT" | null;
  appliedComboMult?: number;
  appliedRankMult?: number;
  playerComboBefore?: number;
  opponentComboBefore?: number;
  playerGodlikeComboBefore?: number;
  opponentGodlikeComboBefore?: number;
  matchOver: boolean;
  matchWinner: "player" | "opponent" | "draw" | null;
  reason?: "hp_zero" | "foul" | "both_hp_zero";
};

export type BattleRoundLog = {
  round: number;
  winner: "player" | "opponent" | "draw";
  playerTime: number | null;
  playerRank: ReactionRank | null;
  playerFoul: FoulReason | null;
  playerComboBefore: number;
  playerGodlikeComboBefore?: number;
  opponentTime: number | null;
  opponentRank: ReactionRank | null;
  opponentFoul: FoulReason | null;
  opponentComboBefore: number;
  opponentGodlikeComboBefore?: number;
  damage: number;
  appliedRankMult?: number;
  appliedComboMult?: number;
  appliedBonusType?: "GODLIKE" | "EXCELLENT" | null;
  playerHpAfter: number;
  opponentHpAfter: number;
};
