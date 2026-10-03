"use client";

import { Button } from "@/components/Button";
import { Header } from "@/components/Header";
import { Heading } from "@/components/Heading";
import { TitleBadge } from "@/features/title";
import { Avatar, CountryFlag } from "@/features/user";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type TitleItem = {
  id: string;
  name: string;
  category: string;
  condition: string;
  description: string;
  unlocked: boolean;
  unlockedAt: string | null;
  isSelected: boolean;
  progress?: {
    current: number;
    target: number;
    unit?: string;
  };
  badgeColor: {
    bg: string;
    border: string;
    text: string;
    glow: string;
  };
};

type PlayerDataResponse = {
  success: boolean;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    country: string | null;
    selectedTitle: string | null;
  };
  overall: {
    averageReaction: number | null;
    medianReaction: number | null;
    fastestReaction: number | null;
    currentRank: {
      pc: number | null;
      mobile: number | null;
    };
    highestRank: {
      pc: number | null;
      mobile: number | null;
    };
    excellentRate: number;
    godlikeRate: number;
  };
  gameMode: {
    bestScore: {
      clearCount: number;
      remainingTime: number;
    };
    playCount: number;
  };
  battleMode: {
    playCount: number;
    winCount: number;
    loseCount: number;
    drawCount: number;
    winRate: number;
  };
  titles: TitleItem[];
};

