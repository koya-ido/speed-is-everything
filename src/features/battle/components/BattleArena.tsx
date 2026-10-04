"use client";

import { BattleMatchResultModal } from "@/features/battle/components/BattleMatchResultModal";
import { BattleRoundLogModal } from "@/features/battle/components/BattleRoundLogModal";
import { BattleSessionExpiredModal } from "@/features/battle/components/BattleSessionExpiredModal";
import { RoomDissolveConfirmationModal } from "@/features/battle/components/RoomDissolveConfirmationModal";
import { useBattleRoom } from "@/features/battle/hooks/useBattleRoom";
import {
  BattleRoomRole,
  getInitialHpTier,
  INITIAL_HP_MAX,
  INITIAL_HP_MIN,
  INITIAL_HP_STEP,
  InitialHpOption,
  REACTION_DISPLAY_MS,
  REACTION_EMOJIS,
} from "@/features/battle/types";
import {
  calculateComboBonus,
  getActiveComboMultiplier,
} from "@/features/battle/utils/battleLogic";
import {
  getActivePlayerNames,
  getBattleLogPlayerNames,
} from "@/features/battle/utils/roomPresentation";
import {
  ParticleCanvas,
  ParticleCanvasHandle,
  soundManager,
} from "@/features/game";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Crown,
  Flame,
  LogOut,
  Monitor,
  Smartphone,
  Swords,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

type AnimStage =
  | "STOP" // 1 & 2. 相手(遅い方)のタイム大表示 + 自分(速い方)のタイムを「-〇〇.〇」で上に表示
  | "SUBTRACT" // 3. 減算アニメーション (数値減少: slowerTime -> baseDiff) (0.8s)
  | "RANK" // 4 & 5. ×ランクボーナス表示 + 乗算アニメーション (baseDiff -> rankDamage) (0.8s)
  | "COMBO" // 6 & 7. ×コンボボーナス表示 + 乗算アニメーション (rankDamage -> finalDamage) (0.8s)
  | "POP" // 8. 最終ダメージ値のサイズアップ・サイズダウン(元に戻す) (0.4s)
  | "FLY" // 8. 相手のHPバーに飛ばす (0.5s)
  | "IMPACT"; // 着弾・爆発・HP減少・被弾シェイク

type BattleArenaProps = {
  roomId: string;
  isHost: boolean;
  initialHp?: InitialHpOption;
  userId?: string;
  userName?: string;
  sessionId: string;
  sessionToken: string;
  role: BattleRoomRole;
  isOwner: boolean;
  onExit?: () => void;
};

const VsBadge = ({ className = "" }: { className?: string }) => (
  <div
    className={`w-8 h-8 md:w-9 md:h-9 rounded-full bg-gray-950/90 border border-white/10 shadow-[0_0_12px_rgba(0,0,0,0.7)] backdrop-blur-md flex items-center justify-center shrink-0 ${className}`}
  >
    <span className="font-cyber font-black text-xs md:text-sm tracking-tight text-transparent bg-clip-text bg-linear-to-r from-[#00f3ff]/90 to-[#ff0055]/90 select-none leading-none inline-flex items-center justify-center">
      VS
    </span>
  </div>
);

