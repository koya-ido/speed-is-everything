"use client";

import {
  BattlePhase,
  BattlePlayerState,
  BattleRoomParticipant,
  BattleRoomRole,
  BattleRoundLog,
  DeviceWarningAcceptPayload,
  FoulPayload,
  InitialHpOption,
  isReactionEmoji,
  MAX_ACTIVE_SPECTATOR_REACTIONS,
  PresencePayload,
  REACTION_COOLDOWN_MS,
  REACTION_DISPLAY_MS,
  ReactionEmoji,
  RematchPayload,
  RoundResolutionResult,
  RoundStartPayload,
  SPECTATOR_REACTION_DISPLAY_MS,
  SpectatorReaction,
  SubmitTimePayload,
} from "@/features/battle/types";
import {
  checkFoul,
  formatRoomId,
  generateRoundDelay,
  getBattleReactionRank,
  resolveRound,
} from "@/features/battle/utils/battleLogic";
import {
  BattleRoomView,
  clearBattleCredentials,
  dissolveBattleRoomRequest,
  publishBattleSnapshotRequest,
  rotateBattleParticipantRequest,
  sendBattleSessionRequest,
} from "@/features/battle/utils/roomApi";
import { getDeviceType, haptics, soundManager } from "@/features/game";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const isBattleRoundLog = (value: unknown): value is BattleRoundLog => {
  if (!value || typeof value !== "object") return false;
  const log = value as Record<string, unknown>;
  const isNullableNumber = (field: unknown) =>
    field === null || (typeof field === "number" && Number.isFinite(field));
  const isFiniteNumber = (field: unknown) =>
    typeof field === "number" && Number.isFinite(field);
  const isFoul = (field: unknown) =>
    field === null || field === "early_click" || field === "too_fast";
  const isRank = (field: unknown) =>
    field === null ||
    field === "GODLIKE" ||
    field === "EXCELLENT" ||
    field === "NORMAL";

  return (
    Number.isSafeInteger(log.round) &&
    (log.winner === "player" ||
      log.winner === "opponent" ||
      log.winner === "draw") &&
    isNullableNumber(log.playerTime) &&
    isRank(log.playerRank) &&
    isFoul(log.playerFoul) &&
    isFiniteNumber(log.playerComboBefore) &&
    isNullableNumber(log.opponentTime) &&
    isRank(log.opponentRank) &&
    isFoul(log.opponentFoul) &&
    isFiniteNumber(log.opponentComboBefore) &&
    isFiniteNumber(log.damage) &&
    isFiniteNumber(log.playerHpAfter) &&
    isFiniteNumber(log.opponentHpAfter)
  );
};

type UseBattleRoomProps = {
  roomId: string;
  isHost: boolean;
  initialHp?: InitialHpOption;
  userId?: string;
  userName?: string;
  sessionId?: string;
  sessionToken?: string;
  role?: BattleRoomRole;
  isOwner?: boolean;
};

