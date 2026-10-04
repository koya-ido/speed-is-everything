"use client";

import type { BattleRoundLog } from "@/features/battle/types";
import { Flame, ScrollText, X } from "lucide-react";
import { useTranslations } from "next-intl";

type BattleRoundLogModalProps = {
  isOpen: boolean;
  logs: BattleRoundLog[];
  isSpectator?: boolean;
  playerName?: string;
  opponentName?: string;
  onClose: () => void;
};

export const BattleRoundLogModal = ({
  isOpen,
  logs,
  isSpectator = false,
  playerName,
  opponentName,
  onClose,
}: BattleRoundLogModalProps) => {
  const t = useTranslations("Battle");

  if (!isOpen) return null;

  const formatFoul = (foul: BattleRoundLog["playerFoul"]) =>
    foul === "early_click" ? t("log_foul_early") : t("log_foul_invalid");

  const formatTime = (time: number | null) =>
    time === null ? "-" : `${time.toFixed(1)}ms`;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel max-w-xl w-full max-h-[85vh] rounded-2xl md:rounded-3xl border border-gray-700/80 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-800 bg-black/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400">
              <ScrollText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-cyber font-bold text-base md:text-lg text-white tracking-wide">
                {t("log_title")}
              </h3>
              <p className="text-[11px] md:text-xs font-mono text-gray-400">
                {t("log_summary", { count: logs.length })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("log_close")}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pr-3.5 space-y-3 font-mono custom-scrollbar">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              {t("log_empty")}
            </div>
          ) : (
            logs.map((log) => {
              const isPlayerWin = log.winner === "player";
              const isOpponentWin = log.winner === "opponent";
              const isRoundDraw = log.winner === "draw";
              const playerNameClass = isRoundDraw
                ? "text-gray-400"
                : isPlayerWin
                  ? "text-[#00f3ff]"
                  : "text-[#ff0055]";
              const opponentNameClass = isRoundDraw
                ? "text-gray-400"
                : isOpponentWin
                  ? "text-[#00f3ff]"
                  : "text-[#ff0055]";
              const roundWinnerName = isPlayerWin
                ? (playerName ?? t("log_you"))
                : (opponentName ?? t("log_opponent"));

              return (
                <div
                  key={log.round}
                  className={`p-3.5 rounded-xl border bg-black/60 transition-all ${
                    isPlayerWin
                      ? "border-[#00f3ff]/40 shadow-[0_0_12px_rgba(0,243,255,0.1)]"
                      : isOpponentWin
                        ? "border-[#ff0055]/40 shadow-[0_0_12px_rgba(255,0,85,0.1)]"
                        : "border-gray-700/60"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-800/80">
                    <span className="font-cyber font-bold text-xs md:text-sm text-gray-300 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-[10px]">
                        {t("log_round_short", { round: log.round })}
                      </span>
                      <span>{t("log_round", { round: log.round })}</span>
                    </span>
                    <span
                      className={`text-xs font-cyber font-bold px-2 py-0.5 rounded-full ${
                        isPlayerWin
                          ? "bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]/40"
                          : isOpponentWin
                            ? "bg-[#ff0055]/20 text-[#ff0055] border border-[#ff0055]/40"
                            : "bg-gray-700/50 text-gray-300 border border-gray-600"
                      }`}
                    >
                      {isSpectator && !isRoundDraw
                        ? t("log_named_win", { name: roundWinnerName })
                        : isPlayerWin
                          ? t("log_player_win")
                          : isOpponentWin
                            ? t("log_opponent_win")
                            : t("log_draw")}
                    </span>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1 text-xs">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`text-[10px] font-bold truncate ${playerNameClass}`}
                      >
                        {playerName || t("log_you")}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`font-bold font-mono ${
                            log.playerFoul
                              ? "text-red-400 text-[11px]"
                              : "text-white text-sm"
                          }`}
                        >
                          {log.playerFoul
                            ? formatFoul(log.playerFoul)
                            : formatTime(log.playerTime)}
                        </span>
                        {log.playerRank && !log.playerFoul && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-cyber font-bold ${
                              log.playerRank === "GODLIKE"
                                ? "bg-yellow-500/20 text-yellow-300 border border-yellow-400/40"
                                : log.playerRank === "EXCELLENT"
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-400/40"
                                  : "bg-blue-500/20 text-blue-300 border border-blue-400/40"
                            }`}
                          >
                            {log.playerRank}
                          </span>
                        )}
                      </div>
                      {log.playerComboBefore > 0 && (
                        <span className="text-[10px] text-[#00ff66] flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5 fill-[#00ff66]" />
                          {t("log_combo", { count: log.playerComboBefore })}
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] font-cyber font-bold text-gray-600 px-1">
                      VS
                    </div>

                    <div className="flex flex-col gap-1 text-right">
                      <span
                        className={`text-[10px] font-bold truncate ${opponentNameClass}`}
                      >
                        {opponentName === "Opponent"
                          ? t("log_opponent")
                          : opponentName || t("log_opponent")}
                      </span>
                      <div className="flex items-center gap-1.5 justify-end flex-wrap">
                        {log.opponentRank && !log.opponentFoul && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-cyber font-bold ${
                              log.opponentRank === "GODLIKE"
                                ? "bg-yellow-500/20 text-yellow-300 border border-yellow-400/40"
                                : log.opponentRank === "EXCELLENT"
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-400/40"
                                  : "bg-blue-500/20 text-blue-300 border border-blue-400/40"
                            }`}
                          >
                            {log.opponentRank}
                          </span>
                        )}
                        <span
                          className={`font-bold font-mono ${
                            log.opponentFoul
                              ? "text-red-400 text-[11px]"
                              : "text-white text-sm"
                          }`}
                        >
                          {log.opponentFoul
                            ? formatFoul(log.opponentFoul)
                            : formatTime(log.opponentTime)}
                        </span>
                      </div>
                      {log.opponentComboBefore > 0 && (
                        <span className="text-[10px] text-[#ff0055] flex items-center gap-0.5 justify-end">
                          <Flame className="w-2.5 h-2.5 fill-[#ff0055]" />
                          {t("log_combo", { count: log.opponentComboBefore })}
                        </span>
                      )}
                    </div>
                  </div>

                  {!isRoundDraw && log.damage > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-800/60 flex items-center justify-between text-[11px] text-gray-400">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>
                          {t("log_difference")}:{" "}
                          <span className="text-white font-bold">
                            {log.playerTime !== null &&
                            log.opponentTime !== null
                              ? Math.abs(
                                  log.playerTime - log.opponentTime,
                                ).toFixed(1)
                              : "0.0"}
                            ms
                          </span>
                        </span>
                        {log.appliedRankMult && log.appliedRankMult > 1 && (
                          <span className="text-yellow-400 font-bold">
                            {t("log_rank_multiplier", {
                              multiplier: log.appliedRankMult.toFixed(1),
                            })}
                          </span>
                        )}
                        {log.appliedComboMult && log.appliedComboMult > 1 && (
                          <span
                            className={`font-bold ${
                              log.appliedBonusType === "GODLIKE"
                                ? "text-yellow-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {t("log_combo_multiplier", {
                              multiplier: log.appliedComboMult.toFixed(1),
                            })}
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-cyber font-bold text-xs ${
                          isPlayerWin ? "text-[#00f3ff]" : "text-[#ff0055]"
                        }`}
                      >
                        {t(
                          isPlayerWin ? "log_damage_dealt" : "log_damage_taken",
                          {
                            damage: log.damage.toFixed(1),
                          },
                        )}
                      </span>
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                    <span>
                      {t("log_player_hp", {
                        hp: log.playerHpAfter.toFixed(1),
                      })}
                    </span>
                    <span>
                      {t("log_opponent_hp", {
                        hp: log.opponentHpAfter.toFixed(1),
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-gray-800 bg-black/50">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-gray-700 hover:border-gray-500 bg-gray-800/60 hover:bg-gray-800 text-gray-200 font-mono text-xs tracking-wider transition-all cursor-pointer"
          >
            {t("log_close")}
          </button>
        </div>
      </div>
    </div>
  );
};
