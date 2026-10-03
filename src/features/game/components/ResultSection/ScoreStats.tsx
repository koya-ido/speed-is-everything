import { DeviceType, getReactionRank } from "@/features/game/utils/thresholds";
import { useTranslations } from "next-intl";

type ScoreStatsProps = {
  clearCount: number;
  remainingTime: number;
  average: number;
  median: number;
  deviceType?: DeviceType;
};

export const ScoreStats = ({
  clearCount,
  remainingTime,
  average,
  median,
  deviceType = "PC",
}: ScoreStatsProps) => {
  const t = useTranslations("ResultSection");

  const getScoreColorClass = (score: number) => {
    if (score <= 0) return "text-white";
    const rank = getReactionRank(score, deviceType);
    if (rank === "GODLIKE")
      return "text-[#ffd700] drop-shadow-[0_0_5px_rgba(255,215,0,0.8)]";
    if (rank === "EXCELLENT")
      return "text-[#ff64ff] drop-shadow-[0_0_5px_rgba(255,100,255,0.8)]";
    return "text-white";
  };
  const avgColorClass = getScoreColorClass(average);
  const medianColorClass = getScoreColorClass(median);

  const getCountColorClass = (count: number) => {
    if (count >= 16)
      return "text-[#ffd700] drop-shadow-[0_0_5px_rgba(255,215,0,0.8)]";
    if (count >= 13)
      return "text-[#ff64ff] drop-shadow-[0_0_5px_rgba(255,100,255,0.8)]";
    return "drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]";
  };
  const countColorClass = getCountColorClass(clearCount);

  return (
    <div className="grid grid-cols-2 gap-2 mb-3 md:mb-4">
      <div className="bg-black/40 border border-[#00f3ff]/20 p-2 rounded-xl shadow-[inset_0_0_10px_rgba(0,243,255,0.05)]">
        <p className="text-[#00f3ff] text-[10px] md:text-xs font-cyber tracking-wider uppercase mb-1">
          {t("lbl_clear")}
        </p>
        <p className={`text-2xl md:text-3xl font-black ${countColorClass}`}>
          {clearCount}{" "}
          <span className="text-sm md:text-lg">{t("unit_times")}</span>
        </p>
      </div>
      <div className="bg-black/40 border border-[#bc13fe]/20 p-2 rounded-xl shadow-[inset_0_0_10px_rgba(188,19,254,0.05)]">
        <p className="text-[#bc13fe] text-[10px] md:text-xs font-cyber tracking-wider uppercase mb-1">
          {t("lbl_time")}
        </p>
        <p className="text-xl md:text-2xl font-black drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] font-mono">
          {remainingTime.toFixed(1)}{" "}
          <span className="text-xs md:text-sm">{t("unit_ms")}</span>
        </p>
      </div>
      <div className="bg-black/40 border border-[#00ff66]/20 p-2 rounded-xl shadow-[inset_0_0_10px_rgba(0,255,102,0.05)]">
        <p className="text-[#00ff66] text-[10px] md:text-xs font-cyber tracking-wider uppercase mb-1">
          {t("lbl_avg")}
        </p>
        <p
          className={`text-lg md:text-xl font-bold font-mono ${avgColorClass}`}
        >
          {average.toFixed(1)} {t("unit_ms")}
        </p>
      </div>
      <div className="bg-black/40 border border-white/10 p-2 rounded-xl shadow-[inset_0_0_10px_rgba(255,255,255,0.02)]">
        <p className="text-gray-400 text-[10px] md:text-xs font-cyber tracking-wider uppercase mb-1">
          {t("lbl_median")}
        </p>
        <p
          className={`text-lg md:text-xl font-bold font-mono ${medianColorClass}`}
        >
          {median.toFixed(1)} {t("unit_ms")}
        </p>
      </div>
    </div>
  );
};