export const useBattleRoom = ({
  roomId: rawRoomId,
  isHost: initialIsHost,
  initialHp: requestedHp = 1500,
  userId: initialUserId,
  userName: initialUserName,
  sessionId: suppliedSessionId,
  sessionToken,
  role: initialRole = "PLAYER_1",
  isOwner: initialIsOwner = false,
}: UseBattleRoomProps) => {
  const roomId = formatRoomId(rawRoomId);
  const [supabase] = useState(() => createClient());

  // 端末判定
  const detectedDevice = getDeviceType() === "MOBILE" ? "mobile" : "desktop";

  // 永続的なローカルID / ユーザー名の生成または維持
  const [localUserId] = useState(() => {
    if (initialUserId) return initialUserId;
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("battle_user_id");
      if (stored) return stored;
      const newId = `user_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem("battle_user_id", newId);
      return newId;
    }
    return `user_${Math.random().toString(36).substring(2, 9)}`;
  });

  const [localUserName] = useState(() => {
    if (initialUserName) return initialUserName;
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("battle_user_name");
      if (stored) return stored;
    }
    return `Agent_${localUserId.slice(-4)}`;
  });

  const sessionCredentials = useMemo(
    () =>
      suppliedSessionId && sessionToken
        ? { sessionId: suppliedSessionId, token: sessionToken }
        : null,
    [sessionToken, suppliedSessionId],
  );
  const localSessionId = suppliedSessionId || localUserId;
  const [isHost, setIsHost] = useState(initialIsHost);
  const [role, setRole] = useState<BattleRoomRole>(initialRole);
  const roleRef = useRef<BattleRoomRole>(initialRole);
  const [isOwner, setIsOwner] = useState(initialIsOwner);
  const [participants, setParticipants] = useState<BattleRoomParticipant[]>([]);
  const [roomEnded, setRoomEnded] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [roomReady, setRoomReady] = useState(false);
  const stateRevisionRef = useRef(0);
  const snapshotSequenceRef = useRef(0);
  const refreshRoomRef = useRef<(() => Promise<void>) | null>(null);
  const lastSnapshotRefreshAtRef = useRef(0);
  const [promotedToHost, setPromotedToHost] = useState(false);
  const [initialHp, setInitialHp] = useState<InitialHpOption>(requestedHp);
  const [phase, setPhase] = useState<BattlePhase>("LOBBY");
  const [currentRound, setCurrentRound] = useState(1);
  const [countdown, setCountdown] = useState<number | null>(null);
  const hpTimestampRef = useRef<number>(0);
  const sawOpponentRef = useRef<boolean>(false);

  useEffect(() => {
    if (initialIsHost && hpTimestampRef.current === 0) {
      hpTimestampRef.current = Date.now();
    }
  }, [initialIsHost]);

  const prevInitialIsHostRef = useRef(initialIsHost);
  useEffect(() => {
    if (prevInitialIsHostRef.current !== initialIsHost) {
      prevInitialIsHostRef.current = initialIsHost;
      setIsHost(initialIsHost);
    }
  }, [initialIsHost]);

  // プレイヤー状態
  const [player, setPlayer] = useState<BattlePlayerState>({
    userId: localUserId,
    userName: initialUserName || localUserName,
    device: detectedDevice,
    hp: requestedHp,
    combo: 0,
    godlikeCombo: 0,
    comboRank: null,
    currentRoundTime: null,
    currentRoundRank: null,
    currentRoundFoul: null,
    isReady: false,
    isHost: initialIsHost,
  });

  useEffect(() => {
    if (initialUserName) {
      setPlayer((p) => ({ ...p, userName: initialUserName }));
    }
  }, [initialUserName]);

  // 対戦相手状態
  const [opponent, setOpponent] = useState<BattlePlayerState | null>(null);

  // デバイス不一致の承諾状態
  const [deviceWarningAcceptedByMe, setDeviceWarningAcceptedByMe] =
    useState(false);
  const [deviceWarningAcceptedByOpponent, setDeviceWarningAcceptedByOpponent] =
    useState(false);

  // ラウンド結果
  const [roundResult, setRoundResult] = useState<RoundResolutionResult | null>(
    null,
  );
  const [matchWinner, setMatchWinner] = useState<
    "player" | "opponent" | "draw" | null
  >(null);
  const [matchFinishReason, setMatchFinishReason] = useState<
    "hp_zero" | "foul" | "opponent_left" | "both_hp_zero" | null
  >(null);
  const [roundLogs, setRoundLogs] = useState<BattleRoundLog[]>([]);
  const roundLogsRef = useRef<BattleRoundLog[]>([]);
  const hasSentRecordRef = useRef(false);

  // 再戦管理
  const [rematchRequestedByMe, setRematchRequestedByMe] = useState(false);
  const rematchRequestedByMeRef = useRef(false);
  const [rematchRequestedByOpponent, setRematchRequestedByOpponent] =
    useState(false);
  const [opponentReturnedToLobby, setOpponentReturnedToLobby] = useState(false);

  // 通信チャンネルとタイマーの参照
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resolveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const actionStartTimeRef = useRef<number | null>(null);
  const hostPromotionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const evaluatedRoundRef = useRef<number | null>(null);

  const recordMatchResult = useCallback(
    (
      finalWinner: "player" | "opponent" | "draw" | null,
      myHp: number,
      opponentHp: number,
    ) => {
      if (hasSentRecordRef.current || stateRef.current.role === "SPECTATOR")
        return;
      if (!sessionCredentials) {
        console.error(
          "Battle result was not recorded because the session is missing.",
        );
        return;
      }
      hasSentRecordRef.current = true;

      const myDevice =
        stateRef.current.player.device === "mobile" ? "MOBILE" : "PC";
      const oppDevice =
        stateRef.current.opponent?.device === "mobile" ? "MOBILE" : "PC";
      const currentLogs = roundLogsRef.current || [];
      const drawCount = currentLogs.filter((l) => l.winner === "draw").length;
      const reactionTimes = currentLogs
        .map((l) => l.playerTime)
        .filter((t): t is number => typeof t === "number" && t > 0);
      const wasUnder100 = currentLogs.some(
        (l) => l.playerHpAfter > 0 && l.playerHpAfter < 100,
      );
      const isFoul = currentLogs.some((l) => l.playerFoul !== null);

      void fetch("/api/battle/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: stateRef.current.roomId,
          sessionId: sessionCredentials.sessionId,
          sessionToken: sessionCredentials.token,
          result:
            finalWinner === "player"
              ? "win"
              : finalWinner === "opponent"
                ? "lose"
                : "draw",
          remainingHp: myHp,
          initialHp: stateRef.current.initialHp,
          opponentHp,
          rounds: stateRef.current.currentRound,
          myDevice,
          opponentDevice: oppDevice,
          maxGodlikeCombo: stateRef.current.player.godlikeCombo || 0,
          maxExcellentCombo: stateRef.current.player.combo || 0,
          wasUnder100HpBeforeWin: wasUnder100,
          drawCountInMatch: drawCount,
          reactionTimes,
          isFoul,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const data: unknown = await response.json().catch(() => null);
            throw new Error(
              data &&
                typeof data === "object" &&
                "error" in data &&
                typeof data.error === "string"
                ? data.error
                : `Battle result recording failed (${response.status}).`,
            );
          }
        })
        .catch((error: unknown) => {
          console.error("Unable to record the battle result:", error);
        });
    },
    [sessionCredentials],
  );

  // 最新状態の参照用
  const stateRef = useRef({
    phase,
    player,
    opponent,
    currentRound,
    initialHp,
    isHost,
    role,
    roomId,
  });

  useEffect(() => {
    stateRef.current = {
      phase,
      player,
      opponent,
      currentRound,
      initialHp,
      isHost,
      role,
      roomId,
    };
  }, [phase, player, opponent, currentRound, initialHp, isHost, role, roomId]);

  const applyBattleRoomView = useCallback(
    (view: BattleRoomView) => {
      const self = view.participants.find(
        (participant) => participant.sessionId === localSessionId,
      );
      const becameGameHost = Boolean(
        self?.isGameHost && !stateRef.current.isHost,
      );
      setParticipants(view.participants);
      if (self) {
        const wasSpectating = roleRef.current === "SPECTATOR";
        roleRef.current = self.role;
        setRole(self.role);
        setIsOwner(self.isOwner);
        setIsHost(self.isGameHost);
        if (wasSpectating && self.role !== "SPECTATOR") {
          setPhase("LOBBY");
          setCountdown(null);
          setCurrentRound(1);
          setRoundResult(null);
          setMatchWinner(null);
          setMatchFinishReason(null);
          setRoundLogs([]);
          setRematchRequestedByMe(false);
          rematchRequestedByMeRef.current = false;
          setRematchRequestedByOpponent(false);
        }
        if (self.role !== "SPECTATOR") {
          setPlayer((previous) => {
            if (
              previous.userName === self.userName &&
              previous.isHost === self.isGameHost
            ) {
              return previous;
            }
            return {
              ...previous,
              userName: self.userName,
              isHost: self.isGameHost,
            };
          });
        }
      }

      const otherPlayer = view.participants.find(
        (participant) =>
          participant.sessionId !== localSessionId &&
          participant.role !== "SPECTATOR" &&
          (self?.role === "SPECTATOR" || participant.role !== self?.role),
      );
      if (otherPlayer && self?.role !== "SPECTATOR") {
        setOpponent((previous) => {
          if (
            previous?.userId === otherPlayer.sessionId &&
            previous.userName === otherPlayer.userName &&
            previous.isHost === otherPlayer.isGameHost
          ) {
            return previous;
          }
          return {
            userId: otherPlayer.sessionId,
            userName: otherPlayer.userName,
            device: previous?.device ?? detectedDevice,
            hp: previous?.hp ?? stateRef.current.initialHp,
            combo: previous?.combo ?? 0,
            godlikeCombo: previous?.godlikeCombo ?? 0,
            comboRank: previous?.comboRank ?? null,
            currentRoundTime: previous?.currentRoundTime ?? null,
            currentRoundRank: previous?.currentRoundRank ?? null,
            currentRoundFoul: previous?.currentRoundFoul ?? null,
            isReady: otherPlayer.role !== "SPECTATOR",
            isHost: otherPlayer.isGameHost,
          };
        });
      } else if (!otherPlayer && self?.role !== "SPECTATOR") {
        setOpponent(null);
      }

      if (
        self &&
        (self.role === "SPECTATOR" || becameGameHost) &&
        view.room.stateRevision > stateRevisionRef.current
      ) {
        const snapshot = view.room.stateSnapshot;
        if (
          snapshot &&
          typeof snapshot === "object" &&
          !Array.isArray(snapshot) &&
          "player" in snapshot &&
          "opponent" in snapshot &&
          "phase" in snapshot &&
          "currentRound" in snapshot &&
          typeof snapshot.phase === "string" &&
          [
            "LOBBY",
            "DEVICE_WARNING",
            "COUNTDOWN",
            "WAITING",
            "ACTION",
            "RESOLVING",
            "MATCH_FINISHED",
          ].includes(snapshot.phase) &&
          typeof snapshot.currentRound === "number" &&
          (!("countdown" in snapshot) ||
            snapshot.countdown === null ||
            (typeof snapshot.countdown === "number" &&
              snapshot.countdown >= 1 &&
              snapshot.countdown <= 3)) &&
          typeof Reflect.get(snapshot, "initialHp") === "number" &&
          typeof snapshot.player === "object" &&
          snapshot.player !== null &&
          "userId" in snapshot.player &&
          typeof snapshot.player.userId === "string"
        ) {
          const shared = snapshot as {
            phase: BattlePhase;
            countdown?: number | null;
            currentRound: number;
            initialHp: number;
            player: BattlePlayerState;
            opponent: BattlePlayerState | null;
            roundResult: RoundResolutionResult | null;
            roundLogs?: unknown;
            matchWinner: "player" | "opponent" | "draw" | null;
            matchFinishReason:
              "hp_zero" | "foul" | "opponent_left" | "both_hp_zero" | null;
          };
          const shouldReversePerspective =
            becameGameHost && shared.player.userId !== localSessionId;
          const restoredPlayer = shouldReversePerspective
            ? shared.opponent
            : shared.player;
          const restoredOpponent = shouldReversePerspective
            ? shared.player
            : shared.opponent;
          const reverseWinner = (
            winner: "player" | "opponent" | "draw" | null,
          ) =>
            shouldReversePerspective
              ? winner === "player"
                ? "opponent"
                : winner === "opponent"
                  ? "player"
                  : winner
              : winner;
          const restoredRoundResult = shared.roundResult
            ? shouldReversePerspective
              ? {
                  ...shared.roundResult,
                  winner: reverseWinner(shared.roundResult.winner),
                  matchWinner: reverseWinner(shared.roundResult.matchWinner),
                  playerDamageTaken: shared.roundResult.opponentDamageTaken,
                  opponentDamageTaken: shared.roundResult.playerDamageTaken,
                  playerHpBefore: shared.roundResult.opponentHpBefore,
                  opponentHpBefore: shared.roundResult.playerHpBefore,
                  playerNewHp: shared.roundResult.opponentNewHp,
                  opponentNewHp: shared.roundResult.playerNewHp,
                  playerNewCombo: shared.roundResult.opponentNewCombo,
                  opponentNewCombo: shared.roundResult.playerNewCombo,
                  playerNewGodlikeCombo:
                    shared.roundResult.opponentNewGodlikeCombo,
                  opponentNewGodlikeCombo:
                    shared.roundResult.playerNewGodlikeCombo,
                  playerNewComboRank:
                    shared.roundResult.opponentNewComboRank,
                  opponentNewComboRank:
                    shared.roundResult.playerNewComboRank,
                  playerMultiplier: shared.roundResult.opponentMultiplier,
                  opponentMultiplier: shared.roundResult.playerMultiplier,
                  playerComboBefore:
                    shared.roundResult.opponentComboBefore,
                  opponentComboBefore:
                    shared.roundResult.playerComboBefore,
                  playerGodlikeComboBefore:
                    shared.roundResult.opponentGodlikeComboBefore,
                  opponentGodlikeComboBefore:
                    shared.roundResult.playerGodlikeComboBefore,
                }
              : shared.roundResult
            : null;
          const restoredRoundLogs = Array.isArray(shared.roundLogs)
            ? shared.roundLogs.map((log) => {
                if (!shouldReversePerspective || !isBattleRoundLog(log)) {
                  return log;
                }
                return {
                  ...log,
                  winner: reverseWinner(log.winner) ?? "draw",
                  playerTime: log.opponentTime,
                  playerRank: log.opponentRank,
                  playerFoul: log.opponentFoul,
                  playerComboBefore: log.opponentComboBefore,
                  playerGodlikeComboBefore: log.opponentGodlikeComboBefore,
                  opponentTime: log.playerTime,
                  opponentRank: log.playerRank,
                  opponentFoul: log.playerFoul,
                  opponentComboBefore: log.playerComboBefore,
                  opponentGodlikeComboBefore: log.playerGodlikeComboBefore,
                  playerHpAfter: log.opponentHpAfter,
                  opponentHpAfter: log.playerHpAfter,
                };
              })
            : [];
          stateRevisionRef.current = view.room.stateRevision;
          setPhase(shared.phase);
          setCountdown(shared.countdown ?? null);
          setCurrentRound(shared.currentRound);
          setInitialHp(shared.initialHp);
          if (restoredPlayer) setPlayer(restoredPlayer);
          setOpponent(restoredOpponent);
          setRoundResult(restoredRoundResult);
          if (
            Array.isArray(shared.roundLogs) &&
            shared.roundLogs.every(isBattleRoundLog)
          ) {
            setRoundLogs(restoredRoundLogs);
          }
          setMatchWinner(reverseWinner(shared.matchWinner));
          setMatchFinishReason(shared.matchFinishReason);
        }
      }
    },
    [detectedDevice, localSessionId],
  );

  useEffect(() => {
    roundLogsRef.current = roundLogs;
  }, [roundLogs]);

  useEffect(() => {
    if (phase === "LOBBY" || phase === "COUNTDOWN") {
      hasSentRecordRef.current = false;
    }
  }, [phase]);

  // デバイス不一致チェック
  const hasDeviceMismatch = Boolean(
    opponent && player.device !== opponent.device,
  );

  // ラウンドタイマークリア関数
  const clearAllTimers = useCallback(() => {
    soundManager.stopTick();
    if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
    if (hostPromotionTimerRef.current) {
      clearTimeout(hostPromotionTimerRef.current);
      hostPromotionTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!sessionCredentials || roomEnded || sessionExpired) return;
    let cancelled = false;
    let loggedError = false;
    const refresh = async () => {
      try {
        const response = await sendBattleSessionRequest(
          roomId,
          sessionCredentials,
          "PATCH",
        );
        const result: unknown = await response.json();
        if (!response.ok) {
          if (response.status === 401) {
            if (cancelled) return;
            setSessionExpired(true);
            clearBattleCredentials(roomId);
            clearAllTimers();
            if (heartbeatTimerRef.current) {
              clearInterval(heartbeatTimerRef.current);
              heartbeatTimerRef.current = null;
            }
            refreshRoomRef.current = null;
            channelRef.current?.unsubscribe();
            channelRef.current = null;
            return;
          }
          if (
            response.status === 410 ||
            (result &&
              typeof result === "object" &&
              "code" in result &&
              result.code === "ROOM_ENDED")
          ) {
            setRoomEnded(true);
            clearBattleCredentials(roomId);
            clearAllTimers();
            channelRef.current?.unsubscribe();
            channelRef.current = null;
            return;
          }
          throw new Error(
            result &&
              typeof result === "object" &&
              "error" in result &&
              typeof result.error === "string"
              ? result.error
              : `Room heartbeat failed (${response.status}).`,
          );
        }
        loggedError = false;
        if (!cancelled) {
          applyBattleRoomView(result as BattleRoomView);
          setRoomReady(true);
        }
      } catch (error) {
        if (!loggedError) {
          console.error("Battle room heartbeat failed:", error);
          loggedError = true;
        }
      }
    };
    refreshRoomRef.current = refresh;
    heartbeatTimerRef.current = setInterval(() => void refresh(), 5000);
    void refresh();
    return () => {
      cancelled = true;
      refreshRoomRef.current = null;
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [
    applyBattleRoomView,
    clearAllTimers,
    roomEnded,
    roomId,
    sessionCredentials,
    sessionExpired,
  ]);

  useEffect(() => {
    if (
      !sessionCredentials ||
      !roomReady ||
      !isHost ||
      role === "SPECTATOR" ||
      roomEnded
    ) {
      return;
    }
    let cancelled = false;
    snapshotSequenceRef.current += 1;
    const snapshot = {
      version: 1,
      publisherSessionId: localSessionId,
      clientSequence: snapshotSequenceRef.current,
      phase,
      countdown,
      currentRound,
      initialHp,
      player,
      opponent,
      roundResult,
      roundLogs,
      matchWinner,
      matchFinishReason,
    };
    void publishBattleSnapshotRequest(
      roomId,
      sessionCredentials,
      snapshot,
    ).then(
      (published) => {
        if (!cancelled) {
          stateRevisionRef.current = published.stateRevision;
          channelRef.current?.send({
            type: "broadcast",
            event: "snapshot_updated",
            payload: { revision: published.stateRevision },
          });
        }
      },
      (error: unknown) => {
        console.error("Unable to publish the battle snapshot:", error);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [
    countdown,
    currentRound,
    initialHp,
    isHost,
    localSessionId,
    matchFinishReason,
    matchWinner,
    opponent,
    phase,
    player,
    roomEnded,
    roomId,
    roomReady,
    role,
    roundResult,
    roundLogs,
    sessionCredentials,
  ]);

  // ホストへの昇格処理（ロビーでホスト退出時）
  const promoteSelfToHost = useCallback(() => {
    if (sessionCredentials) return;
    if (stateRef.current.isHost) return;
    setIsHost(true);
    setPromotedToHost(true);
    stateRef.current.isHost = true;
    setPlayer((p) => ({ ...p, isHost: true }));

    if (channelRef.current) {
      const payload: PresencePayload = {
        userId: localUserId,
        userName: localUserName,
        device: detectedDevice,
        isReady: true,
        initialHp: stateRef.current.initialHp,
        isHost: true,
      };
      channelRef.current.track(payload);
    }
  }, [detectedDevice, localUserId, localUserName, sessionCredentials]);

  // 部屋退出処理（ブロードキャスト通知付き）
  const leaveRoom = useCallback(() => {
    if (sessionCredentials) {
      void sendBattleSessionRequest(roomId, sessionCredentials, "DELETE")
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Leaving the room failed (${response.status}).`);
          }
          clearBattleCredentials(roomId);
        })
        .catch((error: unknown) => {
          console.error("Unable to leave the battle room:", error);
        });
    }
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "player_left",
        payload: {
          userId: localUserId,
          sessionId: localSessionId,
          isHost: stateRef.current.isHost,
        },
      });
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    clearAllTimers();
  }, [clearAllTimers, localSessionId, localUserId, roomId, sessionCredentials]);

  const dissolveRoom = useCallback(async () => {
    if (!sessionCredentials || !isHost) {
      throw new Error("Only the game host can dissolve this room.");
    }
    const response = await dissolveBattleRoomRequest(
      roomId,
      sessionCredentials,
    );
    if (!response.ok) {
      const data: unknown = await response.json().catch(() => null);
      throw new Error(
        data &&
          typeof data === "object" &&
          "error" in data &&
          typeof data.error === "string"
          ? data.error
          : `Dissolving the room failed (${response.status}).`,
      );
    }
    channelRef.current?.send({
      type: "broadcast",
      event: "room_dissolved",
      payload: { sessionId: localSessionId },
    });
    clearAllTimers();
    setRoomEnded(true);
    channelRef.current?.unsubscribe();
    channelRef.current = null;
  }, [clearAllTimers, isHost, localSessionId, roomId, sessionCredentials]);

  // 1. ラウンド開始実行 (ホストから呼び出し、またはround_start受信時)
  const startRoundWithDelay = useCallback(
    (round: number, delay: number) => {
      clearAllTimers();
      setCurrentRound(round);
      setRoundResult(null);
      evaluatedRoundRef.current = null;
      stateRef.current.currentRound = round;

      if (round === 1) {
        setMatchWinner(null);
        setMatchFinishReason(null);
        setRematchRequestedByMe(false);
        rematchRequestedByMeRef.current = false;
        setRematchRequestedByOpponent(false);
        setRoundLogs([]);
      }

      // ラウンド用の一時状態をリセット
      setPlayer((prev) => ({
        ...prev,
        combo: round === 1 ? 0 : prev.combo,
        godlikeCombo: round === 1 ? 0 : prev.godlikeCombo,
        comboRank: round === 1 ? null : prev.comboRank,
        currentRoundTime: null,
        currentRoundRank: null,
        currentRoundFoul: null,
      }));
      setOpponent((prev) =>
        prev
          ? {
              ...prev,
              combo: round === 1 ? 0 : prev.combo,
              godlikeCombo: round === 1 ? 0 : prev.godlikeCombo,
              comboRank: round === 1 ? null : prev.comboRank,
              currentRoundTime: null,
              currentRoundRank: null,
              currentRoundFoul: null,
            }
          : null,
      );
      stateRef.current.player = {
        ...stateRef.current.player,
        combo: round === 1 ? 0 : stateRef.current.player.combo,
        godlikeCombo: round === 1 ? 0 : stateRef.current.player.godlikeCombo,
        comboRank: round === 1 ? null : stateRef.current.player.comboRank,
        currentRoundTime: null,
        currentRoundRank: null,
        currentRoundFoul: null,
      };
      if (stateRef.current.opponent) {
        stateRef.current.opponent = {
          ...stateRef.current.opponent,
          combo: round === 1 ? 0 : stateRef.current.opponent.combo,
          godlikeCombo:
            round === 1 ? 0 : stateRef.current.opponent.godlikeCombo,
          comboRank: round === 1 ? null : stateRef.current.opponent.comboRank,
          currentRoundTime: null,
          currentRoundRank: null,
          currentRoundFoul: null,
        };
      }

      // カウントダウンフェーズ (READY -> 3, 2, 1)
      setPhase("COUNTDOWN");
      stateRef.current.phase = "COUNTDOWN";
      setCountdown(3);
      soundManager.playBgm();
      soundManager.playCountdown();

      let count = 3;
      countdownTimerRef.current = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdown(count);
          soundManager.playCountdown();
        } else {
          if (countdownTimerRef.current)
            clearInterval(countdownTimerRef.current);
          setCountdown(null);

          // WAITINGフェーズ（赤画面）
          setPhase("WAITING");
          stateRef.current.phase = "WAITING";
          actionStartTimeRef.current = null;

          // 指定された delay 後に ACTION フェーズ（緑画面）へ移行
          // GameCanvas と同一の rAF 計測起点同期と Tick サウンド
          delayTimerRef.current = setTimeout(() => {
            actionStartTimeRef.current = performance.now();
            requestAnimationFrame((timestamp) => {
              actionStartTimeRef.current = timestamp;
            });
            setPhase("ACTION");
            stateRef.current.phase = "ACTION";
            soundManager.playAction();
            soundManager.startTick();
            haptics.action();
          }, delay);
        }
      }, 800);
    },
    [clearAllTimers],
  );

  // ホストが次のラウンドを開始するトリガー
  const triggerNextRound = useCallback(
    (roundNum: number) => {
      const currentInitialHp = stateRef.current.initialHp;

      if (roundNum === 1) {
        setRoundLogs([]);
        setPlayer((p) => ({
          ...p,
          hp: currentInitialHp,
          combo: 0,
          godlikeCombo: 0,
          comboRank: null,
        }));
        setOpponent((o) =>
          o
            ? {
                ...o,
                hp: currentInitialHp,
                combo: 0,
                godlikeCombo: 0,
                comboRank: null,
              }
            : null,
        );
        stateRef.current.player.hp = currentInitialHp;
        stateRef.current.player.combo = 0;
        stateRef.current.player.godlikeCombo = 0;
        stateRef.current.player.comboRank = null;
        stateRef.current.player.currentRoundTime = null;
        stateRef.current.player.currentRoundRank = null;
        stateRef.current.player.currentRoundFoul = null;
        if (stateRef.current.opponent) {
          stateRef.current.opponent.hp = currentInitialHp;
          stateRef.current.opponent.combo = 0;
          stateRef.current.opponent.godlikeCombo = 0;
          stateRef.current.opponent.comboRank = null;
          stateRef.current.opponent.currentRoundTime = null;
          stateRef.current.opponent.currentRoundRank = null;
          stateRef.current.opponent.currentRoundFoul = null;
        }
      } else {
        // roundNum > 1 の時のみ、どちらかのHPが0以下の場合は試合終了にする
        const currentPlayerHp = stateRef.current.player.hp;
        const currentOpponentHp = stateRef.current.opponent?.hp ?? 1000;
        if (currentPlayerHp <= 0 || currentOpponentHp <= 0) {
          const winner =
            currentPlayerHp <= 0 && currentOpponentHp <= 0
              ? "draw"
              : currentPlayerHp <= 0
                ? "opponent"
                : "player";
          setPhase("MATCH_FINISHED");
          setMatchWinner(winner);
          setMatchFinishReason("hp_zero");
          if (channelRef.current) {
            channelRef.current.send({
              type: "broadcast",
              event: "match_finished",
              payload: {
                winner,
                reason: "hp_zero",
                playerHp: currentPlayerHp,
                opponentHp: currentOpponentHp,
              },
            });
          }
          return;
        }
      }

      const delay = generateRoundDelay();
      const hostState = stateRef.current.player;
      const guestState = stateRef.current.opponent;
      const payload: RoundStartPayload = {
        round: roundNum,
        delay,
        initialHp: currentInitialHp,
        hostState: {
          hp: hostState.hp,
          combo: hostState.combo,
          godlikeCombo: hostState.godlikeCombo,
          comboRank: hostState.comboRank ?? null,
        },
        guestState: {
          hp: guestState?.hp ?? currentInitialHp,
          combo: guestState?.combo ?? 0,
          godlikeCombo: guestState?.godlikeCombo ?? 0,
          comboRank: guestState?.comboRank ?? null,
        },
      };

      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "round_start",
          payload,
        });
      }

      startRoundWithDelay(roundNum, delay);
    },
    [startRoundWithDelay],
  );

  // 両者のタイム確定時のラウンド結果処理
  const evaluateRoundIfReady = useCallback(
    (pState: BattlePlayerState, oState: BattlePlayerState) => {
      const pFinished =
        pState.currentRoundTime !== null || pState.currentRoundFoul !== null;
      const oFinished =
        oState.currentRoundTime !== null || oState.currentRoundFoul !== null;

      if (!pFinished || !oFinished) {
        return;
      }

      // 同一ラウンドでの多重評価を厳密に遮断
      if (evaluatedRoundRef.current === stateRef.current.currentRound) {
        return;
      }
      if (
        stateRef.current.phase === "RESOLVING" ||
        stateRef.current.phase === "MATCH_FINISHED"
      ) {
        return;
      }
      evaluatedRoundRef.current = stateRef.current.currentRound;

      setPhase("RESOLVING");
      const res = resolveRound(pState, oState);
      setRoundResult(res);

      // バトルログ記録
      const logEntry: BattleRoundLog = {
        round: stateRef.current.currentRound,
        winner: res.winner || "draw",
        playerTime: pState.currentRoundTime,
        playerRank: pState.currentRoundRank,
        playerFoul: pState.currentRoundFoul,
        playerComboBefore: pState.combo,
        playerGodlikeComboBefore: pState.godlikeCombo,
        opponentTime: oState.currentRoundTime,
        opponentRank: oState.currentRoundRank,
        opponentFoul: oState.currentRoundFoul,
        opponentComboBefore: oState.combo,
        opponentGodlikeComboBefore: oState.godlikeCombo,
        damage:
          res.winner === "player"
            ? res.opponentDamageTaken
            : res.winner === "opponent"
              ? res.playerDamageTaken
              : 0,
        appliedRankMult: res.appliedRankMult ?? 1.0,
        appliedComboMult: res.appliedComboMult ?? 1.0,
        appliedBonusType: res.appliedBonusType ?? null,
        playerHpAfter: res.playerNewHp,
        opponentHpAfter: res.opponentNewHp,
      };

      setRoundLogs((prev) => {
        if (prev.some((l) => l.round === logEntry.round)) {
          return prev;
        }
        return [...prev, logEntry];
      });

      // ダメージ計算アニメーションの合計時間に合わせて動的に待機時間を設定
      let resolveDelay = 5200;
      if (
        res.winner === "draw" ||
        pState.currentRoundFoul ||
        oState.currentRoundFoul
      ) {
        resolveDelay = 2500;
      } else {
        const hasRank = (res.appliedRankMult ?? 1.0) > 1.0;
        const hasCombo = (res.appliedComboMult ?? 1.0) > 1.0;
        if (hasRank && hasCombo) {
          resolveDelay = 9800; // 1s + 1s + 1.5s + 1s + 1.5s + 1s + 1.5s + 0.5s + 0.8s余韻
        } else if (hasRank || hasCombo) {
          resolveDelay = 7800; // 1s + 1s + 1.5s + 1s + 1.5s + 0.5s + 0.8s余韻
        } else {
          resolveDelay = 5200; // 1s + 1s + 1.5s + 0.5s + 1.2s余韻
        }
      }

      // 演出時間完了後に新HP/コンボを確定反映して次へ進む
      resolveTimerRef.current = setTimeout(() => {
        // 演出完了時に初めてHPとコンボを正式反映（アニメーション中の増減チラつきを完全防止）
        setPlayer((prev) => ({
          ...prev,
          hp: res.playerNewHp,
          combo: res.playerNewCombo,
          godlikeCombo: res.playerNewGodlikeCombo,
          comboRank: res.playerNewComboRank ?? null,
        }));
        setOpponent((prev) =>
          prev
            ? {
                ...prev,
                hp: res.opponentNewHp,
                combo: res.opponentNewCombo,
                godlikeCombo: res.opponentNewGodlikeCombo,
                comboRank: res.opponentNewComboRank ?? null,
              }
            : null,
        );
        stateRef.current.player = {
          ...stateRef.current.player,
          hp: res.playerNewHp,
          combo: res.playerNewCombo,
          godlikeCombo: res.playerNewGodlikeCombo,
          comboRank: res.playerNewComboRank ?? null,
        };
        if (stateRef.current.opponent) {
          stateRef.current.opponent = {
            ...stateRef.current.opponent,
            hp: res.opponentNewHp,
            combo: res.opponentNewCombo,
            godlikeCombo: res.opponentNewGodlikeCombo,
            comboRank: res.opponentNewComboRank ?? null,
          };
        }

        const isHpExhausted =
          res.matchOver ||
          res.playerNewHp <= 0 ||
          res.opponentNewHp <= 0 ||
          stateRef.current.player.hp <= 0 ||
          (stateRef.current.opponent?.hp ?? 1000) <= 0;

        if (isHpExhausted) {
          const finalWinner =
            res.matchWinner ||
            (res.playerNewHp <= 0 && res.opponentNewHp <= 0
              ? "draw"
              : res.playerNewHp <= 0
                ? "opponent"
                : "player");

          setPhase("MATCH_FINISHED");
          setMatchWinner(finalWinner);
          setMatchFinishReason(res.reason || "hp_zero");
          if (finalWinner === "player") {
            soundManager.playHitGodlike();
          } else if (finalWinner === "opponent") {
            soundManager.playGameOver();
          }

          // ホストの場合、確実に相手クライアントへ試合終了を通知
          if (stateRef.current.isHost && channelRef.current) {
            channelRef.current.send({
              type: "broadcast",
              event: "match_finished",
              payload: {
                winner: finalWinner,
                reason: res.reason || "hp_zero",
                playerHp: res.playerNewHp,
                opponentHp: res.opponentNewHp,
              },
            });
          }

          // 試合結果を記録 (バックグラウンドで安全に送信)
          recordMatchResult(finalWinner, res.playerNewHp, res.opponentNewHp);
        } else {
          // ホストが次のラウンドを開始
          if (stateRef.current.isHost) {
            triggerNextRound(stateRef.current.currentRound + 1);
          }
        }
      }, resolveDelay);
    },
    [recordMatchResult, triggerNextRound],
  );

  // 2. タップ/クリック判定
  const handleTap = useCallback(():
    | {
        type: "FOUL";
        reason: string;
      }
    | {
        type: "SUCCESS";
        reactionTime: number;
        rank: "GODLIKE" | "EXCELLENT" | "NORMAL";
      }
    | null => {
    if (stateRef.current.role === "SPECTATOR") return null;
    const currentPhase = stateRef.current.phase;
    const now = performance.now();

    // 待機中（WAITING: 赤画面）のタップはフライング（即死ペナルティ）
    if (currentPhase === "WAITING") {
      clearAllTimers();
      const foulReason = checkFoul(null, true);
      soundManager.playGameOver();
      haptics.gameOver();

      stateRef.current.player = {
        ...stateRef.current.player,
        currentRoundFoul: foulReason,
      };

      setPlayer((prev) => {
        const nextState = {
          ...prev,
          currentRoundFoul: foulReason,
        };
        if (stateRef.current.opponent) {
          evaluateRoundIfReady(nextState, stateRef.current.opponent);
        }
        return nextState;
      });

      // 相手へフライング通知をブロードキャスト
      if (channelRef.current) {
        const payload: FoulPayload = {
          round: stateRef.current.currentRound,
          reason: "early_click",
        };
        channelRef.current.send({
          type: "broadcast",
          event: "foul",
          payload,
        });
      }
      return { type: "FOUL", reason: foulReason || "early_click" };
    }

    // 反応受付中（ACTION: 緑画面）のタップ
    if (currentPhase === "ACTION") {
      if (
        stateRef.current.player.currentRoundTime !== null ||
        stateRef.current.player.currentRoundFoul !== null
      ) {
        return null;
      }
      soundManager.stopTick();
      if (!actionStartTimeRef.current) return null;
      const reactionTime =
        Math.round((now - actionStartTimeRef.current) * 10) / 10;
      const foulReason = checkFoul(reactionTime, false);

      if (foulReason) {
        // 100ms未満の異常計測値によるペナルティ
        clearAllTimers();
        soundManager.playGameOver();
        haptics.gameOver();

        stateRef.current.player = {
          ...stateRef.current.player,
          currentRoundTime: reactionTime,
          currentRoundFoul: foulReason,
        };

        setPlayer((prev) => {
          const nextState = {
            ...prev,
            currentRoundTime: reactionTime,
            currentRoundFoul: foulReason,
          };
          if (stateRef.current.opponent) {
            evaluateRoundIfReady(nextState, stateRef.current.opponent);
          }
          return nextState;
        });

        if (channelRef.current) {
          const payload: FoulPayload = {
            round: stateRef.current.currentRound,
            reason: foulReason,
          };
          channelRef.current.send({
            type: "broadcast",
            event: "foul",
            payload,
          });
        }
        return { type: "FOUL", reason: foulReason };
      }

      // 正常な反応速度の計測
      const rank = getBattleReactionRank(reactionTime, player.device);
      if (rank === "GODLIKE") {
        soundManager.playHitGodlike();
        haptics.hitGodlike();
      } else if (rank === "EXCELLENT") {
        soundManager.playHitExcellent();
        haptics.hitExcellent();
      } else {
        soundManager.playHitNormal();
        haptics.hitNormal();
      }

      stateRef.current.player = {
        ...stateRef.current.player,
        currentRoundTime: reactionTime,
        currentRoundRank: rank,
      };

      setPlayer((prev) => {
        const nextState = {
          ...prev,
          currentRoundTime: reactionTime,
          currentRoundRank: rank,
        };
        if (stateRef.current.opponent) {
          evaluateRoundIfReady(nextState, stateRef.current.opponent);
        }
        return nextState;
      });

      // 相手へ計測タイムをブロードキャスト
      if (channelRef.current) {
        const payload: SubmitTimePayload = {
          round: stateRef.current.currentRound,
          time: reactionTime,
          rank,
        };
        channelRef.current.send({
          type: "broadcast",
          event: "submit_time",
          payload,
        });
      }

      return { type: "SUCCESS", reactionTime, rank };
    }

    return null;
  }, [clearAllTimers, evaluateRoundIfReady, player.device]);

  // 3. デバイス警告の承諾
  const acceptDeviceWarning = useCallback(() => {
    if (stateRef.current.role === "SPECTATOR") return;
    setDeviceWarningAcceptedByMe(true);
    if (channelRef.current) {
      const payload: DeviceWarningAcceptPayload = { userId: localUserId };
      channelRef.current.send({
        type: "broadcast",
        event: "device_warning_accept",
        payload,
      });
    }
  }, [localUserId]);

  // 4. マッチ開始（ホストが実行）
  const startMatch = useCallback(() => {
    if (!stateRef.current.isHost || stateRef.current.role === "SPECTATOR")
      return;
    soundManager.unlock();
    soundManager.playBgm();
    if (
      hasDeviceMismatch &&
      (!deviceWarningAcceptedByMe || !deviceWarningAcceptedByOpponent)
    ) {
      setPhase("DEVICE_WARNING");
      // ゲスト側にもデバイス警告モーダルを表示させる
      channelRef.current?.send({
        type: "broadcast",
        event: "device_warning_open",
        payload: {},
      });
      return;
    }
    triggerNextRound(1);
  }, [
    hasDeviceMismatch,
    deviceWarningAcceptedByMe,
    deviceWarningAcceptedByOpponent,
    triggerNextRound,
  ]);

  // 再戦リセット
  const resetForRematch = useCallback(() => {
    clearAllTimers();
    soundManager.unlock();
    setRoundLogs([]);
    setOpponentReturnedToLobby(false);
    setRoundResult(null);
    setMatchWinner(null);
    setMatchFinishReason(null);
    setCurrentRound(1);
    evaluatedRoundRef.current = null;

    const currentHp = stateRef.current.initialHp;
    stateRef.current.currentRound = 1;
    stateRef.current.player = {
      ...stateRef.current.player,
      hp: currentHp,
      combo: 0,
      godlikeCombo: 0,
      comboRank: null,
      currentRoundTime: null,
      currentRoundRank: null,
      currentRoundFoul: null,
    };
    if (stateRef.current.opponent) {
      stateRef.current.opponent = {
        ...stateRef.current.opponent,
        hp: currentHp,
        combo: 0,
        godlikeCombo: 0,
        comboRank: null,
        currentRoundTime: null,
        currentRoundRank: null,
        currentRoundFoul: null,
      };
    }

    setPlayer((prev) => ({
      ...prev,
      hp: currentHp,
      combo: 0,
      godlikeCombo: 0,
      comboRank: null,
      currentRoundTime: null,
      currentRoundRank: null,
      currentRoundFoul: null,
    }));

    setOpponent((prev) =>
      prev
        ? {
            ...prev,
            hp: currentHp,
            combo: 0,
            godlikeCombo: 0,
            comboRank: null,
            currentRoundTime: null,
            currentRoundRank: null,
            currentRoundFoul: null,
          }
        : null,
    );

    if (stateRef.current.isHost) {
      triggerNextRound(1);
    }
  }, [clearAllTimers, triggerNextRound]);

  // 5. 再戦要求
  const requestRematch = useCallback(() => {
    if (stateRef.current.role === "SPECTATOR") return;
    setRematchRequestedByMe(true);
    rematchRequestedByMeRef.current = true;

    // 相手が既にロビーへ戻っている場合は再戦要求ブロードキャストは行わない
    if (opponentReturnedToLobby) {
      return;
    }

    if (channelRef.current) {
      const payload: RematchPayload = { fromUserId: localUserId };
      channelRef.current.send({
        type: "broadcast",
        event: "rematch_request",
        payload,
      });
    }

    // 相手が既に再戦要求を出していれば即座に再戦開始
    if (rematchRequestedByOpponent) {
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "rematch_accept",
          payload: {},
        });
      }
      resetForRematch();
    }
  }, [
    localUserId,
    rematchRequestedByOpponent,
    opponentReturnedToLobby,
    resetForRematch,
  ]);

  // 初期HP変更処理 (ホストのみ操作可能、リアルタイム反映)
  const changeInitialHp = useCallback((newHp: InitialHpOption) => {
    if (!stateRef.current.isHost || stateRef.current.role === "SPECTATOR") {
      return;
    }
    const now = Date.now();
    hpTimestampRef.current = now;
    setInitialHp(newHp);
    stateRef.current.initialHp = newHp;
    setPlayer((p) => ({ ...p, hp: newHp }));
    setOpponent((o) => (o ? { ...o, hp: newHp } : null));

    if (channelRef.current) {
      // Broadcast は軽量・即時送信 (Presenceのleave/joinを発生させず安定同期)
      channelRef.current.send({
        type: "broadcast",
        event: "update_hp",
        payload: { initialHp: newHp, timestamp: now },
      });
    }
  }, []);

  // リアクションスタンプ (表示は REACTION_DISPLAY_MS、連打は REACTION_COOLDOWN_MS で制限)
  const [myReaction, setMyReaction] = useState<ReactionEmoji | null>(null);
  const [opponentReaction, setOpponentReaction] =
    useState<ReactionEmoji | null>(null);
  const [spectatorReaction, setSpectatorReaction] = useState<
    SpectatorReaction[]
  >([]);
  const myReactionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const opponentReactionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const spectatorReactionTimersRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );
  const lastSentReactionRef = useRef(0);
  const lastReceivedReactionBySenderRef = useRef(new Map<string, number>());
  const reactionSequenceRef = useRef(0);
  const spectatorReactionQueueRef = useRef<SpectatorReaction[]>([]);

  const addSpectatorReaction = useCallback((reaction: SpectatorReaction) => {
    const nextQueue = [...spectatorReactionQueueRef.current, reaction].slice(
      -MAX_ACTIVE_SPECTATOR_REACTIONS,
    );
    const activeIds = new Set(nextQueue.map(({ id }) => id));
    for (const [reactionId, timer] of spectatorReactionTimersRef.current) {
      if (!activeIds.has(reactionId)) {
        clearTimeout(timer);
        spectatorReactionTimersRef.current.delete(reactionId);
      }
    }
    spectatorReactionQueueRef.current = nextQueue;
    setSpectatorReaction(nextQueue);

    if (spectatorReactionTimersRef.current.has(reaction.id)) {
      clearTimeout(spectatorReactionTimersRef.current.get(reaction.id));
    }
    const timer = setTimeout(
      () => {
        spectatorReactionTimersRef.current.delete(reaction.id);
        const remaining = spectatorReactionQueueRef.current.filter(
          ({ id }) => id !== reaction.id,
        );
        spectatorReactionQueueRef.current = remaining;
        setSpectatorReaction(remaining);
      },
      Math.max(
        0,
        reaction.receivedAt + SPECTATOR_REACTION_DISPLAY_MS - Date.now(),
      ),
    );
    spectatorReactionTimersRef.current.set(reaction.id, timer);
  }, []);

  useEffect(
    () => () => {
      if (myReactionTimerRef.current) clearTimeout(myReactionTimerRef.current);
      if (opponentReactionTimerRef.current)
        clearTimeout(opponentReactionTimerRef.current);
      for (const timer of spectatorReactionTimersRef.current.values()) {
        clearTimeout(timer);
      }
      spectatorReactionTimersRef.current.clear();
    },
    [],
  );

  const sendReaction = useCallback(
    (emoji: ReactionEmoji) => {
      if (!isReactionEmoji(emoji)) return;
      const now = Date.now();
      if (now - lastSentReactionRef.current < REACTION_COOLDOWN_MS) return;
      lastSentReactionRef.current = now;

      const senderRole = roleRef.current;
      const reactionId = `${localSessionId}:${now}:${++reactionSequenceRef.current}`;
      if (senderRole === "SPECTATOR") {
        addSpectatorReaction({
          id: reactionId,
          senderId: localSessionId,
          emoji,
          userName: localUserName,
          receivedAt: now,
          horizontalPosition: 10 + Math.random() * 80,
        });
      } else {
        setMyReaction(emoji);
        if (myReactionTimerRef.current)
          clearTimeout(myReactionTimerRef.current);
        myReactionTimerRef.current = setTimeout(
          () => setMyReaction(null),
          REACTION_DISPLAY_MS,
        );
      }

      channelRef.current?.send({
        type: "broadcast",
        event: "reaction",
        payload: {
          emoji,
          role: senderRole,
          senderId: localSessionId,
          userName: localUserName,
        },
      });
    },
    [addSpectatorReaction, localSessionId, localUserName],
  );

  // 6. ロビーへ戻る（自身をロビー画面へ戻す）
  const resetToLobbyState = useCallback(() => {
    clearAllTimers();
    setRoundLogs([]);
    setPhase("LOBBY");
    setCountdown(null);
    setRoundResult(null);
    setMatchWinner(null);
    setMatchFinishReason(null);
    setRematchRequestedByMe(false);
    rematchRequestedByMeRef.current = false;
    setRematchRequestedByOpponent(false);
    setOpponentReturnedToLobby(false);
    setCurrentRound(1);

    const currentHp = stateRef.current.initialHp;
    stateRef.current.currentRound = 1;
    stateRef.current.player = {
      ...stateRef.current.player,
      hp: currentHp,
      combo: 0,
      godlikeCombo: 0,
      comboRank: null,
      currentRoundTime: null,
      currentRoundRank: null,
      currentRoundFoul: null,
    };
    if (stateRef.current.opponent) {
      stateRef.current.opponent = {
        ...stateRef.current.opponent,
        hp: currentHp,
        combo: 0,
        godlikeCombo: 0,
        comboRank: null,
        currentRoundTime: null,
        currentRoundRank: null,
        currentRoundFoul: null,
      };
    }

    setPlayer((prev) => ({
      ...prev,
      hp: currentHp,
      combo: 0,
      godlikeCombo: 0,
      comboRank: null,
      currentRoundTime: null,
      currentRoundRank: null,
      currentRoundFoul: null,
      isHost: stateRef.current.isHost,
    }));

    // Presenceを即時チェック：相手がすでに退室していれば即座にホストへ昇格
    if (channelRef.current) {
      const presenceState = channelRef.current.presenceState<PresencePayload>();
      const allPresences: PresencePayload[] = [];
      Object.values(presenceState).forEach((list) => {
        list.forEach((item) => allPresences.push(item));
      });
      const otherPresences = allPresences.filter(
        (p) =>
          (p.sessionId
            ? p.sessionId !== localSessionId
            : p.userId !== localUserId) &&
          (!sessionCredentials ||
            (p.role !== undefined &&
              p.role !== "SPECTATOR" &&
              p.role !== role)),
      );
      if (otherPresences.length === 0) {
        setOpponent(null);
        if (!stateRef.current.isHost && !sessionCredentials) {
          promoteSelfToHost();
        }
      } else {
        const other = otherPresences[otherPresences.length - 1];
        setOpponent((prev) => ({
          userId: other.userId,
          userName: other.userName,
          device: other.device,
          hp: prev ? prev.hp : currentHp,
          combo: 0,
          godlikeCombo: 0,
          comboRank: null,
          currentRoundTime: null,
          currentRoundRank: null,
          currentRoundFoul: null,
          isReady: other.isReady,
          isHost: other.isHost,
        }));
      }
    }
  }, [
    clearAllTimers,
    localSessionId,
    localUserId,
    promoteSelfToHost,
    role,
    sessionCredentials,
  ]);

  const rotateToSpectator = useCallback(async () => {
    if (!sessionCredentials || stateRef.current.role === "SPECTATOR") return;
    const view = await rotateBattleParticipantRequest(
      roomId,
      sessionCredentials,
    );
    applyBattleRoomView(view);
    resetToLobbyState();
  }, [applyBattleRoomView, resetToLobbyState, roomId, sessionCredentials]);

  const returnToLobby = useCallback(() => {
    if (stateRef.current.role === "SPECTATOR") return;
    resetToLobbyState();
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "return_to_lobby",
        payload: {},
      });
    }
  }, [resetToLobbyState]);

  // 7. Supabase Realtime 接続とライフサイクル
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`battle:${roomId}`, {
      config: {
        presence: { key: localSessionId },
        broadcast: { ack: false, self: false },
      },
    });

    channelRef.current = channel;

    // Presence: 同期 & 退出イベント
    const syncPresence = () => {
      const presenceState = channel.presenceState<PresencePayload>();
      const allPresences: PresencePayload[] = [];

      Object.values(presenceState).forEach((list) => {
        list.forEach((item) => allPresences.push(item));
      });

      // 自身以外のプレイヤーを探す (複数ある場合は最新のものを取得)
      const otherPresences = allPresences.filter(
        (p) =>
          (p.sessionId
            ? p.sessionId !== localSessionId
            : p.userId !== localUserId) &&
          (!sessionCredentials ||
            (p.role !== undefined &&
              p.role !== "SPECTATOR" &&
              p.role !== role)),
      );
      const other =
        otherPresences.length > 0
          ? otherPresences[otherPresences.length - 1]
          : undefined;

      if (other) {
        // 相手が確認できた場合、昇格猶予タイマーがあればキャンセル
        if (hostPromotionTimerRef.current) {
          clearTimeout(hostPromotionTimerRef.current);
          hostPromotionTimerRef.current = null;
        }

        sawOpponentRef.current = true;

        // ゲスト側の場合、初期接続時（hpTimestampRef.current === 0）のみ Presence から initialHp を取得
        if (
          !stateRef.current.isHost &&
          other.initialHp &&
          hpTimestampRef.current === 0
        ) {
          const syncedHp = other.initialHp as InitialHpOption;
          if (syncedHp !== stateRef.current.initialHp) {
            setInitialHp(syncedHp);
            stateRef.current.initialHp = syncedHp;
            setPlayer((p) => ({ ...p, hp: syncedHp }));
          }
        }

        const effectiveHp = stateRef.current.isHost
          ? stateRef.current.initialHp
          : other.initialHp || stateRef.current.initialHp;

        setOpponent((prev) => ({
          userId: other.userId,
          userName: other.userName,
          device: other.device,
          hp: prev ? prev.hp : effectiveHp,
          combo: prev?.combo ?? 0,
          godlikeCombo: prev?.godlikeCombo ?? 0,
          comboRank: prev?.comboRank ?? null,
          currentRoundTime: prev?.currentRoundTime ?? null,
          currentRoundRank: prev?.currentRoundRank ?? null,
          currentRoundFoul: prev?.currentRoundFoul ?? null,
          isReady: other.isReady,
          isHost: other.isHost,
        }));
      } else {
        if (role === "SPECTATOR") return;
        // 相手が一時的に見当たらない場合
        setOpponent(null);

        if (stateRef.current.phase === "LOBBY") {
          // ロビーで相手が不在、かつホストでない場合
          if (!stateRef.current.isHost) {
            if (sawOpponentRef.current || !hostPromotionTimerRef.current) {
              hostPromotionTimerRef.current = setTimeout(() => {
                hostPromotionTimerRef.current = null;
                if (
                  !stateRef.current.isHost &&
                  stateRef.current.phase === "LOBBY"
                ) {
                  sawOpponentRef.current = false;
                  promoteSelfToHost();
                }
              }, 1500);
            }
          }
        } else if (stateRef.current.phase === "MATCH_FINISHED") {
          // リザルト画面で相手が抜けた場合、ホストでなければ昇格
          if (!stateRef.current.isHost) {
            promoteSelfToHost();
          }
        } else {
          // 対戦中の切断判定
          if (sawOpponentRef.current || stateRef.current.opponent) {
            setPhase("MATCH_FINISHED");
            setMatchWinner("player");
            setMatchFinishReason("opponent_left");
          }
        }
      }
    };

    channel.on("presence", { event: "sync" }, syncPresence);
    channel.on("presence", { event: "leave" }, syncPresence);

    // Broadcast: player_left (相手が能動的に退出した通知)
    channel.on("broadcast", { event: "player_left" }, ({ payload }) => {
      const data = payload as { userId: string; isHost: boolean };
      if (data.userId !== localUserId) {
        if (hostPromotionTimerRef.current) {
          clearTimeout(hostPromotionTimerRef.current);
          hostPromotionTimerRef.current = null;
        }
        setOpponent(null);
        sawOpponentRef.current = false;

        // 相手ホストが退出した場合、現在のフェーズに関わらず新ホストに昇格
        if (data.isHost) {
          promoteSelfToHost();
        }

        if (
          stateRef.current.phase !== "LOBBY" &&
          stateRef.current.phase !== "MATCH_FINISHED"
        ) {
          setPhase("MATCH_FINISHED");
          setMatchWinner("player");
          setMatchFinishReason("opponent_left");
        }
      }
    });

    // Broadcast: match_finished (ホストからの決着・終了通知)
    channel.on("broadcast", { event: "match_finished" }, ({ payload }) => {
      const data = payload as {
        winner: "player" | "opponent" | "draw" | null;
        reason: "hp_zero" | "foul" | "opponent_left" | "both_hp_zero";
        playerHp: number;
        opponentHp: number;
      };
      clearAllTimers();

      if (stateRef.current.role === "SPECTATOR") {
        setPlayer((prev) => ({ ...prev, hp: data.playerHp }));
        setOpponent((prev) => (prev ? { ...prev, hp: data.opponentHp } : prev));
        stateRef.current.player.hp = data.playerHp;
        if (stateRef.current.opponent) {
          stateRef.current.opponent.hp = data.opponentHp;
        }

        setPhase("MATCH_FINISHED");
        setMatchWinner(data.winner);
        setMatchFinishReason(data.reason);
        return;
      }

      // ホスト視点の勝者をゲスト視点に反転
      const guestWinner =
        data.winner === "player"
          ? "opponent"
          : data.winner === "opponent"
            ? "player"
            : data.winner;

      // ゲスト視点でのHP同期: playerHpはホスト、opponentHpはゲスト
      setPlayer((prev) => ({ ...prev, hp: data.opponentHp }));
      setOpponent((prev) => (prev ? { ...prev, hp: data.playerHp } : null));
      stateRef.current.player.hp = data.opponentHp;
      if (stateRef.current.opponent) {
        stateRef.current.opponent.hp = data.playerHp;
      }

      setPhase("MATCH_FINISHED");
      setMatchWinner(guestWinner);
      setMatchFinishReason(data.reason || "hp_zero");
      recordMatchResult(guestWinner, data.opponentHp, data.playerHp);
      if (guestWinner === "player") {
        soundManager.playHitGodlike();
      } else if (guestWinner === "opponent") {
        soundManager.playGameOver();
      }
    });

    // Broadcast: round_start
    channel.on("broadcast", { event: "round_start" }, ({ payload }) => {
      const data = payload as RoundStartPayload;
      if (data.initialHp) {
        setInitialHp(data.initialHp as InitialHpOption);
        stateRef.current.initialHp = data.initialHp as InitialHpOption;
      }

      if (data.round === 1) {
        setRoundLogs([]);
        const hpToSet = data.initialHp || stateRef.current.initialHp;
        setPlayer((p) => ({
          ...p,
          hp: hpToSet,
          combo: 0,
          godlikeCombo: 0,
          comboRank: null,
          currentRoundTime: null,
          currentRoundRank: null,
          currentRoundFoul: null,
        }));
        setOpponent((o) =>
          o
            ? {
                ...o,
                hp: hpToSet,
                combo: 0,
                godlikeCombo: 0,
                comboRank: null,
                currentRoundTime: null,
                currentRoundRank: null,
                currentRoundFoul: null,
              }
            : null,
        );
        stateRef.current.player.hp = hpToSet;
        stateRef.current.player.combo = 0;
        stateRef.current.player.godlikeCombo = 0;
        stateRef.current.player.comboRank = null;
        stateRef.current.player.currentRoundTime = null;
        stateRef.current.player.currentRoundRank = null;
        stateRef.current.player.currentRoundFoul = null;
        if (stateRef.current.opponent) {
          stateRef.current.opponent.hp = hpToSet;
          stateRef.current.opponent.combo = 0;
          stateRef.current.opponent.godlikeCombo = 0;
          stateRef.current.opponent.comboRank = null;
          stateRef.current.opponent.currentRoundTime = null;
          stateRef.current.opponent.currentRoundRank = null;
          stateRef.current.opponent.currentRoundFoul = null;
        }
        setRematchRequestedByMe(false);
        rematchRequestedByMeRef.current = false;
        setRematchRequestedByOpponent(false);
        setMatchWinner(null);
        setMatchFinishReason(null);
        setRoundResult(null);
      }

      // Resolve timers may be throttled while a mobile browser is backgrounded.
      // The host's next-round snapshot is authoritative for HP and combo state.
      if (
        data.hostState &&
        data.guestState &&
        stateRef.current.role !== "SPECTATOR"
      ) {
        const localState = stateRef.current.isHost
          ? data.hostState
          : data.guestState;
        const remoteState = stateRef.current.isHost
          ? data.guestState
          : data.hostState;

        setPlayer((prev) => ({ ...prev, ...localState }));
        setOpponent((prev) => (prev ? { ...prev, ...remoteState } : null));
        stateRef.current.player = {
          ...stateRef.current.player,
          ...localState,
        };
        if (stateRef.current.opponent) {
          stateRef.current.opponent = {
            ...stateRef.current.opponent,
            ...remoteState,
          };
        }
      }

      // round > 1 でどちらかのHPがすでに0なら次ラウンドへ進まず決着状態を維持
      if (
        stateRef.current.role !== "SPECTATOR" &&
        data.round > 1 &&
        (stateRef.current.player.hp <= 0 ||
          (stateRef.current.opponent?.hp ?? 1000) <= 0)
      ) {
        clearAllTimers();
        const winner =
          stateRef.current.player.hp <= 0 &&
          (stateRef.current.opponent?.hp ?? 0) <= 0
            ? "draw"
            : stateRef.current.player.hp <= 0
              ? "opponent"
              : "player";
        setPhase("MATCH_FINISHED");
        setMatchWinner(winner);
        setMatchFinishReason("hp_zero");
        return;
      }

      startRoundWithDelay(data.round, data.delay);
    });

    // Broadcast: update_hp (ホストがロビーで初期HPを変更)
    channel.on("broadcast", { event: "update_hp" }, ({ payload }) => {
      const data = payload as {
        initialHp: InitialHpOption;
        timestamp?: number;
      };
      const timestamp = data.timestamp || Date.now();
      if (timestamp >= hpTimestampRef.current && data.initialHp) {
        hpTimestampRef.current = timestamp;
        setInitialHp(data.initialHp);
        stateRef.current.initialHp = data.initialHp;
        setPlayer((p) => ({ ...p, hp: data.initialHp }));
        setOpponent((o) => (o ? { ...o, hp: data.initialHp } : null));
        stateRef.current.player.hp = data.initialHp;
        if (stateRef.current.opponent) {
          stateRef.current.opponent.hp = data.initialHp;
        }
      }
    });

    // Broadcast: reaction (相手のリアクションスタンプ)
    channel.on("broadcast", { event: "reaction" }, ({ payload }) => {
      const reactionPayload = payload as {
        emoji?: unknown;
        role?: unknown;
        senderId?: unknown;
        userName?: unknown;
      } | null;
      const emoji = reactionPayload?.emoji;
      if (!isReactionEmoji(emoji)) return;
      const senderRole = reactionPayload?.role;
      if (
        senderRole !== undefined &&
        senderRole !== "SPECTATOR" &&
        senderRole !== "PLAYER_1" &&
        senderRole !== "PLAYER_2"
      ) {
        return;
      }
      // 受信側でも連打を制限 (改変クライアント対策)
      const now = Date.now();
      for (const [
        senderId,
        lastReceivedAt,
      ] of lastReceivedReactionBySenderRef.current) {
        if (now - lastReceivedAt >= REACTION_COOLDOWN_MS) {
          lastReceivedReactionBySenderRef.current.delete(senderId);
        }
      }
      if (senderRole === "SPECTATOR") {
        const senderId = reactionPayload?.senderId;
        const userName = reactionPayload?.userName;
        if (
          typeof senderId !== "string" ||
          senderId.length === 0 ||
          typeof userName !== "string" ||
          userName.trim().length === 0
        ) {
          return;
        }
        if (senderId === localSessionId) return;
        const lastReceivedAt =
          lastReceivedReactionBySenderRef.current.get(senderId) ?? 0;
        if (now - lastReceivedAt < REACTION_COOLDOWN_MS) return;
        lastReceivedReactionBySenderRef.current.set(senderId, now);

        addSpectatorReaction({
          id: `${senderId}:${now}:${++reactionSequenceRef.current}`,
          senderId,
          emoji,
          userName,
          receivedAt: now,
          horizontalPosition: 10 + Math.random() * 80,
        });
        return;
      }

      const senderId =
        typeof reactionPayload?.senderId === "string"
          ? reactionPayload.senderId
          : "legacy-player";
      const lastReceivedAt =
        lastReceivedReactionBySenderRef.current.get(senderId) ?? 0;
      if (now - lastReceivedAt < REACTION_COOLDOWN_MS) return;
      lastReceivedReactionBySenderRef.current.set(senderId, now);

      setOpponentReaction(emoji);
      if (opponentReactionTimerRef.current)
        clearTimeout(opponentReactionTimerRef.current);
      opponentReactionTimerRef.current = setTimeout(
        () => setOpponentReaction(null),
        REACTION_DISPLAY_MS,
      );
    });

    // Broadcast: submit_time
    channel.on("broadcast", { event: "submit_time" }, ({ payload }) => {
      if (stateRef.current.role === "SPECTATOR") return;
      const data = payload as SubmitTimePayload;
      if (data.round !== stateRef.current.currentRound) {
        return;
      }
      setOpponent((prev) => {
        if (!prev) return null;
        const nextState = {
          ...prev,
          currentRoundTime: data.time,
          currentRoundRank: data.rank,
        };
        if (stateRef.current.opponent) {
          stateRef.current.opponent.currentRoundTime = data.time;
          stateRef.current.opponent.currentRoundRank = data.rank;
        }
        evaluateRoundIfReady(stateRef.current.player, nextState);
        return nextState;
      });
    });

    // Broadcast: foul
    channel.on("broadcast", { event: "foul" }, ({ payload }) => {
      if (stateRef.current.role === "SPECTATOR") return;
      const data = payload as FoulPayload;
      if (data.round !== stateRef.current.currentRound) {
        return;
      }
      setOpponent((prev) => {
        if (!prev) return null;
        const nextState = {
          ...prev,
          currentRoundFoul: data.reason,
        };
        if (stateRef.current.opponent) {
          stateRef.current.opponent.currentRoundFoul = data.reason;
        }
        evaluateRoundIfReady(stateRef.current.player, nextState);
        return nextState;
      });
    });

    // Broadcast: device_warning_open (ホスト→ゲスト)
    channel.on("broadcast", { event: "device_warning_open" }, () => {
      if (stateRef.current.isHost) return;
      setPhase("DEVICE_WARNING");
    });

    // Broadcast: device_warning_accept
    channel.on("broadcast", { event: "device_warning_accept" }, () => {
      setDeviceWarningAcceptedByOpponent(true);
    });

    // Broadcast: rematch_request
    channel.on("broadcast", { event: "rematch_request" }, () => {
      setRematchRequestedByOpponent(true);
      if (rematchRequestedByMeRef.current) {
        if (stateRef.current.isHost) {
          resetForRematch();
        } else {
          if (channelRef.current) {
            channelRef.current.send({
              type: "broadcast",
              event: "rematch_accept",
              payload: {},
            });
          }
          resetForRematch();
        }
      }
    });

    // Broadcast: rematch_accept
    channel.on("broadcast", { event: "rematch_accept" }, () => {
      if (stateRef.current.phase === "MATCH_FINISHED") {
        resetForRematch();
      }
    });

    // Broadcast: return_to_lobby (相手がロビーに戻った通知)
    channel.on("broadcast", { event: "return_to_lobby" }, () => {
      setOpponentReturnedToLobby(true);
      setRematchRequestedByOpponent(false);
    });

    // Broadcast: request_lobby_state (ゲスト入室時にホストへ設定を要求)
    channel.on("broadcast", { event: "request_lobby_state" }, () => {
      if (stateRef.current.isHost && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "update_hp",
          payload: {
            initialHp: stateRef.current.initialHp,
            timestamp: hpTimestampRef.current || Date.now(),
          },
        });
      }
    });

    channel.on("broadcast", { event: "snapshot_updated" }, () => {
      const now = Date.now();
      if (now - lastSnapshotRefreshAtRef.current < 250) return;
      lastSnapshotRefreshAtRef.current = now;
      void refreshRoomRef.current?.();
    });

    channel.on("broadcast", { event: "room_dissolved" }, () => {
      void refreshRoomRef.current?.();
    });

    // チャンネル購読
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        const payload: PresencePayload = {
          userId: localUserId,
          sessionId: localSessionId,
          userName: localUserName,
          device: detectedDevice,
          isReady: role !== "SPECTATOR",
          initialHp: stateRef.current.initialHp,
          isHost: stateRef.current.isHost,
          role,
          hpTimestamp: hpTimestampRef.current || Date.now(),
        };
        channel.track(payload);

        // ゲスト入室時はホストへ現在の最新ロビー設定を問い合わせる
        if (!stateRef.current.isHost) {
          channel.send({
            type: "broadcast",
            event: "request_lobby_state",
            payload: {},
          });
        }
      }
    });

    return () => {
      clearAllTimers();
      if (hostPromotionTimerRef.current) {
        clearTimeout(hostPromotionTimerRef.current);
        hostPromotionTimerRef.current = null;
      }
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [
    roomId,
    localSessionId,
    localUserId,
    localUserName,
    detectedDevice,
    initialIsHost,
    role,
    sessionCredentials,
    clearAllTimers,
    startRoundWithDelay,
    evaluateRoundIfReady,
    resetForRematch,
    resetToLobbyState,
    promoteSelfToHost,
    recordMatchResult,
    supabase,
    addSpectatorReaction,
  ]);

  // 両者がデバイス警告を承諾したときの自動遷移
  useEffect(() => {
    if (
      phase === "DEVICE_WARNING" &&
      deviceWarningAcceptedByMe &&
      deviceWarningAcceptedByOpponent
    ) {
      if (isHost) {
        triggerNextRound(1);
      }
    }
  }, [
    phase,
    deviceWarningAcceptedByMe,
    deviceWarningAcceptedByOpponent,
    isHost,
    triggerNextRound,
  ]);

  return {
    roomId,
    isHost,
    isOwner,
    role,
    participants,
    spectatorCount: participants.filter(
      (participant) =>
        participant.role === "SPECTATOR" && participant.connected,
    ).length,
    queuePosition:
      role === "SPECTATOR"
        ? participants
            .filter(
              (participant) =>
                participant.role === "SPECTATOR" && participant.connected,
            )
            .sort((left, right) => left.joinOrder - right.joinOrder)
            .findIndex(
              (participant) => participant.sessionId === localSessionId,
            ) + 1
        : 0,
    roomEnded,
    sessionExpired,
    promotedToHost,
    phase,
    setPhase,
    initialHp,
    changeInitialHp,
    myReaction,
    opponentReaction,
    spectatorReaction,
    sendReaction,
    currentRound,
    countdown,
    player,
    opponent,
    hasDeviceMismatch,
    deviceWarningAcceptedByMe,
    deviceWarningAcceptedByOpponent,
    roundResult,
    matchWinner,
    matchFinishReason,
    rematchRequestedByMe,
    rematchRequestedByOpponent,
    opponentReturnedToLobby,
    handleTap,
    startMatch,
    acceptDeviceWarning,
    requestRematch,
    returnToLobby,
    leaveRoom,
    dissolveRoom,
    rotateToSpectator,
    roundLogs,
  };
};
