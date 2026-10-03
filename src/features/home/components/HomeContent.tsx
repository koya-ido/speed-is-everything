"use client";

import { Heading } from "@/components/Heading";
import {
  BattleLobbyModal,
  BattleSelectModal,
  InitialHpOption,
} from "@/features/battle";
import { GameStartLink } from "@/features/game";
import { HOME_MODE_COOKIE } from "@/features/home/constants";
import { Link, useRouter } from "@/i18n/routing";
import { ChartSplineIcon, Swords, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type HomeContentProps = {
  isLoggedIn: boolean;
  defaultUserName?: string;
  initialMode?: "single" | "battle";
};

export const HomeContent = ({
  isLoggedIn,
  defaultUserName,
  initialMode = "single",
}: HomeContentProps) => {
  const t = useTranslations("HomePage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room");

  const [mode, setModeState] = useState<"single" | "battle">(initialMode);
  const [lobbyModal, setLobbyModal] = useState<
    "none" | "select" | "create" | "join"
  >("none");
  const hasAutoOpenedRef = useRef(false);

  // 選択したモードをCookieに保存し、次回のSSR時に初期表示へ反映する
  const setMode = (next: "single" | "battle") => {
    setModeState(next);
    document.cookie = `${HOME_MODE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  };

  // URLに ?room=... があれば自動的にバトルモードにし、参加専用モーダルを開く
  useEffect(() => {
    if (roomParam && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true;
      setMode("battle");
      setLobbyModal("join");
    }
  }, [roomParam]);

  const handleStartBattle = (config: {
    roomId: string;
    isHost: boolean;
    initialHp: InitialHpOption;
    userName: string;
  }) => {
    setLobbyModal("none");
    const params = new URLSearchParams();
    params.set("room", config.roomId);
    if (config.isHost) {
      params.set("host", "true");
    }
    if (config.initialHp) {
      params.set("hp", config.initialHp.toString());
    }
    if (config.userName) {
      params.set("name", config.userName);
    }
    router.push(`/battle?${params.toString()}`);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full items-stretch">
        {/* Left Column: Mode Selector, Action Panel & Links */}
        <div className="flex flex-col gap-6 order-1 lg:order-0">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md gap-1.5 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`flex items-center justify-center gap-2.5 py-2.5 px-3 sm:px-4 rounded-xl font-cyber font-bold text-sm md:text-base tracking-wider uppercase transition-all duration-300 cursor-pointer ${
                mode === "single"
                  ? "bg-[#00ff66]/15 text-[#00ff66] border border-[#00ff66] shadow-[0_0_20px_rgba(0,255,102,0.3)] scale-[1.01]"
                  : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <Zap
                className={`w-5 h-5 shrink-0 ${
                  mode === "single" ? "animate-pulse text-[#00ff66]" : ""
                }`}
              />
              <span className="flex flex-col items-center leading-tight">
                <span className="whitespace-nowrap">{t("mode_single")}</span>
                <span className="text-[10px] font-mono opacity-80 whitespace-nowrap mt-0.5">
                  (SOLO MODE)
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMode("battle")}
              className={`flex items-center justify-center gap-2.5 py-2.5 px-3 sm:px-4 rounded-xl font-cyber font-bold text-sm md:text-base tracking-wider uppercase transition-all duration-300 cursor-pointer ${
                mode === "battle"
                  ? "bg-[#bc13fe]/20 text-[#d866ff] border border-[#bc13fe] shadow-[0_0_20px_rgba(188,19,254,0.3)] scale-[1.01]"
                  : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <Swords
                className={`w-5 h-5 shrink-0 ${
                  mode === "battle" ? "animate-pulse text-[#d866ff]" : ""
                }`}
              />
              <span className="flex flex-col items-center leading-tight">
                <span className="whitespace-nowrap">{t("mode_battle")}</span>
                <span className="text-[10px] font-mono opacity-80 whitespace-nowrap mt-0.5">
                  (PVP MODE)
                </span>
              </span>
            </button>
          </div>

          {/* Active Mode Main Panel */}
          {mode === "single" ? (
            <div className="glass-panel p-6 md:p-8 rounded-2xl flex flex-col justify-between relative overflow-hidden group shadow-[0_0_30px_rgba(0,255,102,0.12)] border-l-4 border-l-[#00ff66] transition-all duration-300">
              <div className="absolute inset-0 bg-linear-to-r from-[#00ff66]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              <div className="relative z-10 mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse"></span>
                  <span className="text-xs font-cyber tracking-widest text-[#00ff66] uppercase">
                    {t("single_tag")}
                  </span>
                </div>
                <h2 className="font-cyber font-bold text-2xl md:text-3xl text-white tracking-wider mb-2">
                  {t("single_title")}
                </h2>
                <p className="text-sm text-gray-400 font-mono">
                  {t("single_desc")}
                </p>
              </div>

              {/* Game Start Link (Single Mode -> /game) */}
              <GameStartLink className="relative z-10 w-full text-center bg-[#00ff66] hover:bg-[#33ff88] text-black px-4 md:px-8 py-5 rounded-xl font-cyber font-bold text-xl md:text-2xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(0,255,102,0.4)] hover:shadow-[0_0_30px_rgba(0,255,102,0.7)] uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 whitespace-nowrap cursor-pointer">
                <span className="w-2.5 h-2.5 md:w-3 md:h-3 shrink-0 bg-black animate-pulse rounded-full"></span>
                <span>{t("init_game")}</span>
              </GameStartLink>
            </div>
          ) : (
            <div className="glass-panel p-6 md:p-8 rounded-2xl flex flex-col justify-between relative overflow-hidden group shadow-[0_0_30px_rgba(188,19,254,0.15)] border-l-4 border-l-[#bc13fe] transition-all duration-300">
              <div className="absolute inset-0 bg-linear-to-r from-[#bc13fe]/10 via-[#00f3ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              <div className="relative z-10 mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#bc13fe] animate-pulse"></span>
                  <span className="text-xs font-cyber tracking-widest text-[#d866ff] uppercase">
                    {t("battle_tag")}
                  </span>
                </div>
                <h2 className="font-cyber font-bold text-2xl md:text-3xl text-white tracking-wider mb-2">
                  {t("battle_title")}
                </h2>
                <p className="text-sm text-gray-400 font-mono">
                  {t("battle_desc")}
                </p>
              </div>

              {/* Game Start Button (Battle Mode -> Open Select Dialog) */}
              <button
                type="button"
                onClick={() => setLobbyModal("select")}
                className="relative z-10 w-full text-center bg-linear-to-r from-[#bc13fe] via-[#7928ca] to-[#00f3ff] hover:brightness-110 text-white px-4 md:px-8 py-5 rounded-xl font-cyber font-bold text-xl md:text-2xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_0_25px_rgba(188,19,254,0.5)] hover:shadow-[0_0_35px_rgba(0,243,255,0.6)] uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 whitespace-nowrap cursor-pointer"
              >
                <Swords className="w-5 h-5 shrink-0 animate-pulse text-[#00f3ff]" />
                <span>{t("init_game")}</span>
              </button>
            </div>
          )}

          {/* Ranking & Player Data Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/ranking"
              className="glass-panel p-4 rounded-xl text-center border border-[#00f3ff]/40 hover:border-[#00f3ff] hover:bg-[#00f3ff]/10 text-[#00f3ff] font-cyber font-bold text-base md:text-lg transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(0,243,255,0.15)] uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span>🏆</span> {t("ranking")}
            </Link>
            {isLoggedIn ? (
              <Link
                href="/player-data"
                className="glass-panel p-4 rounded-xl text-center border border-white/20 hover:border-white hover:bg-white/10 text-white font-cyber font-bold text-base md:text-lg transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)] uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <ChartSplineIcon className="text-[#00ff66]" /> PLAYER DATA
              </Link>
            ) : (
              <div className="glass-panel p-4 rounded-xl text-center text-xs text-gray-400 flex items-center justify-center border border-white/5">
                {t("login_prompt")}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Rules (Dynamic based on selected mode) */}
        <div className="glass-panel p-6 md:p-8 rounded-2xl flex flex-col justify-center order-2 lg:order-0 relative transition-all duration-300">
          {mode === "single" ? (
            <>
              {/* Single Mode Briefing */}
              <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#00f3ff"
                  strokeWidth="2"
                >
                  <path d="M12 2L2 22h20L12 2z" />
                </svg>
              </div>
              <Heading
                as="h2"
                variant="cyan"
                className="text-2xl! mb-6 flex items-center gap-3"
              >
                <span className="w-2 h-6 bg-[#00f3ff] shadow-[0_0_10px_#00f3ff]"></span>
                {t("mission_briefing")}
              </Heading>
              <ul className="space-y-6 text-lg text-gray-300">
                <li className="flex items-center gap-4">
                  <span className="text-[#00f3ff] text-xl drop-shadow-[0_0_5px_#00f3ff]">
                    ▶
                  </span>
                  <p>
                    {t("rule1_1")}
                    <span className="text-[#00ff66] font-bold drop-shadow-[0_0_5px_rgba(0,255,102,0.8)]">
                      {t("rule1_color")}
                    </span>
                    <span className="hidden md:inline">{t("rule1_2_pc")}</span>
                    <span className="md:hidden inline">
                      {t("rule1_2_mobile")}
                    </span>
                  </p>
                </li>
                <li className="flex items-center gap-4">
                  <span className="text-[#00f3ff] text-xl drop-shadow-[0_0_5px_#00f3ff]">
                    ▶
                  </span>
                  <p>
                    {t("rule2_1")}
                    <span className="font-mono text-[#00f3ff] font-bold bg-[#00f3ff]/10 px-2 py-0.5 rounded border border-[#00f3ff]/30">
                      3000ms
                    </span>
                    {t("rule2_2")}
                  </p>
                </li>
                <li className="flex items-center gap-4">
                  <span className="text-[#00f3ff] text-xl drop-shadow-[0_0_5px_#00f3ff]">
                    ▶
                  </span>
                  <p>
                    {t("rule3_1")}
                    <span className="font-mono text-[#bc13fe] font-bold">
                      0ms
                    </span>
                    {t("rule3_2")}
                  </p>
                </li>
                <li className="flex items-center gap-4">
                  <span className="text-[#00f3ff] text-xl drop-shadow-[0_0_5px_#00f3ff]">
                    ▶
                  </span>
                  <p>{t("rule4")}</p>
                </li>
              </ul>
            </>
          ) : (
            <>
              {/* Battle Mode Briefing */}
              <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none text-[#bc13fe]">
                <Swords className="w-10 h-10" />
              </div>
              <Heading
                as="h2"
                variant="purple"
                className="text-2xl! mb-6 flex items-center gap-3"
              >
                <span className="w-2 h-6 bg-[#bc13fe] shadow-[0_0_10px_#bc13fe]"></span>
                {t("battle_briefing")}
              </Heading>
              <ul className="space-y-6 text-lg text-gray-300">
                <li className="flex items-center gap-4">
                  <span className="text-[#bc13fe] text-xl drop-shadow-[0_0_5px_#bc13fe]">
                    ▶
                  </span>
                  <p>
                    {t("battle_rule1_1")}
                    <span className="text-[#00ff66] font-bold drop-shadow-[0_0_5px_rgba(0,255,102,0.8)]">
                      {t("battle_rule1_color")}
                    </span>
                    {t("battle_rule1_2")}
                  </p>
                </li>
                <li className="flex items-center gap-4">
                  <span className="text-[#bc13fe] text-xl drop-shadow-[0_0_5px_#bc13fe]">
                    ▶
                  </span>
                  <p>
                    {t("battle_rule2_1")}
                    <span className="text-[#00f3ff] font-bold drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]">
                      {t("battle_rule2_attack")}
                    </span>
                    {t("battle_rule2_2")}
                  </p>
                </li>
                <li className="flex items-center gap-4">
                  <span className="text-[#bc13fe] text-xl drop-shadow-[0_0_5px_#bc13fe]">
                    ▶
                  </span>
                  <p>
                    {t("battle_rule3_1")}
                    <span className="text-[#ff0055] font-bold drop-shadow-[0_0_5px_rgba(255,0,85,0.8)]">
                      {t("battle_rule3_defeat")}
                    </span>
                    {t("battle_rule3_2")}
                  </p>
                </li>
                <li className="flex items-center gap-4">
                  <span className="text-[#bc13fe] text-xl drop-shadow-[0_0_5px_#bc13fe]">
                    ▶
                  </span>
                  <p>{t("battle_rule4")}</p>
                </li>
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Battle Selection Modal: 部屋を作る / 部屋に参加 を選択するダイアログ */}
      <BattleSelectModal
        isOpen={lobbyModal === "select"}
        onClose={() => setLobbyModal("none")}
        onSelectCreate={() => setLobbyModal("create")}
        onSelectJoin={() => setLobbyModal("join")}
      />

      {/* Battle Lobby Modals (Create / Join) */}
      {(lobbyModal === "create" || lobbyModal === "join") && (
        <BattleLobbyModal
          isOpen={true}
          onClose={() => setLobbyModal("none")}
          onBack={() => setLobbyModal("select")}
          onStartBattle={handleStartBattle}
          mode={lobbyModal}
          initialRoomId={roomParam || ""}
          defaultUserName={defaultUserName}
        />
      )}
    </>
  );
};