export const PlayerDataClient = () => {
  const t = useTranslations("PlayerData");
  const [data, setData] = useState<PlayerDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");
  const [equippingId, setEquippingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/player-data");
      if (!res.ok) {
        throw new Error("Failed to load player data");
      }
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const initData = async () => {
      try {
        const res = await fetch("/api/user/player-data");
        if (!res.ok) {
          throw new Error("Failed to load player data");
        }
        const json = await res.json();
        if (!ignore) {
          setData(json);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Error");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    initData();
    return () => {
      ignore = true;
    };
  }, []);

  const handleEquipTitle = async (titleId: string | null) => {
    if (!data) return;
    setEquippingId(titleId ?? "none");
    try {
      const res = await fetch("/api/user/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleId }),
      });
      if (res.ok) {
        // ローカルstateを即時反映
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            user: { ...prev.user, selectedTitle: titleId },
            titles: prev.titles.map((t) => ({
              ...t,
              isSelected: t.id === titleId,
            })),
          };
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEquippingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center">
        <Header />
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00f3ff]/20 border-t-[#00f3ff] rounded-full animate-spin shadow-[0_0_20px_#00f3ff]" />
          <p className="font-cyber text-sm tracking-widest text-[#00f3ff] animate-pulse">
            LOADING PLAYER DATA...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4">
        <Header />
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center border-red-500/30">
          <p className="text-red-400 font-cyber mb-4">{error || "Error"}</p>
          <Button onClick={fetchData} variant="primary">
            RETRY
          </Button>
        </div>
      </div>
    );
  }

  const filteredTitles = data.titles.filter((item) => {
    if (filter === "unlocked") return item.unlocked;
    if (filter === "locked") return !item.unlocked;
    return true;
  });

  const unlockedCount = data.titles.filter((t) => t.unlocked).length;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col relative overflow-x-hidden">
      {/* Background neon ambient lights */}
      <div className="absolute top-0 left-1/4 w-150 h-150 bg-[#00f3ff] rounded-full blur-[180px] opacity-10 pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-150 h-150 bg-[#bc13fe] rounded-full blur-[200px] opacity-10 pointer-events-none" />

      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 pt-24 md:pt-28 pb-16 flex flex-col gap-8 relative z-10">
        {/* Navigation & Page Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/"
                className="text-xs font-cyber text-gray-400 hover:text-[#00f3ff] flex items-center gap-1 transition-colors"
              >
                <span>◀</span> {t("btn_back")}
              </Link>
            </div>
            <Heading
              as="h1"
              variant="gradient"
              className="text-3xl! md:text-5xl!"
            >
              {t("title")}
            </Heading>
            <p className="text-sm md:text-base text-gray-400 font-cyber tracking-widest mt-1">
              {t("subtitle")}
            </p>
          </div>

          {/* User Profile Card Summary */}
          <div className="glass-panel p-4 md:px-6 md:py-4 rounded-xl flex items-center gap-4 border-l-4 border-l-[#00f3ff]">
            <Avatar
              src={data.user.image}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-[#00f3ff] shadow-[0_0_12px_rgba(0,243,255,0.4)] object-cover"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-cyber font-bold text-lg text-white tracking-wider">
                  {data.user.name || "Guest"}
                </span>
                {data.user.country && (
                  <CountryFlag countryCode={data.user.country} />
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                {data.user.selectedTitle ? (
                  <TitleBadge titleId={data.user.selectedTitle} size="sm" />
                ) : (
                  <span className="text-xs text-gray-500 font-cyber">
                    {t("main_title")}: {t("none_selected")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 1. 総合データセクション (Overall Analytics) */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#00f3ff] shadow-[0_0_10px_#00f3ff]" />
            <h2 className="font-cyber font-bold text-xl md:text-2xl text-white tracking-widest uppercase">
              {t("section_overall")}
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {/* 平均速度 */}
            <div className="glass-panel p-4 rounded-xl flex flex-col justify-between border-t-2 border-t-[#00f3ff]">
              <span className="text-xs text-gray-400 font-cyber tracking-wider">
                {t("avg_reaction")}
              </span>
              <div className="mt-2 text-2xl md:text-3xl font-mono font-bold text-[#00f3ff] drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">
                {data.overall.averageReaction !== null
                  ? `${data.overall.averageReaction.toFixed(1)}ms`
                  : "--"}
              </div>
            </div>

            {/* 中央値 */}
            <div className="glass-panel p-4 rounded-xl flex flex-col justify-between border-t-2 border-t-[#00f3ff]">
              <span className="text-xs text-gray-400 font-cyber tracking-wider">
                {t("median_reaction")}
              </span>
              <div className="mt-2 text-2xl md:text-3xl font-mono font-bold text-[#00f3ff] drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">
                {data.overall.medianReaction !== null
                  ? `${data.overall.medianReaction.toFixed(1)}ms`
                  : "--"}
              </div>
            </div>

            {/* 最速速度 */}
            <div className="glass-panel p-4 rounded-xl flex flex-col justify-between border-t-2 border-t-yellow-400">
              <span className="text-xs text-gray-400 font-cyber tracking-wider">
                {t("fastest_reaction")}
              </span>
              <div className="mt-2 text-2xl md:text-3xl font-mono font-bold text-yellow-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                {data.overall.fastestReaction !== null
                  ? `${data.overall.fastestReaction.toFixed(1)}ms`
                  : "--"}
              </div>
            </div>

            {/* Excellent率 & Godlike率 */}
            <div className="glass-panel p-4 rounded-xl flex flex-col justify-between border-t-2 border-t-[#bc13fe]">
              <span className="text-xs text-gray-400 font-cyber tracking-wider">
                {t("rate_excellent")} / {t("rate_godlike")}
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl md:text-2xl font-mono font-bold text-cyan-300">
                  {data.overall.excellentRate}%
                </span>
                <span className="text-xs text-gray-400">/</span>
                <span className="text-xl md:text-2xl font-mono font-bold text-yellow-300">
                  {data.overall.godlikeRate}%
                </span>
              </div>
            </div>

            {/* 現在の順位 (PC) */}
            <div className="glass-panel p-4 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-gray-400 font-cyber tracking-wider">
                {t("current_rank")} (PC)
              </span>
              <div className="mt-2 flex items-baseline gap-1 text-2xl md:text-3xl font-mono font-bold text-white">
                {data.overall.currentRank.pc !== null ? (
                  <span className="text-[#00f3ff]">
                    #{data.overall.currentRank.pc}
                  </span>
                ) : (
                  <span className="text-gray-500">--</span>
                )}
                {data.overall.highestRank.pc !== null && (
                  <span className="text-xs text-gray-400 font-normal ml-2">
                    {t("highest_rank")}: #{data.overall.highestRank.pc}
                  </span>
                )}
              </div>
            </div>

            {/* 現在の順位 (MOBILE) */}
            <div className="glass-panel p-4 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-gray-400 font-cyber tracking-wider">
                {t("current_rank")} (MOBILE)
              </span>
              <div className="mt-2 flex items-baseline gap-1 text-2xl md:text-3xl font-mono font-bold text-white">
                {data.overall.currentRank.mobile !== null ? (
                  <span className="text-[#00ff66]">
                    #{data.overall.currentRank.mobile}
                  </span>
                ) : (
                  <span className="text-gray-500">--</span>
                )}
                {data.overall.highestRank.mobile !== null && (
                  <span className="text-xs text-gray-400 font-normal ml-2">
                    {t("highest_rank")}: #{data.overall.highestRank.mobile}
                  </span>
                )}
              </div>
            </div>

            {/* 最高順位サマリー */}
            <div className="glass-panel p-4 rounded-xl flex flex-col justify-between col-span-2">
              <span className="text-xs text-gray-400 font-cyber tracking-wider">
                {t("highest_rank")} (PC / MOBILE)
              </span>
              <div className="mt-2 flex items-center gap-6">
                <div>
                  <span className="text-xs text-gray-500 block">PC</span>
                  <span className="font-mono text-xl font-bold text-[#00f3ff]">
                    {data.overall.highestRank.pc
                      ? `#${data.overall.highestRank.pc}`
                      : "--"}
                  </span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div>
                  <span className="text-xs text-gray-500 block">MOBILE</span>
                  <span className="font-mono text-xl font-bold text-[#00ff66]">
                    {data.overall.highestRank.mobile
                      ? `#${data.overall.highestRank.mobile}`
                      : "--"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. ゲームモード & バトルモード 2カラムセクション */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ゲームモード */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-5 border-l-4 border-l-[#00ff66]">
            <div className="flex justify-between items-center">
              <h3 className="font-cyber font-bold text-lg md:text-xl text-white tracking-widest uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
                {t("section_game_mode")}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                <span className="text-xs text-gray-400 font-cyber block mb-1">
                  {t("best_score")}
                </span>
                <div className="text-3xl font-mono font-bold text-white drop-shadow-[0_0_8px_rgba(0,255,102,0.4)]">
                  {data.gameMode.bestScore.clearCount}
                  <span className="text-sm font-sans text-gray-400 ml-1">
                    {t("times_unit")}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1 font-mono">
                  {t("rem_time")}:{" "}
                  {data.gameMode.bestScore.remainingTime.toFixed(1)}ms
                </div>
              </div>

              <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                <span className="text-xs text-gray-400 font-cyber block mb-1">
                  {t("play_count")}
                </span>
                <div className="text-3xl font-mono font-bold text-white">
                  {data.gameMode.playCount}
                  <span className="text-sm font-sans text-gray-400 ml-1">
                    {t("times_unit")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* バトルモード */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-5 border-l-4 border-l-[#bc13fe]">
            <div className="flex justify-between items-center">
              <h3 className="font-cyber font-bold text-lg md:text-xl text-white tracking-widest uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#bc13fe] animate-pulse" />
                {t("section_battle_mode")}
              </h3>
              <div className="font-mono text-sm px-2.5 py-1 rounded bg-[#bc13fe]/20 text-[#d866ff] border border-[#bc13fe]/40">
                {t("win_rate")}: {data.battleMode.winRate}%
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 md:gap-3">
              <div className="bg-black/40 p-3 rounded-xl border border-white/5 text-center">
                <span className="text-[10px] text-gray-400 font-cyber block mb-1">
                  {t("play_count")}
                </span>
                <span className="text-xl md:text-2xl font-mono font-bold text-white">
                  {data.battleMode.playCount}
                </span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5 text-center">
                <span className="text-[10px] text-emerald-400 font-cyber block mb-1">
                  {t("win_count")}
                </span>
                <span className="text-xl md:text-2xl font-mono font-bold text-emerald-300">
                  {data.battleMode.winCount}
                </span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5 text-center">
                <span className="text-[10px] text-rose-400 font-cyber block mb-1">
                  {t("lose_count")}
                </span>
                <span className="text-xl md:text-2xl font-mono font-bold text-rose-300">
                  {data.battleMode.loseCount}
                </span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-white/5 text-center">
                <span className="text-[10px] text-yellow-400 font-cyber block mb-1">
                  {t("draw_count")}
                </span>
                <span className="text-xl md:text-2xl font-mono font-bold text-yellow-300">
                  {data.battleMode.drawCount}
                </span>
              </div>
            </div>

            {/* 勝率バー */}
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mt-1">
              <div
                className="bg-linear-to-r from-[#bc13fe] to-[#00f3ff] h-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, data.battleMode.winRate))}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* 3. 称号セクション (Titles & Badges) */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-6 bg-[#bc13fe] shadow-[0_0_10px_#bc13fe]" />
              <div>
                <h2 className="font-cyber font-bold text-xl md:text-2xl text-white tracking-widest uppercase">
                  {t("section_titles")}
                </h2>
                <span className="text-xs text-gray-400 font-cyber">
                  {unlockedCount} / {data.titles.length} UNLOCKED
                </span>
              </div>
            </div>

            {/* フィルタタブ */}
            <div className="flex gap-2 p-1 bg-black/60 rounded-xl border border-white/10">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-cyber tracking-wider transition-all ${
                  filter === "all"
                    ? "bg-[#00f3ff] text-black font-bold shadow-[0_0_10px_rgba(0,243,255,0.5)]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t("tab_all")}
              </button>
              <button
                onClick={() => setFilter("unlocked")}
                className={`px-3 py-1.5 rounded-lg text-xs font-cyber tracking-wider transition-all ${
                  filter === "unlocked"
                    ? "bg-[#00f3ff] text-black font-bold shadow-[0_0_10px_rgba(0,243,255,0.5)]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t("tab_unlocked")} ({unlockedCount})
              </button>
              <button
                onClick={() => setFilter("locked")}
                className={`px-3 py-1.5 rounded-lg text-xs font-cyber tracking-wider transition-all ${
                  filter === "locked"
                    ? "bg-[#00f3ff] text-black font-bold shadow-[0_0_10px_rgba(0,243,255,0.5)]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t("tab_locked")} ({data.titles.length - unlockedCount})
              </button>
            </div>
          </div>

          {/* 称号グリッド */}
          {filteredTitles.length === 0 ? (
            <div className="glass-panel p-12 text-center text-gray-500 font-cyber">
              {t("no_titles")}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTitles.map((item) => {
                const { bg, border, text, glow } = item.badgeColor;
                const isSelected = item.isSelected;
                const isProcessing = equippingId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`glass-panel p-5 rounded-2xl flex flex-col justify-between transition-all relative overflow-hidden group ${
                      item.unlocked
                        ? `${border} border hover:scale-[1.01] ${glow}`
                        : "border border-white/5 opacity-60 bg-black/60"
                    }`}
                  >
                    {/* 上部: 称号バッジ & 状態 */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-cyber font-bold tracking-widest uppercase border ${
                            item.unlocked
                              ? `${bg} ${border} ${text} ${glow}`
                              : "bg-white/5 border-white/10 text-gray-500"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.unlocked
                                ? "bg-current animate-pulse"
                                : "bg-gray-600"
                            }`}
                          />
                          {item.name}
                        </span>

                        {isSelected && (
                          <span className="text-[10px] font-cyber font-bold px-2 py-0.5 rounded-full bg-[#00ff66]/20 border border-[#00ff66] text-[#00ff66] tracking-wider animate-pulse shadow-[0_0_8px_rgba(0,255,102,0.4)]">
                            {t("equipped")}
                          </span>
                        )}
                        {!item.unlocked && (
                          <span className="text-[10px] font-cyber px-2 py-0.5 rounded bg-white/5 text-gray-500">
                            🔒 {t("locked")}
                          </span>
                        )}
                      </div>

                      {/* 説明 & フレーバー */}
                      <p className="text-xs text-gray-300 mb-2 leading-relaxed">
                        {item.description}
                      </p>

                      {/* 解除条件 */}
                      <div className="text-[11px] text-gray-400 bg-black/40 p-2.5 rounded-lg border border-white/5">
                        <span className="text-[#00f3ff] font-cyber mr-1">
                          {t("condition")}
                        </span>
                        {item.condition}
                      </div>

                      {/* 進捗プログレスバー（未獲得かつ進行度がある場合） */}
                      {!item.unlocked && item.progress && (
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] font-cyber text-gray-400 mb-1">
                            <span>{t("progress")}</span>
                            <span>
                              {item.progress.current} / {item.progress.target}{" "}
                              {item.progress.unit}
                            </span>
                          </div>
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#00f3ff] h-full transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (item.progress.current /
                                    item.progress.target) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 下部アクション（獲得済みの場合のみ装着/解除） */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                      {item.unlocked ? (
                        <>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {item.unlockedAt
                              ? `${t("unlocked_at")}${new Date(
                                  item.unlockedAt,
                                ).toLocaleDateString()}`
                              : ""}
                          </span>

                          {isSelected ? (
                            <button
                              disabled={isProcessing}
                              onClick={() => handleEquipTitle(null)}
                              className="text-xs font-cyber tracking-widest text-red-400 hover:text-red-300 py-1 px-3 rounded hover:bg-red-500/10 transition-colors"
                            >
                              {t("btn_unequip")}
                            </button>
                          ) : (
                            <button
                              disabled={isProcessing}
                              onClick={() => handleEquipTitle(item.id)}
                              className="text-xs font-cyber tracking-widest text-[#00f3ff] hover:text-white py-1 px-3 rounded bg-[#00f3ff]/10 hover:bg-[#00f3ff]/20 border border-[#00f3ff]/30 transition-all shadow-[0_0_8px_rgba(0,243,255,0.2)]"
                            >
                              {t("btn_equip")}
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-gray-600 font-cyber">
                          SYSTEM LOCKED
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