export const BattleArena = ({
  roomId,
  isHost: initialIsHost,
  initialHp: requestedHp = 1500,
  userId,
  userName,
  sessionId,
  sessionToken,
  role: initialRole,
  isOwner: initialIsOwner,
  onExit,
}: BattleArenaProps) => {
  const t = useTranslations("Battle");
  const {
    isHost,
    role,
    participants,
    spectatorCount,
    queuePosition,
    roomEnded,
    sessionExpired,
    promotedToHost,
    phase,
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
  } = useBattleRoom({
    roomId,
    isHost: initialIsHost,
    initialHp: requestedHp,
    userId,
    userName,
    sessionId,
    sessionToken,
    role: initialRole,
    isOwner: initialIsOwner,
  });
  const activePlayerNames = getActivePlayerNames(participants);
  const battleLogPlayerNames = getBattleLogPlayerNames(participants);
  const leftCardName =
    role === "SPECTATOR" ? activePlayerNames.playerOneName : player.userName;
  const rightCardName =
    role === "SPECTATOR"
      ? activePlayerNames.playerTwoName
      : (opponent?.userName ?? null);
  const warningPlayers =
    role === "SPECTATOR"
      ? (["PLAYER_1", "PLAYER_2"] as const).map((playerRole) => {
          const participant = participants.find(
            (item) => item.role === playerRole,
          );
          return {
            name: participant?.userName ?? t("log_opponent"),
            device: participant?.device ?? "desktop",
          };
        })
      : [
          { name: player.userName, device: player.device },
          {
            name: opponent?.userName ?? t("log_opponent"),
            device: opponent?.device ?? "desktop",
          },
        ];
  const connectedSpectators = participants
    .filter(
      (participant) =>
        participant.role === "SPECTATOR" && participant.connected,
    )
    .sort((left, right) => left.joinOrder - right.joinOrder);
  const latestReactionBySpectator = new Map(
    spectatorReaction.map((reaction) => [reaction.senderId, reaction]),
  );

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [spectatorAccordionOpen, setSpectatorAccordionOpen] = useState(false);
  const [reactionButtonsDisabled, setReactionButtonsDisabled] = useState(false);
  const [showBattleLog, setShowBattleLog] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [roomActionError, setRoomActionError] = useState<string | null>(null);
  const [showDissolveConfirmation, setShowDissolveConfirmation] =
    useState(false);
  const [isDissolvingRoom, setIsDissolvingRoom] = useState(false);
  const [animStage, setAnimStage] = useState<AnimStage>("STOP");
  const [activeStep, setActiveStep] = useState<number>(0);
  const [displayMainNum, setDisplayMainNum] = useState<number>(0);
  const [displaySubNum, setDisplaySubNum] = useState<number>(0);
  const [showSubNum, setShowSubNum] = useState<boolean>(false);
  const [showRankBonus, setShowRankBonus] = useState<boolean>(false);
  const [showComboBonus, setShowComboBonus] = useState<boolean>(false);
  const [isPopping, setIsPopping] = useState<boolean>(false);
  const [popKey, setPopKey] = useState<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const reactionCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const handleReactionClick = (emoji: (typeof REACTION_EMOJIS)[number]) => {
    setReactionButtonsDisabled(true);
    sendReaction(emoji);
    if (reactionCooldownTimerRef.current) {
      clearTimeout(reactionCooldownTimerRef.current);
    }

    reactionCooldownTimerRef.current = setTimeout(() => {
      setReactionButtonsDisabled(false);
      reactionCooldownTimerRef.current = null;
    }, REACTION_DISPLAY_MS);
  };

  useEffect(
    () => () => {
      if (reactionCooldownTimerRef.current) {
        clearTimeout(reactionCooldownTimerRef.current);
      }
    },
    [],
  );
  useEffect(() => {
    // 音量設定は外部の singleton が所有するため、マウント時に UI state へ同期する。
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 外部音量設定を初回表示へ同期するため
    setIsMuted(soundManager.isMuted);
  }, []);
  // HOST側初期HPのローカル選択状態（連打時も即時UI反映し、400msデバウンスで確定送信）
  const [selectedHp, setSelectedHp] = useState<InitialHpOption>(initialHp);
  const displayedInitialHp = isHost ? selectedHp : initialHp;
  const initialHpTextColor =
    displayedInitialHp >= 2500
      ? "text-[#ffd700]"
      : displayedInitialHp >= 1500
        ? "text-[#ff64ff]"
        : "text-[#00f3ff]";
  const initialHpAccentColor =
    displayedInitialHp >= 2500
      ? "accent-[#ffd700]"
      : displayedInitialHp >= 1500
        ? "accent-[#ff64ff]"
        : "accent-[#00f3ff]";

  // 自身が確定送信した値（この値による initialHp 変更ではスライダーを巻き戻さない）
  const committedHpRef = useRef<number | null>(null);

  // 外部からの initialHp 変更に追従
  useEffect(() => {
    if (committedHpRef.current === initialHp) {
      committedHpRef.current = null;
      return;
    }
    setSelectedHp(initialHp);
  }, [initialHp]);

  // ホスト操作時のデバウンス送信（連打が落ち着いた400ms後に反映）
  useEffect(() => {
    if (!isHost) return;
    if (selectedHp === initialHp) return;

    const timer = setTimeout(() => {
      committedHpRef.current = selectedHp;
      changeInitialHp(selectedHp);
    }, 400);

    return () => clearTimeout(timer);
  }, [selectedHp, initialHp, isHost, changeInitialHp]);

  const handleStartMatch = () => {
    soundManager.unlock();
    soundManager.playBgm();
    if (isHost && selectedHp !== initialHp) {
      changeInitialHp(selectedHp);
    }
    startMatch();
  };

  const particleCanvasRef = useRef<ParticleCanvasHandle>(null);
  const touchAreaRef = useRef<HTMLDivElement>(null);
  const progressRingRef = useRef<SVGCircleElement>(null);

  const copyToClipboard = async (type: "link" | "code") => {
    try {
      const textToCopy =
        type === "link" && typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}?room=${roomId}&hp=${isHost ? selectedHp : initialHp}`
          : roomId;
      await navigator.clipboard.writeText(textToCopy);
      if (type === "link") {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    } catch {}
  };

  const handleExit = () => {
    if (!roomEnded && !sessionExpired) leaveRoom();
    onExit?.();
  };

  const handleDissolveRoom = async () => {
    setRoomActionError(null);
    setIsDissolvingRoom(true);
    try {
      await dissolveRoom();
      setShowDissolveConfirmation(false);
      onExit?.();
    } catch (error) {
      console.error("Unable to dissolve the battle room:", error);
      setRoomActionError(t("room_request_failed"));
    } finally {
      setIsDissolvingRoom(false);
    }
  };

  const handleRotateToSpectator = async () => {
    setRoomActionError(null);
    try {
      await rotateToSpectator();
    } catch (error) {
      console.error("Unable to join the spectator queue:", error);
      setRoomActionError(t("room_request_failed"));
    }
  };

  // 入力イベント実行共通処理（GameCanvas完全準拠）
  const triggerUserAction = useCallback(
    (e: React.SyntheticEvent | KeyboardEvent) => {
      if ("preventDefault" in e && e.type !== "keydown") {
        e.preventDefault();
      }

      // 防御: 自動化スクリプト等による合成イベント (dispatchEvent) を拒否
      const rawEvent = "nativeEvent" in e ? e.nativeEvent : e;
      if (
        process.env.NODE_ENV !== "test" &&
        typeof window !== "undefined" &&
        "isTrusted" in rawEvent &&
        !rawEvent.isTrusted
      ) {
        return;
      }

      soundManager.unlock();

      if (phase !== "WAITING" && phase !== "ACTION") return;

      // 既に自分のタイムが記録済みの場合はガード
      if (
        player.currentRoundTime !== null ||
        player.currentRoundFoul !== null
      ) {
        return;
      }

      let clickX: number | undefined;
      let clickY: number | undefined;
      if ("clientX" in e && "clientY" in e) {
        const mouseEv = e as unknown as MouseEvent;
        if (typeof mouseEv.clientX === "number" && mouseEv.clientX > 0) {
          clickX = mouseEv.clientX;
          clickY = mouseEv.clientY;
        }
      }

      const res = handleTap();

      // パーティクル演出 (タップ時に即座に発生)
      if (res && res.type === "SUCCESS") {
        if (res.rank === "GODLIKE") {
          particleCanvasRef.current?.burst("GODLIKE", clickX, clickY);
        } else if (res.rank === "EXCELLENT") {
          particleCanvasRef.current?.burst("EXCELLENT", clickX, clickY);
        }
      }
    },
    [phase, player.currentRoundTime, player.currentRoundFoul, handleTap],
  );

  // キーボード操作対応 (PC: Spaceキー GameCanvas準拠)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        if (phase === "WAITING" || phase === "ACTION") {
          e.preventDefault();
          triggerUserAction(e);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, triggerUserAction]);

  // スクロール制御は画面状態に合わせて切り替える
  useEffect(() => {
    document.body.classList.toggle("game-active", phase !== "LOBBY");
  }, [phase]);

  // マウント時のオーディオプリロード
  useEffect(() => {
    soundManager.preloadAll();
    return () => {
      document.body.classList.remove("game-active");
      soundManager.stopBgm();
      soundManager.stopTick();
    };
  }, []);

  // ACTION切り替え時にパーティクルをクリア
  useEffect(() => {
    if (phase === "ACTION") {
      particleCanvasRef.current?.clear();
    }
  }, [phase]);

  // バトルモードのBGM再生管理 (対戦中ループ再生)
  useEffect(() => {
    if (
      phase !== "LOBBY" &&
      phase !== "DEVICE_WARNING" &&
      phase !== "MATCH_FINISHED"
    ) {
      soundManager.playBgm();
    } else if (phase === "MATCH_FINISHED" || phase === "LOBBY") {
      soundManager.stopBgm();
    }
  }, [phase]);

  // 表示用コンボ（アニメーション着弾前はラウンド開始前のコンボを表示し、着弾時に更新）
  const displayPlayerCombo =
    phase === "RESOLVING" &&
    activeStep < 9 &&
    roundResult?.playerComboBefore !== undefined
      ? roundResult.playerComboBefore
      : player.combo;
  const displayOpponentCombo =
    phase === "RESOLVING" &&
    activeStep < 9 &&
    roundResult?.opponentComboBefore !== undefined
      ? roundResult.opponentComboBefore
      : opponent?.combo || 0;

  const displayPlayerGodlikeCombo =
    phase === "RESOLVING" &&
    activeStep < 9 &&
    roundResult?.playerGodlikeComboBefore !== undefined
      ? roundResult.playerGodlikeComboBefore
      : player.godlikeCombo;
  const displayOpponentGodlikeCombo =
    phase === "RESOLVING" &&
    activeStep < 9 &&
    roundResult?.opponentGodlikeComboBefore !== undefined
      ? roundResult.opponentGodlikeComboBefore
      : opponent?.godlikeCombo || 0;

  // コンボ倍率（HPバー上部のコンボバッジ用: 連続勝利によるコンボボーナス倍率）
  const playerActiveCombo = getActiveComboMultiplier(
    displayPlayerCombo,
    displayPlayerGodlikeCombo,
  );
  const playerMultiplier = playerActiveCombo.multiplier;
  const effectivePlayerComboRank = playerActiveCombo.rankType;

  const opponentActiveCombo = opponent
    ? getActiveComboMultiplier(
        displayOpponentCombo,
        displayOpponentGodlikeCombo,
      )
    : { multiplier: 1.0, rankType: null };
  const opponentMultiplier = opponentActiveCombo.multiplier;
  const effectiveOpponentComboRank = opponentActiveCombo.rankType;

  const playerRank = player.currentRoundRank || "NORMAL";
  const opponentRank = opponent?.currentRoundRank || "NORMAL";

  // ダメージ計算演出用ステータス（RESOLVINGフェーズ）
  const pTime = player.currentRoundTime;
  const oTime = opponent?.currentRoundTime;
  const isWinnerPlayer = roundResult?.winner === "player";
  const isWinnerOpponent = roundResult?.winner === "opponent";
  const isDraw = roundResult?.winner === "draw";

  // 勝者のランク＆基本倍率
  const winnerRank = isWinnerPlayer
    ? playerRank
    : isWinnerOpponent
      ? opponentRank
      : "NORMAL";
  const winnerRankBaseMult =
    winnerRank === "GODLIKE" ? 3.0 : winnerRank === "EXCELLENT" ? 2.0 : 1.0;

  // 勝者のコンボ＆コンボ倍率（そのラウンドの攻撃に実際に適用されたコンボ数）
  const appliedWinnerCombo =
    roundResult?.appliedCombo !== undefined
      ? roundResult.appliedCombo
      : isWinnerPlayer
        ? (roundResult?.playerComboBefore ?? player.combo)
        : isWinnerOpponent
          ? (roundResult?.opponentComboBefore ?? (opponent?.combo || 0))
          : 0;
  const appliedWinnerGodlikeCombo = isWinnerPlayer
    ? (roundResult?.playerGodlikeComboBefore ?? player.godlikeCombo)
    : isWinnerOpponent
      ? (roundResult?.opponentGodlikeComboBefore ??
        (opponent?.godlikeCombo || 0))
      : 0;

  const winnerBonusCalc = calculateComboBonus(
    winnerRank,
    appliedWinnerCombo,
    appliedWinnerGodlikeCombo,
  );
  const winnerComboMult =
    roundResult?.appliedComboMult ?? winnerBonusCalc.comboMultiplier;
  const winnerBonusType =
    roundResult?.appliedBonusType ?? winnerBonusCalc.bonusType;

  // 与ダメ/被ダメ
  const totalDamage = isWinnerPlayer
    ? roundResult?.opponentDamageTaken || 0
    : isWinnerOpponent
      ? roundResult?.playerDamageTaken || 0
      : 0;

  const cappedWinnerCombo = Math.max(
    0,
    Math.min(5, Math.floor(appliedWinnerCombo)),
  );
  const hasRankBonus = winnerRankBaseMult > 1.0; // EXCELLENT (2.0) または GODLIKE (3.0)
  const hasComboBonus = cappedWinnerCombo > 0 && winnerComboMult > 1.0; // 実際にコンボボーナス適用回数が1以上の時のみ

  // 1 & 2. 相手(遅い方)のタイムを大きく、自分(速い方)のタイムを「-〇〇.〇」で上に表示
  const slowerTime = isWinnerPlayer
    ? (oTime ?? 0)
    : isWinnerOpponent
      ? (pTime ?? 0)
      : Math.max(pTime ?? 0, oTime ?? 0);
  const fasterTime = isWinnerPlayer
    ? (pTime ?? 0)
    : isWinnerOpponent
      ? (oTime ?? 0)
      : Math.min(pTime ?? 0, oTime ?? 0);

  const baseDiff = Math.max(0, Math.round((slowerTime - fasterTime) * 10) / 10);
  const rankDamage = Math.max(
    0,
    Math.round(baseDiff * winnerRankBaseMult * 10) / 10,
  );
  const finalDamage = totalDamage;
  const damageCalculationPlayerName =
    role === "SPECTATOR"
      ? isWinnerPlayer
        ? battleLogPlayerNames.playerName
        : battleLogPlayerNames.opponentName
      : isWinnerPlayer
        ? t("match_you")
        : opponent?.userName;

  // ダメージ計算アニメーション pop-bounce トリガー
  const triggerPopBounce = useCallback(() => {
    setPopKey((k) => k + 1);
    setIsPopping(true);
    setTimeout(() => {
      setIsPopping(false);
    }, 400);
  }, []);

  // 滑らかな数値アニメーション関数 (減算・乗算カウンター)
  const animateStepNumbers = useCallback(
    (
      main: { from: number; to: number } | null,
      sub: { from: number; to: number } | null,
      durationMs: number,
      onComplete?: () => void,
    ) => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      const startTime = performance.now();
      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        const ease = 1 - Math.pow(1 - progress, 2);
        if (main) {
          const currentMain = main.from + (main.to - main.from) * ease;
          setDisplayMainNum(currentMain);
        }
        if (sub) {
          const currentSub = sub.from + (sub.to - sub.from) * ease;
          setDisplaySubNum(currentSub);
        }

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          if (main) setDisplayMainNum(main.to);
          if (sub) setDisplaySubNum(sub.to);
          onComplete?.();
        }
      };
      animFrameRef.current = requestAnimationFrame(step);
    },
    [],
  );

  // 1~8ステップ アニメーションシーケンサー
  useEffect(() => {
    if (phase !== "RESOLVING") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ラウンド演出 state をフェーズ変更と同じ effect でリセットするため
      setActiveStep(0);
      setAnimStage("STOP");
      setShowSubNum(false);
      setShowRankBonus(false);
      setShowComboBonus(false);
      setIsPopping(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    if (player.currentRoundFoul || opponent?.currentRoundFoul) {
      setActiveStep(9);
      setAnimStage("IMPACT");
      return;
    }

    if (isDraw) {
      setActiveStep(1);
      setAnimStage("STOP");
      setDisplayMainNum(slowerTime);
      setShowSubNum(false);
      setShowRankBonus(false);
      setShowComboBonus(false);
      const timer = setTimeout(() => {
        setActiveStep(3);
        setAnimStage("SUBTRACT");
        animateStepNumbers({ from: slowerTime, to: 0 }, null, 1000, () => {
          soundManager.playHitNormal();
        });
      }, 800);
      return () => clearTimeout(timer);
    }

    const timeouts: NodeJS.Timeout[] = [];
    let currentTime = 0;

    // 1. 相手の反応速度を大きく表示: 1s
    setActiveStep(1);
    setAnimStage("STOP");
    setDisplayMainNum(slowerTime);
    setDisplaySubNum(fasterTime);
    setShowSubNum(false);
    setShowRankBonus(false);
    setShowComboBonus(false);
    setIsPopping(false);
    currentTime += 1000;

    // 2. 自分の反応速度を1.の上に -{反応速度} で表示: 1s
    timeouts.push(
      setTimeout(() => {
        setActiveStep(2);
        setShowSubNum(true);
        setDisplaySubNum(fasterTime);
      }, currentTime),
    );
    currentTime += 1000;

    // 3. 1.を減算(数値が減っていく)アニメーションをしてダメージ値に変換する。
    //    同時に、2.も0に向けてアニメーションをする。
    //    ダメージ値になるときにpop-bounceを再生する: 1.5s
    timeouts.push(
      setTimeout(() => {
        setActiveStep(3);
        setAnimStage("SUBTRACT");
        animateStepNumbers(
          { from: slowerTime, to: baseDiff },
          { from: fasterTime, to: 0 },
          1100,
          () => {
            triggerPopBounce();
            soundManager.playHitNormal();
          },
        );
      }, currentTime),
    );
    currentTime += 1500;

    let currentDamage = baseDiff;

    // 4. 2.を非表示にし、リアクションタイムランクボーナスがあれば、3.の右に ×{n} を表示: 1s
    if (hasRankBonus) {
      timeouts.push(
        setTimeout(() => {
          setActiveStep(4);
          setAnimStage("RANK");
          setShowSubNum(false);
          setShowRankBonus(true);
          if (winnerRank === "GODLIKE") {
            soundManager.playHitGodlike();
          } else {
            soundManager.playHitExcellent();
          }
        }, currentTime),
      );
      currentTime += 1000;

      // 5. 3.に乗算(数値が増えていく)アニメーションをして、
      //    リアクションタイムランクボーナス反映後ダメージ値に変換する。
      //    ダメージ値になるときにpop-bounceを再生する: 1.5s
      timeouts.push(
        setTimeout(() => {
          setActiveStep(5);
          animateStepNumbers(
            { from: baseDiff, to: rankDamage },
            null,
            1100,
            () => {
              triggerPopBounce();
              if (winnerRank === "GODLIKE") {
                soundManager.playHitGodlike();
              } else {
                soundManager.playHitExcellent();
              }
            },
          );
        }, currentTime),
      );
      currentTime += 1500;
      currentDamage = rankDamage;
    } else {
      timeouts.push(
        setTimeout(() => {
          setShowSubNum(false);
        }, currentTime),
      );
    }

    // 6. 4.を非表示にし、コンボボーナスがあれば、5.の右に ×{n} を表示: 1s
    if (hasComboBonus) {
      timeouts.push(
        setTimeout(() => {
          setActiveStep(6);
          setAnimStage("COMBO");
          setShowRankBonus(false);
          setShowComboBonus(true);
          soundManager.playHitGodlike();
        }, currentTime),
      );
      currentTime += 1000;

      // 7. 5.に乗算(数値が増えていく)アニメーションをして、最終ダメージ値に変換し、6を非表示にする。
      //    最終ダメージ値になるときにpop-bounceを再生する: 1.5s
      const fromVal = currentDamage;
      timeouts.push(
        setTimeout(() => {
          setActiveStep(7);
          animateStepNumbers(
            { from: fromVal, to: finalDamage },
            null,
            1100,
            () => {
              setShowComboBonus(false);
              triggerPopBounce();
              soundManager.playHitGodlike();
            },
          );
        }, currentTime),
      );
      currentTime += 1500;
      currentDamage = finalDamage;
    } else {
      timeouts.push(
        setTimeout(() => {
          setShowRankBonus(false);
        }, currentTime),
      );
    }

    // 8. 最終ダメージ値を相手のHPバーに飛ばす: 0.5s
    timeouts.push(
      setTimeout(() => {
        setActiveStep(8);
        setAnimStage("FLY");
        setShowSubNum(false);
        setShowRankBonus(false);
        setShowComboBonus(false);
        setDisplayMainNum(finalDamage);
        soundManager.playAction();
      }, currentTime),
    );
    currentTime += 500;

    // 着弾・HP減少・被弾振動 (IMPACT)
    timeouts.push(
      setTimeout(() => {
        setActiveStep(9);
        setAnimStage("IMPACT");
        soundManager.playDamage();
      }, currentTime),
    );

    return () => {
      timeouts.forEach(clearTimeout);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    phase,
    player.currentRoundFoul,
    opponent?.currentRoundFoul,
    isDraw,
    slowerTime,
    fasterTime,
    baseDiff,
    rankDamage,
    finalDamage,
    hasRankBonus,
    hasComboBonus,
    winnerRank,
    isWinnerPlayer,
    animateStepNumbers,
    triggerPopBounce,
  ]);

  // ダメージ計算アニメーション中の実効HP (IMPACT着弾前は被弾前のHPを維持)
  const maxHp = initialHp;
  const isImpactOrAfter =
    phase !== "RESOLVING" ||
    animStage === "IMPACT" ||
    activeStep >= 9 ||
    player.currentRoundFoul !== null ||
    opponent?.currentRoundFoul !== null;

  const effectivePlayerHp =
    phase === "RESOLVING" && roundResult
      ? isImpactOrAfter
        ? roundResult.playerNewHp
        : roundResult.playerHpBefore
      : player.hp;

  const effectiveOpponentHp =
    phase === "RESOLVING" && roundResult
      ? isImpactOrAfter
        ? roundResult.opponentNewHp
        : roundResult.opponentHpBefore
      : (opponent?.hp ?? 0);

  const playerHpPercent = Math.max(
    0,
    Math.min(100, (effectivePlayerHp / maxHp) * 100),
  );
  const opponentHpPercent = Math.max(
    0,
    Math.min(100, (effectiveOpponentHp / maxHp) * 100),
  );

  // タップ済み・相手待機中フラグ
  const isPlayerSubmitted =
    player.currentRoundTime != null || player.currentRoundFoul != null;
  const isOpponentSubmitted =
    opponent != null &&
    (opponent.currentRoundTime != null || opponent.currentRoundFoul != null);
  const isWaitingForOpponentInAction =
    phase === "ACTION" && isPlayerSubmitted && !isOpponentSubmitted;

  // 通常ゲーム画面準拠の円形HUD計算
  const circleRadius = 140;
  const circleCircumference = 2 * Math.PI * circleRadius;

  // 画面エフェクトとテキストのスタイル決定
  let bgEffect = "bg-[#050505]";
  let mainActionText = "";
  let textColor = "text-[#00f3ff]";
  let textShadow = "drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]";
  let ringColor = "stroke-[#00f3ff]";
  let ringGlow = "drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]";

  switch (phase) {
    case "COUNTDOWN":
      bgEffect = "bg-[#050505]";
      mainActionText = t("state_ready");
      textColor = "text-[#00f3ff]";
      textShadow = "drop-shadow-[0_0_15px_rgba(0,243,255,0.8)]";
      ringColor = "stroke-[#00f3ff]";
      ringGlow = "drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]";
      break;
    case "WAITING":
      bgEffect = "bg-[#050505] shadow-[inset_0_0_150px_rgba(255,0,0,0.15)]";
      mainActionText = player.currentRoundFoul
        ? t("hud_foul")
        : t("state_waiting");
      textColor = "text-red-500";
      textShadow = "drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]";
      ringColor = "stroke-red-500";
      ringGlow = "drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]";
      break;
    case "ACTION":
      if (isWaitingForOpponentInAction) {
        bgEffect = "bg-[#050505] shadow-[inset_0_0_150px_rgba(0,243,255,0.15)]";
        mainActionText = t("state_waiting");
        textColor = "text-[#00f3ff]";
        textShadow = "drop-shadow-[0_0_15px_rgba(0,243,255,0.8)]";
        ringColor = "stroke-[#00f3ff]";
        ringGlow = "drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]";
      } else {
        bgEffect = "bg-[#050505] shadow-[inset_0_0_200px_rgba(0,255,102,0.3)]";
        mainActionText = t("state_push");
        textColor = "text-[#00ff66]";
        textShadow = "drop-shadow-[0_0_20px_rgba(0,255,102,1)]";
        ringColor = "stroke-[#00ff66]";
        ringGlow = "drop-shadow-[0_0_12px_rgba(0,255,102,0.9)]";
      }
      break;
    case "RESOLVING": {
      const isWinner = roundResult?.winner === "player";
      const isLoser = roundResult?.winner === "opponent";
      if (animStage === "STOP" || animStage === "SUBTRACT") {
        bgEffect = "bg-[#050505]";
        mainActionText = t("state_stop");
        textColor = "text-white";
        textShadow = "drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]";
        ringColor = "stroke-white";
        ringGlow = "drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]";
      } else if (isWinner) {
        if (playerRank === "GODLIKE") {
          bgEffect =
            "bg-[#050505] shadow-[inset_0_0_300px_rgba(255,215,0,0.4)]";
          mainActionText = t("state_round_win");
          textColor = "text-[#ffd700]";
          textShadow = "drop-shadow-[0_0_30px_rgba(255,215,0,1)]";
          ringColor = "stroke-[#ffd700]";
          ringGlow = "drop-shadow-[0_0_20px_rgba(255,215,0,1)]";
        } else if (playerRank === "EXCELLENT") {
          bgEffect =
            "bg-[#050505] shadow-[inset_0_0_200px_rgba(255,100,255,0.3)]";
          mainActionText = t("state_round_win");
          textColor = "text-[#ff64ff]";
          textShadow = "drop-shadow-[0_0_20px_rgba(255,100,255,0.9)]";
          ringColor = "stroke-[#ff64ff]";
          ringGlow = "drop-shadow-[0_0_15px_rgba(255,100,255,0.9)]";
        } else {
          bgEffect =
            "bg-[#050505] shadow-[inset_0_0_150px_rgba(0,243,255,0.15)]";
          mainActionText = t("state_round_win");
          textColor = "text-[#00f3ff]";
          textShadow = "drop-shadow-[0_0_15px_rgba(0,243,255,0.8)]";
          ringColor = "stroke-[#00f3ff]";
          ringGlow = "drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]";
        }
      } else if (isLoser) {
        bgEffect = "bg-[#050505] shadow-[inset_0_0_160px_rgba(255,0,85,0.2)]";
        mainActionText = t("state_round_lose");
        textColor = "text-[#ff0055]";
        textShadow = "drop-shadow-[0_0_20px_rgba(255,0,85,0.9)]";
        ringColor = "stroke-[#ff0055]";
        ringGlow = "drop-shadow-[0_0_12px_rgba(255,0,85,0.9)]";
      } else {
        bgEffect =
          "bg-[#050505] shadow-[inset_0_0_150px_rgba(255,255,255,0.1)]";
        mainActionText = t("state_draw");
        textColor = "text-gray-200";
        textShadow = "drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]";
        ringColor = "stroke-gray-400";
        ringGlow = "drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]";
      }
      break;
    }
    default:
      break;
  }

  if (sessionExpired) {
    return <BattleSessionExpiredModal onReturnToTop={handleExit} />;
  }

  if (roomEnded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#050508] p-6 text-center">
        <div className="glass-panel max-w-lg rounded-3xl border border-[#ff0055]/40 p-8">
          <h1 className="text-xl font-cyber font-bold text-white">
            {t("room_invalid")}
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            {t("room_ended_message")}
          </p>
          <button
            type="button"
            onClick={handleExit}
            className="mt-6 rounded-xl bg-[#00f3ff] px-6 py-3 font-bold text-black"
          >
            {t("room_back_to_lobby")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full ${phase === "LOBBY" ? "min-h-dvh" : "h-screen max-h-screen h-dvh max-h-dvh overflow-hidden touch-none"} ${bgEffect} text-white flex flex-col select-none`}
      style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        // 通常のGameCanvasと同一の測定判定:
        // PC (マウス) は pointerDown で反応
        // Mobile (タッチ) はホールド開始（pointerUpで離した瞬間計測）
        if (e.pointerType === "touch") {
          return;
        }
        triggerUserAction(e);
      }}
      onPointerUp={(e) => {
        // Mobile (タッチ) は指を離した瞬間に高精度計測
        if (e.pointerType !== "touch") return;
        triggerUserAction(e);
      }}
    >
      {isHost && phase === "LOBBY" && (
        <button
          type="button"
          onClick={() => setShowDissolveConfirmation(true)}
          className="fixed left-3 top-3 z-[70] rounded-lg border border-[#ff0055]/50 bg-black/80 px-3 py-2 text-[10px] font-mono text-[#ff6b91] hover:bg-[#ff0055]/15"
        >
          {t("room_dissolve")}
        </button>
      )}
      {isHost && phase === "LOBBY" && showDissolveConfirmation && (
        <RoomDissolveConfirmationModal
          isPending={isDissolvingRoom}
          onCancel={() => setShowDissolveConfirmation(false)}
          onConfirm={() => void handleDissolveRoom()}
        />
      )}
      {roomActionError && (
        <div
          role="alert"
          className="fixed left-1/2 top-14 z-50 -translate-x-1/2 rounded-lg border border-[#ff0055]/40 bg-black/90 px-4 py-2 text-xs text-[#ff6b91]"
        >
          {roomActionError}
        </div>
      )}
      {phase !== "LOBBY" && spectatorReaction.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
          {spectatorReaction.map((reaction) => (
            <span
              key={reaction.id}
              role="img"
              aria-label={`${reaction.userName}: ${t("reaction_aria_label", { emoji: reaction.emoji })}`}
              className="fixed bottom-16 text-3xl opacity-50 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
              style={{
                left: `${reaction.horizontalPosition}%`,
                animation: "spectator-stamp-float 4000ms linear forwards",
              }}
            >
              {reaction.emoji}
            </span>
          ))}
        </div>
      )}
      {phase !== "LOBBY" && role === "SPECTATOR" && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2">
          <div className="rounded-full border border-[#00f3ff]/25 bg-black/70 px-4 py-1.5 text-center text-xs font-mono text-[#00f3ff]/75">
            {t("spectator_watching", { position: queuePosition })}
          </div>
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-gray-700/70 bg-black/75 px-2 py-1">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={t("reaction_aria_label", { emoji })}
                disabled={reactionButtonsDisabled}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onClick={() => handleReactionClick(emoji)}
                className="h-8 w-8 rounded-full text-lg text-white/75 hover:bg-[#00f3ff]/15 focus-visible:outline-2 focus-visible:outline-[#00f3ff] disabled:opacity-40"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
      <style>{`
        @keyframes spectator-stamp-float {
          0% { transform: translate(-50%, 0); opacity: 0.5; }
          80% { transform: translate(-50%, -100vh); opacity: 0.5; }
          100% { transform: translate(-50%, -100vh); opacity: 0; }
        }
        @keyframes spectator-stamp-pop {
          0% { transform: translateY(65%) scale(0.65); opacity: 0; }
          70% { transform: translateY(-10%) scale(1.15); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes spectator-stamp-lobby {
          0% { transform: translateY(65%) scale(0.65); opacity: 0; }
          12% { transform: translateY(-10%) scale(1.15); opacity: 1; }
          18% { transform: translateY(0) scale(1); opacity: 1; }
          82% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-8%) scale(0.96); opacity: 0; }
        }
        @keyframes game-shake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-10px, 10px) rotate(-1deg); }
          50% { transform: translate(10px, -10px) rotate(1deg); }
          75% { transform: translate(-10px, -10px) rotate(0deg); }
        }
        @keyframes ripple-out {
          0% { transform: scale(1); opacity: 0.8; border-width: 6px; }
          100% { transform: scale(1.6); opacity: 0; border-width: 1px; }
        }
        @keyframes ripple-in {
          0% { transform: scale(1); opacity: 0.8; border-width: 6px; }
          100% { transform: scale(0.6); opacity: 0; border-width: 1px; }
        }
        @keyframes godlike-pop {
          0% { transform: translate(-50%, -50%) scale(0.3) rotate(-8deg); opacity: 0; filter: blur(10px) brightness(2.5); }
          25% { transform: translate(-50%, -50%) scale(1.35) rotate(3deg); opacity: 1; filter: blur(0px) brightness(2); }
          45% { transform: translate(-50%, -50%) scale(1.1) rotate(0deg); opacity: 1; filter: brightness(1.3); }
          80% { transform: translate(-50%, -50%) scale(1.1) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; filter: blur(8px); }
        }
        @keyframes excellent-pop {
          0% { transform: translate(-50%, -50%) scale(0.4) rotate(6deg); opacity: 0; filter: blur(8px) brightness(2); }
          25% { transform: translate(-50%, -50%) scale(1.25) rotate(-2deg); opacity: 1; filter: blur(0px) brightness(1.7); }
          45% { transform: translate(-50%, -50%) scale(1.05) rotate(0deg); opacity: 1; filter: blur(0px) brightness(1.2); }
          80% { transform: translate(-50%, -50%) scale(1.05) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; filter: blur(6px); }
        }
        .effect-shake {
          animation: game-shake 0.1s ease-in-out 4;
        }
        .effect-ripple-out {
          animation: ripple-out 0.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
        .effect-ripple-in {
          animation: ripple-in 0.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
        @keyframes attack-fly-to-opponent {
          0% {
            opacity: 0;
            left: 50%;
            top: 100px;
            transform: translate(-50%, -50%) scale(0.3) rotate(-20deg);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.4) rotate(-20deg);
          }
          85% {
            opacity: 1;
            left: 80%;
            top: 36px;
            transform: translate(-50%, -50%) scale(1.6) rotate(-20deg);
          }
          100% {
            opacity: 0;
            left: 84%;
            top: 36px;
            transform: translate(-50%, -50%) scale(2.2) rotate(-20deg);
          }
        }
        @media (min-width: 768px) {
          @keyframes attack-fly-to-opponent {
            0% {
              opacity: 0;
              left: 50%;
              top: 125px;
              transform: translate(-50%, -50%) scale(0.3) rotate(-20deg);
            }
            20% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1.4) rotate(-20deg);
            }
            85% {
              opacity: 1;
              left: 80%;
              top: 36px;
              transform: translate(-50%, -50%) scale(1.6) rotate(-20deg);
            }
            100% {
              opacity: 0;
              left: 84%;
              top: 36px;
              transform: translate(-50%, -50%) scale(2.2) rotate(-20deg);
            }
          }
        }
        @keyframes attack-opponent-to-player {
          0% {
            opacity: 0;
            left: 50%;
            top: 100px;
            transform: translate(-50%, -50%) scale(0.3) rotate(20deg);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.4) rotate(20deg);
          }
          85% {
            opacity: 1;
            left: 20%;
            top: 36px;
            transform: translate(-50%, -50%) scale(1.6) rotate(20deg);
          }
          100% {
            opacity: 0;
            left: 16%;
            top: 36px;
            transform: translate(-50%, -50%) scale(2.2) rotate(20deg);
          }
        }
        @media (min-width: 768px) {
          @keyframes attack-opponent-to-player {
            0% {
              opacity: 0;
              left: 50%;
              top: 125px;
              transform: translate(-50%, -50%) scale(0.3) rotate(20deg);
            }
            20% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1.4) rotate(20deg);
            }
            85% {
              opacity: 1;
              left: 20%;
              top: 36px;
              transform: translate(-50%, -50%) scale(1.6) rotate(20deg);
            }
            100% {
              opacity: 0;
              left: 16%;
              top: 36px;
              transform: translate(-50%, -50%) scale(2.2) rotate(20deg);
            }
          }
        }
        @keyframes pad-number-pop {
          0% { transform: scale(0.65); filter: brightness(2.2); }
          50% { transform: scale(1.3); filter: brightness(2.5); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        @keyframes pop-bounce {
          0% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.35); filter: brightness(2.2); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        @keyframes impact-burst {
          0% {
            opacity: 0;
            transform: scale(0.2);
          }
          30% {
            opacity: 1;
            transform: scale(1.5);
          }
          100% {
            opacity: 0;
            transform: scale(2.6);
          }
        }
        @keyframes hp-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px) rotate(-1deg); }
          40% { transform: translateX(6px) rotate(1deg); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .effect-hp-shake {
          animation: hp-shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        @keyframes calc-step-diff {
          0% { opacity: 0; transform: translateY(8px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes calc-step-rank {
          0% { opacity: 0; transform: scale(0.7) rotate(-5deg); }
          70% { transform: scale(1.15) rotate(2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes calc-step-combo {
          0% { opacity: 0; transform: scale(0.7) rotate(5deg); }
          70% { transform: scale(1.15) rotate(-2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes calc-step-total {
          0% { opacity: 0; transform: scale(0.5); filter: blur(6px); }
          60% { transform: scale(1.2); filter: blur(0); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* 通常ゲーム画面と共通のパーティクルオーバーレイ */}
      <ParticleCanvas ref={particleCanvasRef} />

      {/* サウンド ミュート切り替えボタン (右下に配置) */}
      <button
        type="button"
        suppressHydrationWarning
        aria-label={isMuted ? t("sound_unmute") : t("sound_mute")}
        className="fixed bottom-4 right-4 z-50 p-2.5 rounded-full glass-panel border border-white/10 hover:border-[#00f3ff]/50 text-gray-400 hover:text-[#00f3ff] transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,0,0,0.5)] cursor-pointer"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          soundManager.unlock();
          const next = soundManager.toggleMute();
          setIsMuted(next);
        }}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-gray-500" />
        ) : (
          <Volume2 className="w-5 h-5 text-[#00f3ff] drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]" />
        )}
      </button>

      {/* 1. LOBBY 画面 */}
      {phase === "LOBBY" && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-2xl mx-auto w-full z-20">
          <div className="glass-panel w-full p-6 md:p-8 rounded-2xl border border-[#00f3ff]/30 shadow-[0_0_30px_rgba(0,243,255,0.15)] flex flex-col items-center gap-6">
            <div className="flex items-center gap-3">
              <Swords className="w-8 h-8 text-[#00f3ff] animate-pulse" />
              <h1 className="text-2xl md:text-4xl font-cyber font-bold tracking-wider text-transparent bg-clip-text bg-linear-to-r from-[#00f3ff] via-white to-[#00ff66]">
                BATTLE ARENA
              </h1>
            </div>

            {/* ホスト昇格通知バナー */}
            {promotedToHost && (
              <div className="w-full py-2.5 px-4 rounded-xl bg-[#00ff66]/15 border border-[#00f3ff]/40 text-[#00f3ff] text-xs font-mono text-center animate-in fade-in slide-in-from-top-2 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,102,0.2)]">
                <Crown className="w-4 h-4 text-yellow-400 animate-pulse" />
                <span>{t("host_promotion_notice")}</span>
              </div>
            )}

            {isHost && (
              <>
                {/* ルームコード表示 */}
                <div className="flex flex-col items-center gap-2 w-full">
                  <span className="text-xs uppercase tracking-widest text-gray-400 font-mono">
                    {t("room_code")}
                  </span>
                  <div
                    onClick={() => copyToClipboard("code")}
                    className="cursor-pointer group flex items-center gap-3 px-6 py-3 rounded-xl bg-black/50 border border-[#00f3ff]/40 hover:border-[#00f3ff] transition-all hover:scale-105 shadow-[0_0_15px_rgba(0,243,255,0.2)]"
                  >
                    <span className="text-3xl md:text-5xl font-mono font-bold tracking-widest text-[#00f3ff] group-hover:text-white transition-colors">
                      {roomId}
                    </span>
                    {copiedCode ? (
                      <Check className="w-6 h-6 text-[#00ff66]" />
                    ) : (
                      <Copy className="w-6 h-6 text-gray-400 group-hover:text-[#00f3ff]" />
                    )}
                  </div>
                  <span className="text-[11px] text-gray-500">
                    {t("copy_room_code_hint")}
                  </span>
                </div>

                {/* 招待リンクコピーボタン */}
                <button
                  onClick={() => copyToClipboard("link")}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#00f3ff]/10 border border-[#00f3ff]/30 hover:bg-[#00f3ff]/20 text-[#00f3ff] font-bold text-sm tracking-wide transition-all active:scale-95 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-[#00ff66]" />
                      <span>{t("link_copied")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>{t("copy_link")}</span>
                    </>
                  )}
                </button>
              </>
            )}

            {/* プレイヤー VS 対戦相手 ステータスカード */}
            <div className="relative grid grid-cols-2 gap-4 w-full items-stretch">
              {/* ホスト / 自分 */}
              <div className="p-4 rounded-xl bg-black/40 border border-[#00f3ff]/40 flex flex-col items-center justify-center gap-2">
                <div className="flex items-center gap-2 text-[#00f3ff]">
                  {player.device === "mobile" ? (
                    <Smartphone className="w-5 h-5" />
                  ) : (
                    <Monitor className="w-5 h-5" />
                  )}
                  <span className="text-xs uppercase font-mono">
                    {t(
                      player.device === "mobile"
                        ? "device_mobile"
                        : "device_desktop",
                    )}
                  </span>
                </div>
                <div className="relative inline-flex max-w-full items-center justify-center">
                  <div className="font-bold text-base truncate max-w-30 md:max-w-none text-center">
                    {leftCardName || t("waiting_opponent")}
                  </div>
                  <span className="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 text-xl leading-none w-6 h-6 inline-flex items-center justify-center animate-in zoom-in duration-150">
                    {myReaction}
                  </span>
                </div>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]/40 font-mono">
                  {role === "SPECTATOR"
                    ? t("player_one")
                    : `${t(isHost ? "role_host" : "role_guest")} (${t("label_you")})`}
                </span>
              </div>

              {/* 中央: VSマーク */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center pointer-events-none">
                <VsBadge />
              </div>

              {/* 相手 */}
              <div
                className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${
                  rightCardName
                    ? "bg-black/40 border border-[#ff0055]/50"
                    : "bg-black/20 border border-dashed border-gray-700 animate-pulse"
                }`}
              >
                {rightCardName ? (
                  <>
                    <div className="flex items-center gap-2 text-[#ff0055]">
                      {opponent?.device === "mobile" ? (
                        <Smartphone className="w-5 h-5" />
                      ) : (
                        <Monitor className="w-5 h-5" />
                      )}
                      <span className="text-xs uppercase font-mono">
                        {t(
                          opponent?.device === "mobile"
                            ? "device_mobile"
                            : "device_desktop",
                        )}
                      </span>
                    </div>
                    <div className="relative inline-flex max-w-full items-center justify-center">
                      <div className="font-bold text-base truncate max-w-30 md:max-w-none text-center text-[#ff0055]">
                        {rightCardName}
                      </div>
                      <span className="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 text-xl leading-none w-6 h-6 inline-flex items-center justify-center animate-in zoom-in duration-150">
                        {opponentReaction}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-[#ff0055]/20 text-[#ff0055] border border-[#ff0055]/40 font-mono">
                      {role === "SPECTATOR"
                        ? t("player_two")
                        : t(opponent?.isHost ? "role_host" : "role_guest")}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-gray-600 border-t-[#00f3ff] animate-spin my-1" />
                    <span className="text-xs text-gray-400 font-mono">
                      {t("waiting_opponent")}
                    </span>
                    <span className="text-[10px] text-gray-600">
                      {t("share_room_hint")}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 初期HP設定セクション */}
            <div className="w-full flex flex-col gap-2.5 p-3.5 rounded-xl bg-black/40 border border-gray-800">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className={`w-3.5 h-3.5 ${initialHpTextColor}`} />
                  {t("initial_hp_label")}
                  {isHost ? (
                    <span
                      className={`text-[10px] ${initialHpTextColor} font-normal`}
                    >
                      ({t("initial_hp_changeable")})
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-normal">
                      ({t("initial_hp_host_set")})
                    </span>
                  )}
                </span>
                <span
                  className={`font-cyber font-bold text-sm ${initialHpTextColor}`}
                >
                  {" "}
                  {getInitialHpTier(displayedInitialHp)}
                </span>
              </div>
              <div
                className={`w-full flex justify-center font-cyber font-bold ${initialHpTextColor}`}
              >
                <span>{displayedInitialHp} ms</span>
              </div>

              <input
                type="range"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                aria-label={t("initial_hp_label")}
                min={INITIAL_HP_MIN}
                max={INITIAL_HP_MAX}
                step={INITIAL_HP_STEP}
                value={isHost ? selectedHp : initialHp}
                disabled={!isHost}
                onChange={(e) =>
                  isHost && setSelectedHp(Number(e.target.value))
                }
                className={`w-full ${initialHpAccentColor} ${isHost ? "cursor-pointer" : "opacity-60 cursor-default"}`}
              />
              <div className="flex justify-between text-[10px] font-mono text-gray-500">
                <span>{INITIAL_HP_MIN}</span>
                <span>{INITIAL_HP_MAX}</span>
              </div>
            </div>

            {(role === "SPECTATOR" ||
              spectatorCount > 0 ||
              spectatorReaction.length > 0) && (
              <section className="relative w-full">
                {!spectatorAccordionOpen && spectatorReaction.length > 0 && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="absolute left-1/2 top-0 z-10 flex max-w-full -translate-x-1/2 -translate-y-1/2 gap-1 overflow-x-auto px-4 py-4"
                  >
                    {spectatorReaction.map((reaction, index) => (
                      <span
                        key={reaction.id}
                        role="img"
                        aria-label={`${reaction.userName}: ${t("reaction_aria_label", { emoji: reaction.emoji })}`}
                        className="shrink-0 rounded-full border border-yellow-400/30 bg-black/95 px-2 py-1 text-xl shadow-[0_2px_6px_rgba(0,0,0,0.65),0_0_5px_rgba(250,204,21,0.16)]"
                        style={{
                          animation:
                            "spectator-stamp-lobby 2000ms cubic-bezier(.2,.8,.3,1.2) both",
                          animationDelay: `${index * 45}ms`,
                        }}
                      >
                        {reaction.emoji}
                      </span>
                      ))}
                  </div>
                )}
                <button
                  type="button"
                  aria-expanded={spectatorAccordionOpen}
                  aria-controls="lobby-spectator-list"
                  onPointerDown={(event) => event.stopPropagation()}
                  onPointerUp={(event) => event.stopPropagation()}
                  onClick={() => setSpectatorAccordionOpen((isOpen) => !isOpen)}
                  className="flex min-h-14 w-full items-center justify-between rounded-xl border border-[#00f3ff]/30 bg-black/40 px-4 py-3 text-left transition-colors hover:bg-[#00f3ff]/5 focus-visible:outline-2 focus-visible:outline-[#00f3ff]"
                >
                  <span className="font-cyber text-sm font-bold text-[#00f3ff]">
                    {t("spectators_waiting", { count: spectatorCount })}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 text-[#00f3ff] transition-transform ${
                      spectatorAccordionOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  id="lobby-spectator-list"
                  hidden={!spectatorAccordionOpen}
                  className="mt-2 rounded-xl border border-gray-800 bg-black/30 p-3"
                >
                  {role === "SPECTATOR" && (
                    <div className="mb-2 text-xs text-gray-400">
                      <p className="font-bold text-[#00f3ff]">
                        {t("spectator_waiting", { position: queuePosition })}
                      </p>
                      <p>{t("spectator_no_match")}</p>
                    </div>
                  )}
                  {connectedSpectators.length > 0 ? (
                    <ul className="flex flex-col gap-1">
                      {connectedSpectators.map((spectator) => {
                        const reaction = latestReactionBySpectator.get(
                          spectator.sessionId,
                        );
                        return (
                          <li
                            key={spectator.sessionId}
                            className="flex min-h-9 items-center justify-between rounded-lg bg-white/5 px-3 py-1 text-sm text-gray-200"
                          >
                            <span className="truncate">
                              {spectator.userName}
                            </span>
                            {reaction && (
                              <span
                                aria-label={t("reaction_aria_label", {
                                  emoji: reaction.emoji,
                                })}
                                className="ml-3 shrink-0 text-xl"
                              >
                                {reaction.emoji}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-center text-xs text-gray-500">
                      {t("spectators_waiting", { count: 0 })}
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* リアクションスタンプ */}
            <div className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-black/40 border border-gray-800">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={t("reaction_aria_label", { emoji })}
                  disabled={reactionButtonsDisabled}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  onClick={() => handleReactionClick(emoji)}
                  className="w-11 h-11 text-2xl rounded-lg border-0 bg-transparent hover:bg-[#00f3ff]/10 focus-visible:outline-2 focus-visible:outline-[#00f3ff] transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* 開始ボタン（ホストのみ） */}
            {role === "SPECTATOR" ? (
              <div className="text-center text-sm font-mono text-gray-400">
                {t("spectator_reaction_hint")}
              </div>
            ) : isHost ? (
              <button
                disabled={!opponent}
                onClick={handleStartMatch}
                className={`w-full py-4 rounded-xl font-cyber font-bold text-xl uppercase tracking-widest transition-all ${
                  opponent
                    ? "bg-[#00ff66] hover:bg-[#33ff88] text-black shadow-[0_0_25px_rgba(0,255,102,0.6)] hover:scale-[1.02] active:scale-95 cursor-pointer"
                    : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                }`}
              >
                {opponent ? t("start") : t("waiting_opponent_caps")}
              </button>
            ) : (
              <div className="text-center text-sm font-mono text-[#00f3ff] animate-pulse">
                {t("waiting_for_host_start")}
              </div>
            )}

            {onExit && (
              <button
                onClick={handleExit}
                className="text-xs text-gray-500 hover:text-gray-300 font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t("leave_lobby")}
              </button>
            )}
            {role !== "SPECTATOR" && spectatorCount > 0 && (
              <button
                type="button"
                onClick={handleRotateToSpectator}
                className="w-full rounded-xl border border-yellow-400/50 bg-yellow-400/10 py-3 text-sm font-bold text-yellow-200 hover:bg-yellow-400/20"
              >
                {t("become_spectator", { count: spectatorCount })}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. デバイス不一致 警告モーダル */}
      {phase === "DEVICE_WARNING" && hasDeviceMismatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel p-6 md:p-8 rounded-2xl max-w-md w-full border border-yellow-500/40 shadow-[0_0_40px_rgba(234,179,8,0.2)] flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-400 animate-bounce" />
            <h2 className="text-xl font-cyber font-bold text-yellow-400">
              {t("device_warning_title")}
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              {t.rich("device_warning_description", {
                playerDevice: t(
                  player.device === "mobile"
                    ? "device_mobile"
                    : "device_desktop",
                ),
                opponentDevice: t(
                  opponent?.device === "mobile"
                    ? "device_mobile"
                    : "device_desktop",
                ),
                player: (chunks) => (
                  <span className="text-[#00f3ff] font-bold">{chunks}</span>
                ),
                opponent: (chunks) => (
                  <span className="text-[#ff0055] font-bold">{chunks}</span>
                ),
              })}
            </p>

            <div className="flex flex-col gap-2 w-full text-xs font-mono text-gray-400 my-2">
              <div className="flex items-center justify-between px-3 py-2 rounded bg-black/40 border border-gray-800">
                <span className="min-w-0 truncate text-left">
                  {warningPlayers[0].name} (
                  {t(
                    warningPlayers[0].device === "mobile"
                      ? "device_mobile"
                      : "device_desktop",
                  )}
                  ):
                </span>
                <span
                  className={
                    deviceWarningAcceptedByMe
                      ? "text-[#00ff66]"
                      : "text-yellow-400"
                  }
                >
                  {deviceWarningAcceptedByMe
                    ? t("device_warning_accepted")
                    : t("device_warning_pending")}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded bg-black/40 border border-gray-800">
                <span className="min-w-0 truncate text-left">
                  {warningPlayers[1].name} (
                  {t(
                    warningPlayers[1].device === "mobile"
                      ? "device_mobile"
                      : "device_desktop",
                  )}
                  ):
                </span>
                <span
                  className={
                    deviceWarningAcceptedByOpponent
                      ? "text-[#00ff66]"
                      : "text-yellow-400"
                  }
                >
                  {deviceWarningAcceptedByOpponent
                    ? t("device_warning_accepted")
                    : t("device_warning_pending")}
                </span>
              </div>
            </div>

            {role === "SPECTATOR" && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
                <span
                  aria-hidden="true"
                  className="h-4 w-4 rounded-full border-2 border-gray-600 border-t-yellow-400 animate-spin"
                />
                <span>{t("device_warning_players_confirming")}</span>
              </div>
            )}

            <div className="flex gap-3 w-full">
              {onExit && (
                <button
                  onClick={handleExit}
                  className="flex-1 py-3 rounded-xl border border-gray-700 hover:bg-gray-800 text-gray-300 font-bold text-sm transition-all cursor-pointer"
                >
                  {t("exit_match")}
                </button>
              )}
              {role !== "SPECTATOR" && (
                <button
                  disabled={deviceWarningAcceptedByMe}
                  onClick={acceptDeviceWarning}
                  className={`flex-1 py-3 rounded-xl font-cyber font-bold text-sm uppercase tracking-wider transition-all ${
                    deviceWarningAcceptedByMe
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                      : "bg-yellow-400 hover:bg-yellow-300 text-black shadow-[0_0_20px_rgba(234,179,8,0.5)] cursor-pointer"
                  }`}
                >
                  {deviceWarningAcceptedByMe
                    ? t("device_warning_accepted_button")
                    : t("device_warning_continue")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. バトルアリーナ実行部 (COUNTDOWN / WAITING / ACTION / RESOLVING / MATCH_FINISHED) */}
      {phase !== "LOBBY" && phase !== "DEVICE_WARNING" && (
        <div className="flex-1 flex flex-col w-full h-full relative">
          {/* Cyber Grid Background */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,243,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.03)_1px,transparent_1px)] bg-size-[40px_40px] opacity-40 z-0"></div>

          {/* ======================================================== */}
          {/* 上部ステータスバー: プレイヤー VS 相手 */}
          {/* ======================================================== */}
          <div className="w-full px-4 md:px-8 lg:px-12 pt-[max(2rem,calc(env(safe-area-inset-top)+0.875rem))] pb-3.5 md:py-5 border-b border-gray-800/80 bg-black/60 backdrop-blur-md z-30 flex items-center justify-between">
            {/* 左: プレイヤー（自分） */}
            <div className="flex items-center gap-3 flex-1 max-w-[42%] md:max-w-md lg:max-w-lg">
              <div className="flex flex-col items-start gap-1 md:gap-1.5 w-full">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    {player.device === "mobile" ? (
                      <Smartphone className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#00f3ff]" />
                    ) : (
                      <Monitor className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#00f3ff]" />
                    )}
                    <span className="font-bold text-white text-xs md:text-sm lg:text-base tracking-wide truncate max-w-17.5 sm:max-w-30 md:max-w-none">
                      {player.userName}
                    </span>
                  </div>
                  {displayPlayerCombo > 0 && (
                    <span
                      className={`flex items-center gap-0.5 text-[10px] md:text-xs lg:text-sm font-cyber font-bold px-1.5 md:px-2.5 py-0.5 rounded-full border shadow-sm animate-pulse ${
                        effectivePlayerComboRank === "GODLIKE"
                          ? "bg-yellow-500/20 text-yellow-300 border-yellow-400/50 shadow-[0_0_10px_rgba(250,204,21,0.4)]"
                          : "bg-[#00ff66]/20 text-[#00ff66] border-[#00ff66]/40 shadow-[0_0_8px_rgba(0,255,102,0.3)]"
                      }`}
                    >
                      <Flame
                        className={`w-3 h-3 md:w-3.5 md:h-3.5 ${
                          effectivePlayerComboRank === "GODLIKE"
                            ? "fill-yellow-400 text-yellow-400"
                            : "fill-[#00ff66] text-[#00ff66]"
                        }`}
                      />
                      {displayPlayerCombo}C ({playerMultiplier.toFixed(1)}x)
                    </span>
                  )}
                </div>

                {/* HP バー */}
                <div
                  className={`w-full h-2.5 md:h-4 lg:h-5 bg-gray-950/90 rounded-full md:rounded-lg overflow-hidden border border-[#00f3ff]/40 md:border-2 md:border-[#00f3ff]/60 p-0.5 shadow-[0_0_12px_rgba(0,243,255,0.25)] transition-all ${
                    phase === "RESOLVING" &&
                    isWinnerOpponent &&
                    (animStage === "IMPACT" || activeStep >= 9) &&
                    totalDamage > 0
                      ? "effect-hp-shake border-red-500 shadow-[0_0_20px_rgba(255,0,85,0.8)]"
                      : ""
                  }`}
                >
                  <div
                    className="h-full bg-linear-to-r from-[#00f3ff] via-[#00ffcc] to-[#00ff66] rounded-full md:rounded-sm transition-all duration-300 relative overflow-hidden"
                    style={{ width: `${playerHpPercent}%` }}
                  >
                    <div className="absolute inset-0 bg-linear-to-b from-white/30 via-transparent to-black/20 pointer-events-none" />
                  </div>
                </div>
                <div className="flex items-center justify-between w-full font-mono text-[10px] md:text-xs lg:text-sm">
                  <span className="text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <span>HP</span>
                    <span className="hidden md:inline text-gray-500 font-normal">
                      ({Math.round(playerHpPercent)}%)
                    </span>
                  </span>
                  <span className="font-cyber font-bold text-[#00f3ff] text-xs md:text-sm lg:text-base drop-shadow-[0_0_8px_rgba(0,243,255,0.6)]">
                    {effectivePlayerHp.toFixed(1)}
                    <span className="text-[10px] md:text-xs text-gray-400 font-mono font-normal ml-1">
                      / {initialHp} ms
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* 中央: VS表記 & ラウンド数 */}
            <div className="flex flex-col items-center justify-center px-1 md:px-4 gap-1">
              <span className="text-[10px] md:text-xs font-mono tracking-widest text-gray-400 uppercase font-semibold">
                R{currentRound}
              </span>
              <VsBadge />
            </div>

            {/* 右: 対戦相手 */}
            <div className="flex items-center justify-end gap-3 flex-1 max-w-[42%] md:max-w-md lg:max-w-lg">
              <div className="flex flex-col items-end gap-1 md:gap-1.5 w-full">
                <div className="flex items-center justify-between w-full">
                  {opponent && displayOpponentCombo > 0 && (
                    <span
                      className={`flex items-center gap-0.5 text-[10px] md:text-xs lg:text-sm font-cyber font-bold px-1.5 md:px-2.5 py-0.5 rounded-full border shadow-sm animate-pulse ${
                        effectiveOpponentComboRank === "GODLIKE"
                          ? "bg-yellow-500/20 text-yellow-300 border-yellow-400/50 shadow-[0_0_10px_rgba(250,204,21,0.4)]"
                          : "bg-[#ff0055]/20 text-[#ff0055] border-[#ff0055]/40 shadow-[0_0_8px_rgba(255,0,85,0.3)]"
                      }`}
                    >
                      <Flame
                        className={`w-3 h-3 md:w-3.5 md:h-3.5 ${
                          effectiveOpponentComboRank === "GODLIKE"
                            ? "fill-yellow-400 text-yellow-400"
                            : "fill-[#ff0055] text-[#ff0055]"
                        }`}
                      />
                      {displayOpponentCombo}C ({opponentMultiplier.toFixed(1)}x)
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 md:gap-2 ml-auto">
                    <span className="font-bold text-white text-xs md:text-sm lg:text-base tracking-wide truncate max-w-17.5 sm:max-w-30 md:max-w-none">
                      {opponent?.userName || t("log_opponent")}
                    </span>
                    {opponent?.device === "mobile" ? (
                      <Smartphone className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#ff0055]" />
                    ) : (
                      <Monitor className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#ff0055]" />
                    )}
                  </div>
                </div>

                {/* HP バー */}
                <div
                  className={`w-full h-2.5 md:h-4 lg:h-5 bg-gray-950/90 rounded-full md:rounded-lg overflow-hidden border border-[#ff0055]/40 md:border-2 md:border-[#ff0055]/60 p-0.5 shadow-[0_0_12px_rgba(255,0,85,0.25)] transition-all ml-auto ${
                    phase === "RESOLVING" &&
                    isWinnerPlayer &&
                    (animStage === "IMPACT" || activeStep >= 9) &&
                    totalDamage > 0
                      ? "effect-hp-shake border-white shadow-[0_0_20px_rgba(0,243,255,0.8)]"
                      : ""
                  }`}
                >
                  <div
                    className="h-full bg-linear-to-l from-[#ff0055] via-[#ff007f] to-orange-500 rounded-full md:rounded-sm transition-all duration-300 ml-auto relative overflow-hidden"
                    style={{ width: `${opponentHpPercent}%` }}
                  >
                    <div className="absolute inset-0 bg-linear-to-b from-white/30 via-transparent to-black/20 pointer-events-none" />
                  </div>
                </div>
                <div className="flex items-center justify-between w-full font-mono text-[10px] md:text-xs lg:text-sm">
                  <span className="font-cyber font-bold text-[#ff0055] text-xs md:text-sm lg:text-base drop-shadow-[0_0_8px_rgba(255,0,85,0.6)]">
                    {opponent ? `${effectiveOpponentHp.toFixed(1)}` : "0.0"}
                    <span className="text-[10px] md:text-xs text-gray-400 font-mono font-normal ml-1">
                      / {initialHp} ms
                    </span>
                  </span>
                  <span className="text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="hidden md:inline text-gray-500 font-normal">
                      ({Math.round(opponentHpPercent)}%)
                    </span>
                    <span>HP</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {role === "SPECTATOR" && (
            <div className="z-20 flex justify-center py-2">
              <span className="rounded-full border border-[#00f3ff]/50 bg-black/65 px-4 py-1 text-[10px] font-mono uppercase tracking-wider text-[#00f3ff]/90">
                {t("spectator_live_badge")}
              </span>
            </div>
          )}

          {/* ======================================================== */}
          {/* 中央メインエリア: 通常GameCanvasと同一の円形HUD測定UI */}
          {/* ======================================================== */}
          <div
            ref={touchAreaRef}
            className={
              "flex-1 relative flex flex-col items-center justify-center cursor-pointer pointer-events-none" +
              (phase === "RESOLVING" &&
              playerRank === "GODLIKE" &&
              roundResult?.winner === "player"
                ? " effect-shake"
                : "")
            }
          >
            {/* Screen Flash on high ranks */}
            {phase === "RESOLVING" &&
              roundResult?.winner === "player" &&
              (playerRank === "GODLIKE" || playerRank === "EXCELLENT") && (
                <div
                  className={`absolute inset-0 pointer-events-none z-30 animate-[screen-flash_0.4s_ease-out_forwards] ${
                    playerRank === "GODLIKE"
                      ? "bg-linear-to-b from-[#ffd700]/30 via-[#ffaa00]/15 to-transparent"
                      : "bg-linear-to-b from-[#ff64ff]/25 via-[#bc13fe]/15 to-transparent"
                  }`}
                />
              )}

            {/* Enhanced Godlike / Excellent Pop Text (GameCanvas完全準拠) */}
            {phase === "RESOLVING" &&
              roundResult?.winner === "player" &&
              playerRank !== "NORMAL" && (
                <div
                  className={`absolute top-1/2 left-1/2 pointer-events-none z-50 ${
                    playerRank === "GODLIKE"
                      ? "animate-[godlike-pop_0.75s_cubic-bezier(0.16,1,0.3,1)_forwards]"
                      : "animate-[excellent-pop_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards]"
                  }`}
                >
                  {playerRank === "GODLIKE" ? (
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-6xl md:text-9xl font-black italic text-transparent bg-clip-text bg-linear-to-b from-[#ffffff] via-[#ffd700] to-[#ff8c00] drop-shadow-[0_0_35px_rgba(255,215,0,1)] whitespace-nowrap uppercase tracking-widest font-cyber">
                        {t("rank_godlike")}
                      </div>
                      <span className="text-xs md:text-sm font-cyber font-bold tracking-[0.5em] text-[#fff3a8] drop-shadow-[0_0_10px_rgba(255,215,0,0.8)] uppercase mt-1">
                        {t("rank_godlike_tag")}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-5xl md:text-8xl font-black italic text-transparent bg-clip-text bg-linear-to-b from-[#ffffff] via-[#ff64ff] to-[#bc13fe] drop-shadow-[0_0_25px_rgba(255,100,255,1)] whitespace-nowrap uppercase tracking-widest font-cyber">
                        {t("rank_excellent")}
                      </div>
                      <span className="text-xs md:text-sm font-cyber font-bold tracking-[0.4em] text-[#00f3ff] drop-shadow-[0_0_8px_rgba(0,243,255,0.8)] uppercase mt-1">
                        {t("rank_excellent_tag")}
                      </span>
                    </div>
                  )}
                </div>
              )}

            {/* ======================================================== */}
            {/* HPバーとタイマーの間: 枠線なし・巨大数字の計算アニメーション (absolute配置でタイマーのズレを防止) */}
            {/* ======================================================== */}
            {phase === "RESOLVING" &&
              !player.currentRoundFoul &&
              !opponent?.currentRoundFoul &&
              !isDraw && (
                <div className="absolute top-3 sm:top-5 md:top-8 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center z-30 select-none pointer-events-none animate-in fade-in">
                  {/* 2. 自分の反応速度を 1. の上に -{反応速度} で表示 (勝者＝速い方のタイム) */}
                  <div
                    className={`flex items-center gap-1.5 mb-0.5 transition-opacity duration-200 ${
                      showSubNum
                        ? "opacity-100"
                        : "opacity-0 pointer-events-none"
                    }`}
                    style={{ minHeight: "28px" }}
                  >
                    <span
                      className={`text-xs sm:text-sm font-cyber tracking-widest uppercase font-bold ${
                        isWinnerPlayer ? "text-[#00f3ff]" : "text-[#ff0055]"
                      }`}
                    >
                      {`${damageCalculationPlayerName || t("log_opponent")}:`}
                    </span>
                    <span className="font-mono font-black text-xl sm:text-2xl md:text-3xl text-yellow-300 drop-shadow-[0_0_15px_rgba(234,179,8,0.9)]">
                      -{displaySubNum.toFixed(1)}
                    </span>
                    <span className="text-xs sm:text-sm font-cyber text-yellow-400">
                      MS
                    </span>
                  </div>

                  {/* 1, 3, 5, 7, 8 メイン数字とボーナス倍率 */}
                  <div className="relative flex items-center justify-center">
                    <div className="flex items-baseline justify-center">
                      <span
                        key={popKey}
                        className={`font-cyber font-black tracking-wider transition-colors duration-150 ${
                          isPopping
                            ? "animate-[pop-bounce_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)_both] "
                            : ""
                        } ${
                          activeStep === 8 || activeStep === 9
                            ? "text-5xl sm:text-6xl md:text-7xl opacity-30 " +
                              (isWinnerPlayer
                                ? "text-[#00ff66]"
                                : "text-[#ff0055]")
                            : activeStep >= 6
                              ? winnerRank === "GODLIKE"
                                ? "text-6xl sm:text-7xl md:text-8xl text-[#ffd700] drop-shadow-[0_0_35px_rgba(255,215,0,1)]"
                                : "text-6xl sm:text-7xl md:text-8xl text-[#ff64ff] drop-shadow-[0_0_35px_rgba(255,100,255,1)]"
                              : activeStep >= 4
                                ? winnerRank === "GODLIKE"
                                  ? "text-6xl sm:text-7xl md:text-8xl text-[#ffd700] drop-shadow-[0_0_30px_rgba(255,215,0,0.9)]"
                                  : "text-6xl sm:text-7xl md:text-8xl text-[#ff64ff] drop-shadow-[0_0_30px_rgba(255,100,255,0.9)]"
                                : activeStep === 3
                                  ? "text-6xl sm:text-7xl md:text-8xl text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.9)]"
                                  : "text-6xl sm:text-7xl md:text-8xl text-gray-100 drop-shadow-[0_0_20px_rgba(255,255,255,0.7)]"
                        }`}
                      >
                        {displayMainNum.toFixed(1)}
                      </span>
                      <span className="text-base sm:text-lg md:text-xl font-cyber text-gray-400 ml-1.5">
                        MS
                      </span>
                    </div>

                    {/* 4 & 6. ランクボーナス / コンボボーナス倍率 (モバイル: 下の右寄せ, PC: 右隣り) */}
                    <div className="absolute top-full right-0 mt-0.5 sm:mt-1 md:mt-0 md:top-1/2 md:-translate-y-1/2 md:left-full md:right-auto md:ml-4 flex flex-col items-end md:items-start justify-center gap-1.5 pointer-events-none">
                      {showRankBonus && (
                        <div className="flex flex-col items-end md:items-start animate-[calc-step-rank_0.25s_cubic-bezier(0.16,1,0.3,1)_both]">
                          <span
                            className={`text-[10px] sm:text-xs font-cyber font-black tracking-wider uppercase whitespace-nowrap leading-none mb-1 text-right md:text-left ${
                              winnerRank === "GODLIKE"
                                ? "text-[#ffd700] drop-shadow-[0_0_10px_rgba(255,215,0,0.9)]"
                                : "text-[#ff64ff] drop-shadow-[0_0_10px_rgba(255,100,255,0.9)]"
                            }`}
                          >
                            {winnerRank === "GODLIKE"
                              ? t("rank_godlike_bonus")
                              : t("rank_excellent_bonus")}
                          </span>
                          <div
                            className={`flex items-center gap-1.5 justify-end md:justify-start ${
                              winnerRank === "GODLIKE"
                                ? "text-[#ffd700] drop-shadow-[0_0_18px_rgba(255,215,0,1)]"
                                : "text-[#ff64ff] drop-shadow-[0_0_18px_rgba(255,100,255,1)]"
                            }`}
                          >
                            <Zap
                              className={`w-4 h-4 sm:w-5 sm:h-5 animate-bounce ${
                                winnerRank === "GODLIKE"
                                  ? "fill-[#ffd700] text-[#ffd700]"
                                  : "fill-[#ff64ff] text-[#ff64ff]"
                              }`}
                            />
                            <span className="font-cyber font-black text-2xl sm:text-3xl md:text-4xl leading-none">
                              ×{winnerRankBaseMult.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      )}
                      {showComboBonus && (
                        <div className="flex flex-col items-end md:items-start animate-[calc-step-combo_0.25s_cubic-bezier(0.16,1,0.3,1)_both]">
                          <span
                            className={`text-[10px] sm:text-xs font-cyber font-black tracking-wider uppercase whitespace-nowrap leading-none mb-1 text-right md:text-left ${
                              winnerBonusType === "GODLIKE"
                                ? "text-[#ffd700] drop-shadow-[0_0_10px_rgba(255,215,0,0.9)]"
                                : "text-[#ff64ff] drop-shadow-[0_0_10px_rgba(255,100,255,0.9)]"
                            }`}
                          >
                            {winnerBonusType === "GODLIKE"
                              ? t("rank_godlike_combo_bonus")
                              : t("rank_excellent_combo_bonus")}
                          </span>
                          <div
                            className={`flex items-center gap-1.5 justify-end md:justify-start ${
                              winnerBonusType === "GODLIKE"
                                ? "text-[#ffd700] drop-shadow-[0_0_18px_rgba(255,215,0,1)]"
                                : "text-[#ff64ff] drop-shadow-[0_0_18px_rgba(255,100,255,1)]"
                            }`}
                          >
                            <Flame
                              className={`w-4 h-4 sm:w-5 sm:h-5 animate-pulse ${
                                winnerBonusType === "GODLIKE"
                                  ? "fill-[#ffd700] text-[#ffd700]"
                                  : "fill-[#ff64ff] text-[#ff64ff]"
                              }`}
                            />
                            <span className="font-cyber font-black text-2xl sm:text-3xl md:text-4xl leading-none">
                              ×{winnerComboMult.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* 円形プログレスHUD (GameCanvasデザイン完全準拠) */}
            <div className="relative flex items-center justify-center mb-6">
              {/* 波紋エフェクト */}
              {phase === "RESOLVING" && (
                <>
                  <div
                    className={`absolute rounded-full border-current pointer-events-none ${textColor} ${textShadow} effect-ripple-out`}
                    style={{ width: 280, height: 280 }}
                  />
                  <div
                    className={`absolute rounded-full border-current pointer-events-none ${textColor} ${textShadow} effect-ripple-in`}
                    style={{ width: 280, height: 280 }}
                  />
                </>
              )}

              <svg
                viewBox="0 0 400 400"
                className="w-70 h-70 sm:w-85 sm:h-85 md:w-100 md:h-100 transform -rotate-90 overflow-visible"
              >
                {/* Background Ring */}
                <circle
                  cx="200"
                  cy="200"
                  r={circleRadius}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Progress Ring */}
                <circle
                  ref={progressRingRef}
                  cx="200"
                  cy="200"
                  r={circleRadius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={circleCircumference}
                  strokeDashoffset={
                    phase === "COUNTDOWN"
                      ? (circleCircumference * (3 - (countdown || 3))) / 3
                      : 0
                  }
                  className={`${ringColor} ${ringGlow} transition-all duration-300`}
                  strokeLinecap="round"
                />
                {/* Cyber Dashes Ring */}
                <circle
                  cx="200"
                  cy="200"
                  r={circleRadius - 16}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="4 8"
                />
              </svg>

              {/* リング中央コンテンツ (GameCanvas完全準拠のタイポグラフィ) */}
              <div className="absolute flex flex-col items-center justify-center">
                {phase === "COUNTDOWN" && (
                  <span
                    className="font-cyber font-black text-6xl md:text-8xl text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.9)] animate-pulse"
                    style={
                      countdown === 1
                        ? { position: "relative", left: "-0.07em" }
                        : undefined
                    }
                  >
                    {countdown}
                  </span>
                )}

                {phase === "WAITING" && (
                  <div className="flex flex-col items-center justify-center">
                    {player.currentRoundFoul ? (
                      <span className="font-cyber font-black text-4xl md:text-5xl text-red-500 drop-shadow-[0_0_18px_rgba(239,68,68,0.9)]">
                        {t("hud_foul")}
                      </span>
                    ) : (
                      <>
                        <span className="text-gray-400 font-cyber text-xs uppercase tracking-[0.3em] mb-1">
                          {t("hud_status")}
                        </span>
                        <span className="font-cyber font-bold text-3xl md:text-4xl text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.9)]">
                          {t("hud_locked")}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono mt-1">
                          {t("hud_false_start_warning")}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {phase === "ACTION" &&
                  (isWaitingForOpponentInAction ? (
                    <div className="flex flex-col items-center justify-center animate-in fade-in">
                      <span className="text-gray-400 font-cyber text-xs uppercase tracking-[0.3em] mb-1">
                        {t("hud_your_time")}
                      </span>
                      <span className="font-mono text-3xl md:text-4xl font-bold text-[#00f3ff] drop-shadow-[0_0_15px_rgba(0,243,255,0.8)]">
                        {player.currentRoundFoul
                          ? t("hud_foul")
                          : `${player.currentRoundTime?.toFixed(1)}`}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-[#00f3ff] mt-1 font-mono">
                        <div className="w-3 h-3 rounded-full border border-[#00f3ff] border-t-transparent animate-spin" />
                        <span>{t("hud_waiting_opponent")}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-gray-400 font-cyber text-xs uppercase tracking-[0.3em] mb-1">
                        {t("hud_signal")}
                      </span>
                      <span className="font-cyber font-black text-4xl md:text-5xl text-[#00ff66] drop-shadow-[0_0_20px_rgba(0,255,102,1)] animate-bounce">
                        {player.device === "mobile"
                          ? t("hud_release")
                          : t("hud_push")}
                      </span>
                      <span className="text-gray-500 font-cyber text-[10px] mt-1">
                        {player.device === "mobile"
                          ? t("hud_release_instruction")
                          : t("unit_ms")}
                      </span>
                    </div>
                  ))}

                {phase === "RESOLVING" && (
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-gray-400 font-cyber text-xs uppercase tracking-[0.3em] mb-1">
                      {t("hud_round_time")}
                    </span>
                    <span
                      className={`font-mono text-3xl md:text-4xl font-bold ${textColor} ${textShadow}`}
                    >
                      {player.currentRoundFoul
                        ? t("hud_foul")
                        : `-${player.currentRoundTime?.toFixed(1)}`}
                    </span>
                    <span className="text-gray-500 font-cyber text-[10px] mt-1">
                      {player.currentRoundRank || "MS"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Main Action Text (GameCanvas完全準拠) */}
            <h1
              className={`text-4xl sm:text-5xl md:text-7xl font-cyber font-black tracking-widest uppercase ${textColor} ${textShadow} z-10 text-center px-4`}
            >
              {mainActionText}
            </h1>

            {/* ======================================================== */}
            {/* 攻撃弾道エフェクト & 着弾インパクト */}
            {/* ======================================================== */}
            {phase === "RESOLVING" && activeStep === 8 && totalDamage > 0 && (
              <>
                {/* プレイヤーの攻撃 -> 計算位置（中央上部）から相手のHPバー（右上）へ飛翔 (0.5s) */}
                {isWinnerPlayer && (
                  <div
                    className="pointer-events-none fixed z-40"
                    style={{
                      animation:
                        "attack-fly-to-opponent 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both",
                    }}
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-linear-to-r from-[#00f3ff] via-white to-[#00ff66] shadow-[0_0_40px_#00f3ff,0_0_80px_#00ff66] animate-pulse flex items-center justify-center">
                        <Zap className="w-6 h-6 text-black fill-black" />
                      </div>
                      <div className="absolute -top-7 whitespace-nowrap font-cyber font-black text-sm md:text-lg text-[#00ff66] drop-shadow-[0_0_10px_rgba(0,255,102,1)]">
                        -{finalDamage.toFixed(1)} MS
                      </div>
                      <div className="absolute w-28 md:w-44 h-3.5 bg-linear-to-r from-transparent via-[#00f3ff] to-white rounded-full blur-[2px] -translate-x-14 md:-translate-x-20" />
                    </div>
                  </div>
                )}

                {/* 相手の攻撃 -> 計算位置（中央上部）から自分のHPバー（左上）へ飛翔 (0.5s) */}
                {isWinnerOpponent && (
                  <div
                    className="pointer-events-none fixed z-40"
                    style={{
                      animation:
                        "attack-opponent-to-player 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both",
                    }}
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-linear-to-r from-[#ff0055] via-white to-purple-600 shadow-[0_0_40px_#ff0055,0_0_80px_#bc13fe] animate-pulse flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white fill-white" />
                      </div>
                      <div className="absolute -top-7 whitespace-nowrap font-cyber font-black text-sm md:text-lg text-[#ff0055] drop-shadow-[0_0_10px_rgba(255,0,85,1)]">
                        -{finalDamage.toFixed(1)} MS
                      </div>
                      <div className="absolute w-28 md:w-44 h-3.5 bg-linear-to-r from-white via-[#ff0055] to-transparent rounded-full blur-[2px] translate-x-14 md:translate-x-20" />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 着弾インパクト爆発 (IMPACTステップ時: activeStep === 9) */}
            {phase === "RESOLVING" && activeStep === 9 && totalDamage > 0 && (
              <>
                {/* 相手HPバー位置での着弾エクスプロージョン */}
                {isWinnerPlayer && (
                  <div className="pointer-events-none fixed top-3 md:top-4 right-[6%] sm:right-[10%] md:right-[15%] z-40 flex items-center justify-center animate-[impact-burst_0.5s_ease-out_both]">
                    <div className="w-24 h-24 md:w-36 md:h-36 rounded-full bg-[#00f3ff]/30 border-2 border-white shadow-[0_0_60px_#00f3ff]" />
                    <div className="absolute w-16 h-16 md:w-24 md:h-24 rounded-full bg-white/50 blur-sm animate-ping" />
                  </div>
                )}

                {/* 自分のHPバー位置での着弾エクスプロージョン */}
                {isWinnerOpponent && (
                  <div className="pointer-events-none fixed top-3 md:top-4 left-[6%] sm:left-[10%] md:left-[15%] z-40 flex items-center justify-center animate-[impact-burst_0.5s_ease-out_both]">
                    <div className="w-24 h-24 md:w-36 md:h-36 rounded-full bg-[#ff0055]/30 border-2 border-white shadow-[0_0_60px_#ff0055]" />
                    <div className="absolute w-16 h-16 md:w-24 md:h-24 rounded-full bg-white/50 blur-sm animate-ping" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <BattleMatchResultModal
        isOpen={phase === "MATCH_FINISHED"}
        isSpectator={role === "SPECTATOR"}
        winner={matchWinner}
        finishReason={matchFinishReason}
        player={player}
        opponent={opponent}
        opponentReturnedToLobby={opponentReturnedToLobby}
        rematchRequestedByMe={rematchRequestedByMe}
        rematchRequestedByOpponent={rematchRequestedByOpponent}
        spectatorCount={spectatorCount}
        onOpenBattleLog={() => setShowBattleLog(true)}
        onRequestRematch={requestRematch}
        onReturnToLobby={role === "SPECTATOR" ? handleExit : returnToLobby}
      />

      <BattleRoundLogModal
        isOpen={showBattleLog}
        logs={roundLogs}
        isSpectator={role === "SPECTATOR"}
        playerName={
          role === "SPECTATOR"
            ? (battleLogPlayerNames.playerName ?? undefined)
            : undefined
        }
        opponentName={
          role === "SPECTATOR"
            ? (battleLogPlayerNames.opponentName ?? undefined)
            : opponent?.userName
        }
        onClose={() => setShowBattleLog(false)}
      />
    </div>
  );
};
