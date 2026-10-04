"use client";

import type { BattlePlayerState } from "@/features/battle/types";
import { AlertTriangle, RotateCcw, ScrollText, Users } from "lucide-react";
import { useTranslations } from "next-intl";

type BattleMatchResultModalProps = {
  isOpen: boolean;
  isSpectator?: boolean;
  winner: "player" | "opponent" | "draw" | null;
  finishReason: "hp_zero" | "foul" | "opponent_left" | "both_hp_zero" | null;
  player: Pick<BattlePlayerState, "userName" | "hp" | "combo">;
  opponent: Pick<BattlePlayerState, "userName" | "hp" | "combo"> | null;
  opponentReturnedToLobby: boolean;
  rematchRequestedByMe: boolean;
  rematchRequestedByOpponent: boolean;
  spectatorCount: number;
  onOpenBattleLog: () => void;
  onRequestRematch: () => void;
  onReturnToLobby: () => void;
};

export const BattleMatchResultModal = ({
  isOpen,
  isSpectator = false,
  winner,
  finishReason,
  player,
  opponent,
  opponentReturnedToLobby,
  rematchRequestedByMe,
  rematchRequestedByOpponent,
  spectatorCount,
  onOpenBattleLog,
  onRequestRematch,
  onReturnToLobby,
}: BattleMatchResultModalProps) => {
  const t = useTranslations("Battle");

  if (!isOpen) return null;

  const resultDescription =
    winner === "player"
      ? finishReason === "foul"
        ? t("match_win_foul")
        : finishReason === "opponent_left"
          ? t("match_win_opponent_left")
          : t("match_win_hp")
      : winner === "opponent"
        ? finishReason === "foul"
          ? t("match_lose_foul")
          : t("match_lose_hp")
        : t("match_draw_description");
  const spectatorResultDescription =
    finishReason === "foul"
      ? winner === "draw"
        ? t("spectator_draw_foul")
        : t("spectator_result_foul")
      : finishReason === "opponent_left"
        ? t("spectator_result_opponent_left")
        : winner === "draw"
          ? t("spectator_draw_simultaneous")
          : t("spectator_result_hp");

  const rematchLabel = rematchRequestedByMe
    ? t("rematch_requested")
    : rematchRequestedByOpponent
      ? t("rematch_accept")
      : t("rematch");
  const rematchStatus = rematchRequestedByMe
    ? opponentReturnedToLobby
      ? null
      : rematchRequestedByOpponent
        ? t("rematch_wait_start")
        : t("rematch_wait_opponent")
    : rematchRequestedByOpponent
      ? t("rematch_incoming")
      : null;
  const playerLostByFoul =
    !isSpectator && winner === "opponent" && finishReason === "foul";
  const playerHp = playerLostByFoul ? 0 : player.hp;
  const playerCardClass =
    winner === "draw"
      ? "border-gray-500/60 shadow-[0_0_20px_rgba(156,163,175,0.2)]"
      : winner === "player"
        ? "border-[#00ff66]/70 shadow-[0_0_20px_rgba(0,255,102,0.35)]"
        : winner === "opponent"
          ? "border-[#ff0055]/70 shadow-[0_0_20px_rgba(255,0,85,0.35)]"
          : "border-gray-800";
  const opponentCardClass =
    winner === "draw"
      ? "border-gray-500/60 shadow-[0_0_20px_rgba(156,163,175,0.2)]"
      : winner === "opponent"
        ? "border-[#00ff66]/70 shadow-[0_0_20px_rgba(0,255,102,0.35)]"
        : winner === "player"
          ? "border-[#ff0055]/70 shadow-[0_0_20px_rgba(255,0,85,0.35)]"
          : "border-gray-800";
  const playerHpClass =
    winner === "draw"
      ? "text-gray-300"
      : winner === "player"
        ? "text-[#00f3ff]"
        : "text-[#ff0055]";
  const opponentHpClass =
    winner === "draw"
      ? "text-gray-300"
      : winner === "opponent"
        ? "text-[#00f3ff]"
        : "text-[#ff0055]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
      <div className="glass-panel p-6 md:p-10 rounded-3xl max-w-lg w-full border border-gray-700 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center gap-6 text-center animate-in zoom-in-95">
        <div className="flex flex-col items-center gap-2">
          <span
            className={`text-4xl md:text-6xl font-cyber font-black ${
              isSpectator
                ? "text-[#00f3ff] drop-shadow-[0_0_30px_rgba(0,243,255,0.6)]"
                : winner === "player"
                  ? "text-transparent bg-clip-text bg-linear-to-r from-[#00ff66] via-yellow-300 to-[#00f3ff] drop-shadow-[0_0_30px_rgba(0,255,102,0.8)]"
                  : winner === "opponent"
                    ? "text-[#ff0055] drop-shadow-[0_0_30px_rgba(255,0,85,0.8)]"
                    : "text-gray-300"
            }`}
          >
            {isSpectator
              ? t("match_result")
              : winner === "player"
                ? t("victory")
                : winner === "opponent"
                  ? t("defeat")
                  : t("match_draw")}
          </span>
          <span
            className={`text-sm font-mono ${
              winner === "player"
                ? "text-[#00ff66]"
                : winner === "opponent"
                  ? "text-[#ff0055]"
                  : "text-gray-400"
            }`}
          >
            {isSpectator ? spectatorResultDescription : resultDescription}
          </span>
        </div>

        <div className="w-full grid grid-cols-2 gap-3 py-3 border-y border-gray-800 font-mono text-xs">
          <div className="flex flex-col gap-1">
            {isSpectator && winner && (
              <span
                className={`text-center text-[10px] font-bold tracking-widest ${
                  winner === "draw"
                    ? "text-gray-300"
                    : winner === "player"
                      ? "text-[#00ff66]"
                      : "text-[#ff0055]"
                }`}
              >
                {winner === "draw"
                  ? t("match_draw")
                  : winner === "player"
                    ? t("match_winner")
                    : t("match_loser")}
              </span>
            )}
            <div
              className={`flex flex-col gap-1 text-left bg-black/40 p-3 rounded-xl border ${playerCardClass}`}
            >
              <span className="text-gray-400">
                {isSpectator ? player.userName : t("match_you")}
              </span>
              <span className={`text-sm font-bold ${playerHpClass}`}>
                {t("match_hp", { hp: playerHp.toFixed(1) })}
              </span>
              <span className="text-gray-400">
                {t("match_max_combo", { combo: player.combo })}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {isSpectator && winner && (
              <span
                className={`text-center text-[10px] font-bold tracking-widest ${
                  winner === "draw"
                    ? "text-gray-300"
                    : winner === "opponent"
                      ? "text-[#00ff66]"
                      : "text-[#ff0055]"
                }`}
              >
                {winner === "draw"
                  ? t("match_draw")
                  : winner === "opponent"
                    ? t("match_winner")
                    : t("match_loser")}
              </span>
            )}
            <div
              className={`flex flex-col gap-1 text-right bg-black/40 p-3 rounded-xl border ${opponentCardClass}`}
            >
              <span className="text-gray-400">
                {opponent?.userName === "Opponent"
                  ? t("log_opponent")
                  : opponent?.userName || t("log_opponent")}
              </span>
              <span className={`text-sm font-bold ${opponentHpClass}`}>
                {t("match_hp", {
                  hp: opponent ? opponent.hp.toFixed(1) : "0.0",
                })}
              </span>
              <span className="text-gray-400">
                {t("match_max_combo", { combo: opponent?.combo || 0 })}
              </span>
            </div>
          </div>
        </div>

        {spectatorCount > 0 && (
          <p className="w-full rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-3 text-xs text-yellow-200">
            {t("spectators_waiting", { count: spectatorCount })}
          </p>
        )}

        {!isSpectator && opponentReturnedToLobby && rematchRequestedByMe && (
          <div className="w-full p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono text-center flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-400">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{t("rematch_opponent_returned")}</span>
            </div>
            <p className="text-gray-300 leading-relaxed">
              {t("rematch_opponent_returned_description")}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 w-full">
          <button
            type="button"
            onClick={onOpenBattleLog}
            className="w-full py-3 rounded-xl border border-yellow-500/40 hover:border-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 font-cyber font-bold text-sm tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(234,179,8,0.2)] active:scale-95"
          >
            <ScrollText className="w-4 h-4 text-yellow-400" />
            <span>{t("match_view_log")}</span>
          </button>

          {!isSpectator && rematchStatus && (
            <p className="text-xs text-gray-400" aria-live="polite">
              {rematchStatus}
            </p>
          )}

          {!isSpectator &&
            !(opponentReturnedToLobby && rematchRequestedByMe) && (
              <button
                type="button"
                disabled={rematchRequestedByMe}
                onClick={onRequestRematch}
                className={`w-full py-4 rounded-xl font-cyber font-bold text-lg tracking-wider flex items-center justify-center gap-2 transition-all ${
                  rematchRequestedByMe
                    ? "bg-gray-800 text-gray-400 border border-gray-700 cursor-not-allowed"
                    : "bg-[#00f3ff] hover:bg-[#33f6ff] text-black shadow-[0_0_25px_rgba(0,243,255,0.6)] active:scale-95 cursor-pointer"
                }`}
              >
                <RotateCcw className="w-5 h-5" />
                {rematchLabel}
              </button>
            )}

          <button
            type="button"
            onClick={onReturnToLobby}
            className={`w-full py-3.5 rounded-xl border font-mono text-sm tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.5)] active:scale-95 ${
              opponentReturnedToLobby && rematchRequestedByMe
                ? "border-[#00ff66] bg-[#00ff66]/20 text-[#00ff66] hover:bg-[#00ff66]/30 shadow-[0_0_25px_rgba(0,255,102,0.4)] animate-pulse font-bold"
                : "border-gray-700 hover:border-[#00f3ff]/50 bg-black/40 hover:bg-[#00f3ff]/10 text-gray-300 hover:text-[#00f3ff]"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t(isSpectator ? "exit_match" : "match_return_lobby")}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
