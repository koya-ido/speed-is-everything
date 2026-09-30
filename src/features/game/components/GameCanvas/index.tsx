"use client";

import { ResultSection } from "@/features/game/components/ResultSection";
import { getUnpredictableDelay } from "@/features/game/utils/gameLogic";
import {
  clearPendingScore,
  getPendingScore,
} from "@/features/game/utils/pendingScore";
import {
  DeviceType,
  getDeviceType,
  getReactionRank,
} from "@/features/game/utils/thresholds";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

type GameState = "START" | "WAITING" | "ACTION" | "INTERVAL" | "GAMEOVER";

export const GameCanvas = () => {
  const [gameState, setGameState] = useState<GameState>("START");
  const [remainingTime, setRemainingTime] = useState(3000);
  const [clearCount, setClearCount] = useState(0);
  const [lastReaction, setLastReaction] = useState<number | null>(null);
  const [rawReactions, setRawReactions] = useState<number[]>([]);
  const [failedReaction, setFailedReaction] = useState<number | null>(null);
  const [failureType, setFailureType] = useState<
    "FALSE_START" | "TOO_FAST" | "TIME_OVER" | "TAB_LEAVE" | null
  >(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [deviceType, setDeviceType] = useState<DeviceType>(getDeviceType());

  const timerRef = useRef<number | null>(null);
  const actionStartTimeRef = useRef<number>(-1);
  const rafRef = useRef<number | null>(null);
  const roundInitialRemainingRef = useRef<number>(3000);
  const progressRingRef = useRef<SVGCircleElement>(null);
  const timeTextRef = useRef<HTMLSpanElement>(null);
  const isActionActiveRef = useRef<boolean>(false);

  const t = useTranslations("GameCanvas");

  const stateRef = useRef({
    gameState,
    remainingTime,
    clearCount,
    rawReactions,
  });
  useEffect(() => {
    stateRef.current = { gameState, remainingTime, clearCount, rawReactions };
  }, [gameState, remainingTime, clearCount, rawReactions]);

  useEffect(() => {
    const parsed = getPendingScore();
    if (parsed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClearCount(parsed.clear_count);
      setRemainingTime(parsed.remaining_time);
      setRawReactions(parsed.raw_reactions || []);
      if (parsed.failed_reaction !== undefined)
        setFailedReaction(parsed.failed_reaction);
      if (parsed.failure_type !== undefined)
        setFailureType(parsed.failure_type);
      if (parsed.session_token) setSessionToken(parsed.session_token);
      setGameState("GAMEOVER");
    }
  }, []);

  const handleGameOver = useCallback(
    (
      type?: "FALSE_START" | "TOO_FAST" | "TIME_OVER" | "TAB_LEAVE",
      reaction?: number,
    ) => {
      isActionActiveRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      if (type) setFailureType(type);
      if (reaction !== undefined) setFailedReaction(reaction);

      setGameState("GAMEOVER");
    },
    [],
  );

  const scheduleNextAction = useCallback(() => {
    const delay = getUnpredictableDelay();

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      setGameState("ACTION");
      isActionActiveRef.current = true;
      actionStartTimeRef.current = -1;
      roundInitialRemainingRef.current = stateRef.current.remainingTime;

      requestAnimationFrame(() => {
        actionStartTimeRef.current = performance.now();
      });

      const updateTimer = () => {
        if (!isActionActiveRef.current) return;

        if (actionStartTimeRef.current === -1) {
          rafRef.current = requestAnimationFrame(updateTimer);
          return;
        }

        const now = performance.now();
        const elapsed = now - actionStartTimeRef.current;
        const newRemaining = Math.max(
          0,
          roundInitialRemainingRef.current - elapsed,
        );

        if (timeTextRef.current) {
          timeTextRef.current.textContent = newRemaining.toFixed(0);
        }
        if (progressRingRef.current) {
          const maxTime = 3000;
          const progressPercentage = Math.max(
            0,
            Math.min(100, (newRemaining / maxTime) * 100),
          );
          const circleRadius = 140;
          const circleCircumference = 2 * Math.PI * circleRadius;
          const strokeDashoffset =
            circleCircumference -
            (progressPercentage / 100) * circleCircumference;
          progressRingRef.current.setAttribute(
            "stroke-dashoffset",
            strokeDashoffset.toString(),
          );
        }

        if (newRemaining <= 0) {
          setRemainingTime(0);
          handleGameOver("TIME_OVER", elapsed);
        } else {
          rafRef.current = requestAnimationFrame(updateTimer);
        }
      };
      rafRef.current = requestAnimationFrame(updateTimer);
    }, delay);
  }, [handleGameOver]);

  const resetGame = useCallback(() => {
    isActionActiveRef.current = false;
    setGameState("START");
    setRemainingTime(3000);
    setClearCount(0);
    setRawReactions([]);
    setLastReaction(null);
    setFailedReaction(null);
    setFailureType(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const initGame = useCallback(async () => {
    try {
      const res = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_type: deviceType }),
      });
      const data = await res.json();
      if (data.session_token) {
        setSessionToken(data.session_token);
      }
    } catch (e) {
      console.error(e);
    }

    clearPendingScore();

    isActionActiveRef.current = false;
    setGameState("WAITING");
    setRemainingTime(3000);
    setClearCount(0);
    setRawReactions([]);
    setLastReaction(null);
    setFailedReaction(null);
    setFailureType(null);
    scheduleNextAction();
  }, [scheduleNextAction, deviceType]);

  const handleClick = useCallback(
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

      const current = stateRef.current;
      if (current.gameState === "START") {
        initGame();
        return;
      }

      if (current.gameState === "WAITING") {
        handleGameOver("FALSE_START");
        return;
      }

      if (current.gameState === "ACTION") {
        isActionActiveRef.current = false;
        const now = performance.now();
        const startTime =
          actionStartTimeRef.current === -1 ? now : actionStartTimeRef.current;
        const reaction = now - startTime;

        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        if (reaction < 100) {
          handleGameOver("TOO_FAST", reaction);
          return;
        }

        if (reaction >= roundInitialRemainingRef.current) {
          handleGameOver("TIME_OVER", reaction);
          return;
        }

        const newRemaining = roundInitialRemainingRef.current - reaction;
        setRemainingTime(newRemaining);
        setLastReaction(reaction);
        setClearCount((c) => c + 1);
        setRawReactions((r) => [...r, reaction]);

        setGameState("INTERVAL");
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
          setGameState("WAITING");
          scheduleNextAction();
        }, 800);
      }
    },
    [initGame, handleGameOver, scheduleNextAction],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setDeviceType("PC");
        handleClick(e);
      }
    };
    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClick]);

  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState === "hidden" &&
        stateRef.current.gameState !== "START" &&
        stateRef.current.gameState !== "GAMEOVER"
      ) {
        handleGameOver("TAB_LEAVE");
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [handleGameOver]);

  useEffect(() => {
    document.body.classList.add("game-active");
    return () => document.body.classList.remove("game-active");
  }, []);

  // UI Setup based on state
  let bgEffect = "bg-[#050505]";
  let text = t("state_start");
  let textColor = "text-[#00f3ff]";
  let textShadow = "drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]";
  let ringColor = "stroke-[#00f3ff]";
  let ringGlow = "drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]";

  switch (gameState) {
    case "WAITING":
      bgEffect = "bg-[#050505] shadow-[inset_0_0_150px_rgba(255,0,0,0.15)]";
      text = t("state_waiting");
      textColor = "text-red-500";
      textShadow = "drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]";
      ringColor = "stroke-red-500";
      ringGlow = "drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]";
      break;
    case "ACTION":
      bgEffect = "bg-[#050505] shadow-[inset_0_0_200px_rgba(0,255,102,0.3)]";
      text = t("state_action");
      textColor = "text-[#00ff66]";
      textShadow = "drop-shadow-[0_0_20px_rgba(0,255,102,1)]";
      ringColor = "stroke-[#00ff66]";
      ringGlow = "drop-shadow-[0_0_12px_rgba(0,255,102,0.9)]";
      break;
    case "INTERVAL": {
      const rank =
        lastReaction !== null
          ? getReactionRank(lastReaction, deviceType)
          : "NORMAL";
      if (rank === "GODLIKE") {
        bgEffect = "bg-[#050505] shadow-[inset_0_0_300px_rgba(255,215,0,0.4)]";
        text = `-${lastReaction?.toFixed(1)}ms`;
        textColor = "text-[#ffd700]";
        textShadow = "drop-shadow-[0_0_30px_rgba(255,215,0,1)]";
        ringColor = "stroke-[#ffd700]";
        ringGlow = "drop-shadow-[0_0_20px_rgba(255,215,0,1)]";
      } else if (rank === "EXCELLENT") {
        bgEffect =
          "bg-[#050505] shadow-[inset_0_0_200px_rgba(255,100,255,0.3)]";
        text = `-${lastReaction?.toFixed(1)}ms`;
        textColor = "text-[#ff64ff]";
        textShadow = "drop-shadow-[0_0_20px_rgba(255,100,255,0.9)]";
        ringColor = "stroke-[#ff64ff]";
        ringGlow = "drop-shadow-[0_0_15px_rgba(255,100,255,0.9)]";
      } else {
        bgEffect = "bg-[#050505] shadow-[inset_0_0_150px_rgba(0,243,255,0.15)]";
        text = `-${lastReaction?.toFixed(1)}ms`;
        textColor = "text-[#00f3ff]";
        textShadow = "drop-shadow-[0_0_15px_rgba(0,243,255,0.8)]";
        ringColor = "stroke-[#00f3ff]";
        ringGlow = "drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]";
      }
      break;
    }
    case "GAMEOVER":
      bgEffect = "bg-[#050505]";
      break;
  }

  // HUD Progress Bar calculations
  const maxTime = 3000;
  const progressPercentage = Math.max(
    0,
    Math.min(100, (remainingTime / maxTime) * 100),
  );
  const circleRadius = 140;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset =
    circleCircumference - (progressPercentage / 100) * circleCircumference;

  const currentRank =
    gameState === "INTERVAL" && lastReaction !== null
      ? getReactionRank(lastReaction, deviceType)
      : "NORMAL";

  return (
    <div
      className={`relative w-full ${gameState === "GAMEOVER" ? "min-h-screen overflow-y-auto py-24 flex flex-col items-center justify-start" : "h-screen overflow-hidden flex flex-col items-center justify-center touch-none"} ${bgEffect} cursor-pointer select-none`}
      style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.pointerType === "touch") {
          setDeviceType("MOBILE");
          return;
        }
        setDeviceType("PC");
        handleClick(e);
      }}
      onPointerUp={(e) => {
        if (e.pointerType !== "touch") return;
        setDeviceType("MOBILE");
        handleClick(e);
      }}
    >
      <style>{`
        @keyframes game-shake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-10px, 10px) rotate(-1deg); }
          50% { transform: translate(10px, -10px) rotate(1deg); }
          75% { transform: translate(-10px, -10px) rotate(0deg); }
        }
        @keyframes game-pop {
          0% { transform: translate(-50%, -50%) scale(0.2) rotate(-10deg); opacity: 0; }
          20% { transform: translate(-50%, -50%) scale(1.3) rotate(5deg); opacity: 1; filter: brightness(1.5); }
          40% { transform: translate(-50%, -50%) scale(1.1) rotate(0deg); opacity: 1; filter: brightness(1.2); }
          80% { transform: translate(-50%, -50%) scale(1.1) rotate(0deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        @keyframes ripple-out {
          0% { transform: scale(1); opacity: 0.8; border-width: 6px; }
          100% { transform: scale(1.6); opacity: 0; border-width: 1px; }
        }
        @keyframes ripple-in {
          0% { transform: scale(1); opacity: 0.8; border-width: 6px; }
          100% { transform: scale(0.6); opacity: 0; border-width: 1px; }
        }
        .effect-shake {
          animation: game-shake 0.1s ease-in-out 4;
        }
        .effect-pop {
          animation: game-pop 0.6s ease-out forwards;
        }
        .effect-ripple-out {
          animation: ripple-out 0.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
        .effect-ripple-in {
          animation: ripple-in 0.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
      `}</style>

      {gameState === "INTERVAL" && currentRank !== "NORMAL" && (
        <div className="absolute top-1/2 left-1/2 pointer-events-none z-50 effect-pop">
          {currentRank === "GODLIKE" ? (
            <div className="text-6xl md:text-8xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-[#ffd700] to-[#ff8c00] drop-shadow-[0_0_20px_rgba(255,215,0,0.8)] whitespace-nowrap uppercase tracking-widest font-cyber">
              Godlike!
            </div>
          ) : (
            <div className="text-5xl md:text-7xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-[#ff64ff] to-[#bc13fe] drop-shadow-[0_0_20px_rgba(255,100,255,0.8)] whitespace-nowrap uppercase tracking-widest font-cyber">
              Excellent!
            </div>
          )}
        </div>
      )}

      {/* Cyber Grid Overlay for Game Active */}
      {gameState !== "START" && gameState !== "GAMEOVER" && (
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,243,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50 z-0"></div>
      )}

      {gameState !== "GAMEOVER" && (
        <div
          className={
            "relative z-10 flex flex-col items-center justify-center pointer-events-none" +
            (gameState === "INTERVAL" && currentRank === "GODLIKE"
              ? " effect-shake"
              : "")
          }
        >
          {/* Circular HUD Progress */}
          {gameState !== "START" && (
            <div className="relative flex items-center justify-center mb-8">
              {/* Ripple Effects (only in INTERVAL state) */}
              {gameState === "INTERVAL" && (
                <>
                  <div
                    className={`absolute rounded-full border-current pointer-events-none ${textColor} ${textShadow} effect-ripple-out`}
                    style={{ width: 280, height: 280 }}
                  ></div>
                  <div
                    className={`absolute rounded-full border-current pointer-events-none ${textColor} ${textShadow} effect-ripple-in`}
                    style={{ width: 280, height: 280 }}
                  ></div>
                </>
              )}

              <svg
                width="400"
                height="400"
                className="transform -rotate-90 overflow-visible"
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
                  strokeDashoffset={strokeDashoffset}
                  className={`${ringColor} ${ringGlow}`}
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

              {/* Inner Content inside the Ring */}
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-gray-400 font-cyber text-xs uppercase tracking-[0.3em] mb-1">
                  {t("hud_energy")}
                </span>
                <span
                  ref={timeTextRef}
                  className={`font-mono text-3xl font-bold ${textColor} ${textShadow}`}
                >
                  {remainingTime.toFixed(0)}
                </span>
                <span className="text-gray-500 font-cyber text-[10px] mt-1">
                  {t("unit_ms")}
                </span>
              </div>
            </div>
          )}

          {/* Main Action Text */}
          <h1
            className={`text-4xl sm:text-5xl md:text-7xl font-cyber font-black tracking-widest uppercase ${textColor} ${textShadow} z-10 ${gameState === "START" ? "animate-pulse cursor-pointer" : ""}`}
          >
            {text}
          </h1>

          {/* Sub Info */}
          {gameState !== "START" && (
            <div className="mt-8 flex gap-8 glass-panel px-8 py-3 rounded-full">
              <div className="flex flex-col items-center">
                <span className="text-gray-500 font-cyber text-xs uppercase tracking-widest">
                  {t("hud_score")}
                </span>
                <span className="text-[#00f3ff] font-bold font-mono text-xl">
                  {clearCount}
                </span>
              </div>
              <div className="w-px bg-white/10"></div>
              <div className="flex flex-col items-center">
                <span className="text-gray-500 font-cyber text-xs uppercase tracking-widest">
                  {t("hud_state")}
                </span>
                <span
                  className={`font-bold font-cyber text-sm tracking-widest mt-1 ${gameState === "ACTION" ? "text-[#00ff66]" : "text-gray-300"}`}
                >
                  {gameState === "ACTION"
                    ? t("state_active")
                    : t("state_locked")}
                </span>
              </div>
            </div>
          )}

          {gameState === "START" && (
            <p className="mt-6 text-gray-400 font-cyber tracking-widest uppercase text-sm border border-white/10 px-6 py-2 rounded-full bg-white/5">
              <span className="hidden md:inline">{t("instruction_pc")}</span>
              <span className="md:hidden inline">
                {t("instruction_mobile")}
              </span>
            </p>
          )}
        </div>
      )}

      {gameState === "GAMEOVER" && (
        <div
          className="z-20 w-full max-w-2xl px-4 my-auto cursor-default"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <ResultSection
            clearCount={clearCount}
            remainingTime={remainingTime}
            rawReactions={rawReactions}
            failedReaction={failedReaction}
            failureType={failureType}
            sessionToken={sessionToken}
            deviceType={deviceType}
            onRetry={resetGame}
          />
        </div>
      )}
    </div>
  );
};
