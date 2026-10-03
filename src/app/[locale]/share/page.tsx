import { Header } from "@/components/Header";
import { Link } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    c?: string;
    r?: string;
    avg?: string;
    med?: string;
    rank?: string;
    d?: string;
  }>;
};

export const generateMetadata = async (props: Props): Promise<Metadata> => {
  const searchParams = await props.searchParams;

  const c = searchParams.c || "0";
  const r = searchParams.r || "0";
  const avg = searchParams.avg || "0";
  const med = searchParams.med || searchParams.avg || "0";
  const rank = searchParams.rank || "NORMAL";
  const d = searchParams.d || "PC";
  const t = await getTranslations("SharePage");
  const rankLabel =
    rank === "GODLIKE"
      ? t("rank_godlike")
      : rank === "EXCELLENT"
        ? t("rank_excellent")
        : t("rank_normal");
  const deviceLabel = d === "MOBILE" ? t("device_mobile") : t("device_pc");

  const ogUrl = `/api/og?c=${encodeURIComponent(c)}&r=${encodeURIComponent(r)}&avg=${encodeURIComponent(avg)}&med=${encodeURIComponent(med)}&rank=${encodeURIComponent(rank)}&d=${encodeURIComponent(d)}`;

  const title = t("metadata_title", { clearCount: c });
  const description = t("metadata_description", {
    average: avg,
    median: med,
    rank: rankLabel,
    remaining: r,
    device: deviceLabel,
  });

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: t("metadata_image_alt", { clearCount: c }),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
};

const SharePage = async (props: Props) => {
  const searchParams = await props.searchParams;
  const t = await getTranslations("SharePage");
  const clearCount = searchParams.c || "0";
  const remainingTime = searchParams.r || "0";
  const average = searchParams.avg || "0";
  const median = searchParams.med || searchParams.avg || "0";
  const rank = searchParams.rank || "NORMAL";
  const device = searchParams.d || "PC";
  const deviceLabel = device === "MOBILE" ? t("device_mobile") : t("device_pc");

  let rankColor =
    "text-[#00f3ff] border-[#00f3ff]/40 shadow-[0_0_15px_rgba(0,243,255,0.2)]";
  let rankLabel = t("rank_normal");
  if (rank === "GODLIKE") {
    rankColor =
      "text-[#ffd700] border-[#ffd700]/50 shadow-[0_0_20px_rgba(255,215,0,0.3)]";
    rankLabel = t("rank_godlike");
  } else if (rank === "EXCELLENT") {
    rankColor =
      "text-[#ff64ff] border-[#ff64ff]/50 shadow-[0_0_20px_rgba(255,100,255,0.3)]";
    rankLabel = t("rank_excellent");
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4">
      <Header />

      <main className="w-full max-w-lg mx-auto flex flex-col items-center text-center pt-24 pb-12 z-10">
        <div className="glass-panel p-8 rounded-3xl w-full border border-white/10 shadow-[0_0_40px_rgba(0,243,255,0.15)] flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00ff66] animate-pulse"></span>
            <span className="text-xs font-cyber tracking-[0.25em] text-gray-400 uppercase">
              {t("report_heading", { device: deviceLabel })}
            </span>
          </div>

          <div
            className={`px-4 py-1.5 rounded-full border bg-black/40 font-cyber font-black text-xs md:text-sm tracking-widest mb-6 ${rankColor}`}
          >
            {rankLabel}
          </div>

          <div className="flex flex-col items-center mb-8">
            <span className="text-7xl md:text-8xl font-black font-mono text-white tracking-tight drop-shadow-[0_0_25px_rgba(0,243,255,0.5)]">
              {clearCount}
            </span>
            <span className="text-sm font-cyber font-bold tracking-widest text-[#00f3ff] uppercase mt-1">
              {t("times_cleared")}
            </span>
          </div>

          <div className="w-full flex flex-col gap-3 mb-8">
            {/* REMAINING (全幅) */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col">
              <span className="text-gray-400 text-[10px] font-cyber tracking-widest uppercase mb-1">
                {t("remaining")}
              </span>
              <span className="text-3xl md:text-4xl font-bold font-mono text-[#00f3ff]">
                {remainingTime}{" "}
                <span className="text-xs font-sans text-gray-400">ms</span>
              </span>
            </div>

            {/* AVG SPEED & MEDIAN SPEED (2カラム) */}
            <div className="grid grid-cols-2 gap-3 w-full">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col">
                <span className="text-gray-400 text-[10px] font-cyber tracking-widest uppercase mb-1">
                  {t("average_speed")}
                </span>
                <span className="text-xl md:text-2xl font-bold font-mono text-[#00ff66]">
                  {average}{" "}
                  <span className="text-xs font-sans text-gray-400">ms</span>
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col">
                <span className="text-gray-400 text-[10px] font-cyber tracking-widest uppercase mb-1">
                  {t("median_speed")}
                </span>
                <span className="text-xl md:text-2xl font-bold font-mono text-[#00f3ff]">
                  {median}{" "}
                  <span className="text-xs font-sans text-gray-400">ms</span>
                </span>
              </div>
            </div>
          </div>

          <p className="text-gray-400 font-cyber text-sm mb-6">
            {t("share_prompt")}
          </p>

          <Link
            href="/game"
            className="w-full text-center bg-[#00ff66] hover:bg-[#33ff88] text-black px-6 py-4 rounded-xl font-cyber font-bold text-lg md:text-xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(0,255,102,0.4)] hover:shadow-[0_0_30px_rgba(0,255,102,0.7)] uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <span className="w-2.5 h-2.5 bg-black animate-pulse rounded-full"></span>
            {t("play_now")}
          </Link>
        </div>
      </main>
    </div>
  );
};

export default SharePage;
