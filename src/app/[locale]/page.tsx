import { Header } from "@/components/Header";
import { Heading } from "@/components/Heading";
import { GameStartLink } from "@/features/game";
import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

const TopPage = async (props: { params: Promise<{ locale: string }> }) => {
  const { locale } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = await getTranslations("HomePage");

  let bestScore = null;
  let playCount = 0;
  if (user) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (dbUser) {
      playCount = dbUser.playCount;
    }

    bestScore = await prisma.ranking.findFirst({
      where: { userId: user.id },
      orderBy: [{ clearCount: "desc" }, { remainingTime: "desc" }],
    });
  }

  return (
    <div className="min-h-screen relative flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-4 pt-24 md:pt-28 pb-8 max-w-6xl mx-auto w-full">
        <div className="text-center mb-10 w-full">
          <Heading
            as="h1"
            variant="gradient"
            className="!text-4xl md:!text-7xl mb-2 tracking-wider"
          >
            {t("title")}
          </Heading>
          <p className="text-xl md:text-2xl text-[#00f3ff] font-bold tracking-widest uppercase">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full items-stretch">
          {/* Left Column: Actions & Best Score */}
          <div className="flex flex-col gap-6 order-1 lg:order-none">
            <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group h-auto min-h-[16rem] shadow-[0_0_30px_rgba(0,255,102,0.1)] gap-4">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00ff66]/5 to-[#00cc55]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <GameStartLink className="relative z-10 w-full text-center bg-[#00ff66] hover:bg-[#33ff88] text-black px-4 md:px-8 py-6 rounded-xl font-cyber font-bold text-2xl md:text-3xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(0,255,102,0.4)] hover:shadow-[0_0_30px_rgba(0,255,102,0.7)] uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 whitespace-nowrap">
                <span className="w-2.5 h-2.5 md:w-3 md:h-3 shrink-0 bg-black animate-pulse rounded-full"></span>
                {t("init_game")}
              </GameStartLink>

              <Link
                href="/ranking"
                className="relative z-10 w-full text-center bg-transparent border-2 border-[#00f3ff]/50 hover:border-[#00f3ff] hover:bg-[#00f3ff]/10 text-[#00f3ff] px-4 md:px-8 py-4 rounded-xl font-cyber font-bold text-xl md:text-2xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(0,243,255,0.2)] hover:shadow-[0_0_25px_rgba(0,243,255,0.5)] uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap"
              >
                RANKING
              </Link>
            </div>

            {user && bestScore ? (
              <div className="flex space-between gap-4">
                <div className="flex-1 glass-panel p-6 rounded-2xl border-l-4 border-l-[#bc13fe] relative">
                  <div className="flex justify-between items-center mb-1">
                    <Heading
                      as="h2"
                      variant="purple"
                      className="!text-sm mb-0 !drop-shadow-none"
                    >
                      {t("personal_best")}
                    </Heading>
                  </div>
                  <div className="text-4xl font-mono font-bold text-white drop-shadow-[0_0_8px_rgba(188,19,254,0.6)]">
                    {bestScore.clearCount}
                    <span className="text-2xl text-gray-400 font-sans">
                      {t("times")}
                    </span>
                    <span className="text-xl text-gray-500 ml-2">
                      {t("remaining")}
                      {bestScore.remainingTime.toFixed(1)}ms
                    </span>
                  </div>
                </div>
                <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-[#bc13fe] relative">
                  <div className="flex justify-between items-center mb-1">
                    <Heading
                      as="h2"
                      variant="purple"
                      className="!text-sm mb-0 !drop-shadow-none"
                    >
                      {t("play_count")}
                    </Heading>
                  </div>
                  <div className="text-4xl font-mono font-bold text-white drop-shadow-[0_0_8px_rgba(188,19,254,0.6)]">
                    {playCount || 0}
                    <span className="text-2xl text-gray-400 font-sans">
                      {t("times")}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-gray-600 text-gray-400 text-sm">
                {t("login_prompt")}
              </div>
            )}
          </div>

          {/* Right Column: Rules */}
          <div className="glass-panel p-6 md:p-8 rounded-2xl flex flex-col justify-center order-2 lg:order-none relative">
            <div className="absolute top-0 right-0 p-4 opacity-20">
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
              className="!text-2xl mb-6 flex items-center gap-3"
            >
              <span className="w-2 h-6 bg-[#00f3ff] shadow-[0_0_10px_#00f3ff]"></span>
              {t("mission_briefing")}
            </Heading>
            <ul className="space-y-6 text-lg text-gray-300">
              <li className="flex items-start gap-4">
                <span className="text-[#00f3ff] mt-1 text-xl drop-shadow-[0_0_5px_#00f3ff]">
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
              <li className="flex items-start gap-4">
                <span className="text-[#00f3ff] mt-1 text-xl drop-shadow-[0_0_5px_#00f3ff]">
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
              <li className="flex items-start gap-4">
                <span className="text-[#00f3ff] mt-1 text-xl drop-shadow-[0_0_5px_#00f3ff]">
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
              <li className="flex items-start gap-4">
                <span className="text-[#00f3ff] mt-1 text-xl drop-shadow-[0_0_5px_#00f3ff]">
                  ▶
                </span>
                <p>{t("rule4")}</p>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Links */}
        <footer className="w-full mt-12 mb-4 flex items-center justify-center gap-6 text-sm text-gray-500 font-cyber">
          <Link
            href="/terms"
            className="hover:text-[#00f3ff] transition-colors"
          >
            {t("terms")}
          </Link>
          <span>|</span>
          <Link
            href="/privacy"
            className="hover:text-[#00f3ff] transition-colors"
          >
            {t("privacy")}
          </Link>
        </footer>
      </main>
    </div>
  );
};

export default TopPage;
