import { Button } from "@/components/Button";
import { RankingEntry } from "@/features/ranking/types";
import { TitleBadge } from "@/features/title";
import { Avatar, CountryFlag } from "@/features/user";
import { useTranslations } from "next-intl";

type Props = {
  loading: boolean;
  rankings: RankingEntry[];
  currentUserId: string | null;
  setSelectedEntry: (entry: RankingEntry) => void;
};

export const RankingTable = ({
  loading,
  rankings,
  currentUserId,
  setSelectedEntry,
}: Props) => {
  const t = useTranslations("Ranking");

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,243,255,0.05)] border border-[#00f3ff]/20">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-full md:min-w-[700px]">
          <thead>
            <tr className="bg-black/60 text-[#00f3ff] text-[10px] md:text-sm font-cyber uppercase tracking-wider border-b border-[#00f3ff]/20 whitespace-nowrap">
              <th className="px-1 py-2 md:p-5 w-10 md:w-20 text-center">
                {t("table_rank")}
              </th>
              <th className="px-1 py-2 md:p-5 w-8 md:w-16 text-center">
                {t("table_loc")}
              </th>
              <th className="px-1 py-2 md:p-5">{t("table_agent")}</th>
              <th className="px-1 py-2 md:p-5 text-right">
                <span className="hidden md:inline">
                  {t("table_clear_count")}
                </span>
                <span className="md:hidden">
                  {t("table_clear_count_short")}
                </span>
              </th>
              <th className="px-1 py-2 md:p-5 text-right">
                <span className="hidden md:inline">{t("table_time_left")}</span>
                <span className="md:hidden">{t("table_time_left_short")}</span>
              </th>
              <th className="px-1 py-2 md:p-5 text-center">
                {t("table_intel")}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 md:p-12 text-center text-[#00f3ff] font-cyber animate-pulse tracking-widest"
                >
                  {t("loading")}
                </td>
              </tr>
            ) : rankings.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 md:p-12 text-center text-gray-500 font-cyber tracking-widest"
                >
                  {t("no_records")}
                </td>
              </tr>
            ) : (
              rankings.map((r, i) => {
                const isCurrentUser = currentUserId === r.user.id;
                return (
                  <tr
                    key={r.id}
                    className={`border-t transition-colors group ${isCurrentUser ? "bg-[#00f3ff]/20 border-[#00f3ff]/50 shadow-[inset_0_0_15px_rgba(0,243,255,0.2)] hover:bg-[#00f3ff]/30" : "border-white/5 hover:bg-white/5"}`}
                  >
                    <td className="px-1 py-2 md:p-4 text-center font-cyber font-black text-sm md:text-2xl">
                      {i === 0 ? (
                        <span className="text-yellow-400 drop-shadow-[0_0_5px_yellow]">
                          🥇
                        </span>
                      ) : i === 1 ? (
                        <span className="text-gray-300 drop-shadow-[0_0_5px_gray]">
                          🥈
                        </span>
                      ) : i === 2 ? (
                        <span className="text-amber-600 drop-shadow-[0_0_5px_rgba(217,119,6,0.8)]">
                          🥉
                        </span>
                      ) : (
                        <span className="text-gray-500 group-hover:text-white">
                          {i + 1}
                        </span>
                      )}
                    </td>
                    <td className="px-1 py-2 md:p-4 text-center text-sm md:text-xl">
                      <CountryFlag countryCode={r.user.country} />
                    </td>
                    <td className="px-1 py-2 md:p-4">
                      <div className="flex items-center gap-1 md:gap-4">
                        <Avatar
                          src={r.user.image}
                          className="hidden md:flex w-6 h-6 md:w-10 md:h-10 rounded-full border border-white/10 group-hover:border-[#00f3ff] transition-colors object-cover shrink-0"
                        />
                        <span
                          className={`font-bold text-[10px] sm:text-xs md:text-lg truncate max-w-[50px] sm:max-w-[80px] md:max-w-none ${isCurrentUser ? "text-[#00f3ff]" : ""}`}
                        >
                          {r.user.name}
                        </span>
                        {r.user.selectedTitle && (
                          <TitleBadge
                            titleId={r.user.selectedTitle}
                            size="sm"
                            className="hidden lg:inline-flex"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-1 py-2 md:p-4 text-right font-black text-sm sm:text-base md:text-2xl text-[#00f3ff] drop-shadow-[0_0_5px_rgba(0,243,255,0.3)]">
                      {r.clearCount}
                    </td>
                    <td className="px-1 py-2 md:p-4 text-right font-mono text-[10px] sm:text-xs md:text-xl text-[#bc13fe] drop-shadow-[0_0_5px_rgba(188,19,254,0.3)] whitespace-nowrap">
                      {r.remainingTime.toFixed(1)}{" "}
                      <span className="text-[8px] md:text-sm text-gray-500">
                        {t("unit_ms")}
                      </span>
                    </td>
                    <td className="px-1 py-2 md:p-4 flex justify-center">
                      <Button
                        variant="primary"
                        size="none"
                        onClick={() => setSelectedEntry(r)}
                        className="px-2 py-1 md:px-4 md:py-2 text-[8px] md:text-xs !bg-transparent border-[#00f3ff]/30 hover:bg-[#00f3ff]/10 hover:border-[#00f3ff] shadow-none"
                      >
                        {t("btn_details")}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
