import { Button } from "@/components/Button";
import { Heading } from "@/components/Heading";
import {
  calculateFastest,
  calculateSlowest,
  getValidReactions,
} from "@/features/game/utils/stats";
import { RankingEntry } from "@/features/ranking/types";
import { Avatar } from "@/features/user";
import { useTranslations } from "next-intl";

const DISPLAY_FRACTION_DIGITS = 1;
const RANK_OFFSET = 1;

type Props = {
  selectedEntry: RankingEntry;
  setSelectedEntry: (entry: RankingEntry | null) => void;
  rankings: RankingEntry[];
};

export const RankingDetailModal = ({
  selectedEntry,
  setSelectedEntry,
  rankings,
}: Props) => {
  const t = useTranslations("Ranking");

  const validReactions = getValidReactions(selectedEntry.rawReactions);
  const fastestNum = calculateFastest(validReactions);
  const slowestNum = calculateSlowest(validReactions);

  const fastest =
    fastestNum !== null ? fastestNum.toFixed(DISPLAY_FRACTION_DIGITS) : "-";
  const slowest =
    slowestNum !== null ? slowestNum.toFixed(DISPLAY_FRACTION_DIGITS) : "-";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={() => setSelectedEntry(null)}
    >
      <div
        className="glass-panel rounded-2xl p-8 max-w-md w-full border border-[#00f3ff]/30 shadow-[0_0_40px_rgba(0,243,255,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        <Heading
          as="h2"
          variant="cyan"
          className="!text-2xl text-center mb-6 border-b border-[#00f3ff]/20 pb-4 flex items-center justify-center gap-3"
        >
          <span className="w-3 h-3 bg-[#00f3ff] rotate-45"></span>
          {t("intel_title")}
          <span className="w-3 h-3 bg-[#00f3ff] rotate-45"></span>
        </Heading>

        <div className="flex items-center gap-4 mb-4 bg-black/40 p-4 rounded-xl border border-white/5">
          <Avatar
            src={selectedEntry.user.image}
            className="w-12 h-12 rounded-full border border-[#00f3ff] object-cover shrink-0"
          />
          <div>
            <div className="font-bold text-xl">{selectedEntry.user.name}</div>
            <div className="text-sm text-[#00f3ff] font-cyber tracking-widest">
              {t("intel_rank")}:{" "}
              {rankings.findIndex((r) => r.id === selectedEntry.id) +
                RANK_OFFSET}
            </div>
          </div>
        </div>

        {selectedEntry.updatedAt && (
          <div className="flex justify-between items-center mb-4 justify-center gap-2">
            <span className="text-gray-400 font-cyber text-sm uppercase tracking-wider">
              {t("intel_updated_at")}
            </span>
            <span className="font-mono font-bold text-gray-300 text-sm md:text-base">
              {new Date(selectedEntry.updatedAt).toLocaleString()}
            </span>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex justify-between items-center bg-black/50 p-4 rounded-xl border border-white/5">
            <span className="text-gray-400 font-cyber text-sm uppercase tracking-wider">
              {t("intel_fastest")}
            </span>
            <span className="font-mono font-bold text-[#00ff66] text-xl drop-shadow-[0_0_5px_rgba(0,255,102,0.3)]">
              {fastest} <span className="text-sm">{t("unit_ms")}</span>
            </span>
          </div>
          <div className="flex justify-between items-center bg-black/50 p-4 rounded-xl border border-white/5">
            <span className="text-gray-400 font-cyber text-sm uppercase tracking-wider">
              {t("intel_slowest")}
            </span>
            <span className="font-mono font-bold text-red-400 text-xl drop-shadow-[0_0_5px_rgba(248,113,113,0.3)]">
              {slowest} <span className="text-sm">{t("unit_ms")}</span>
            </span>
          </div>
          <div className="flex justify-between items-center bg-black/50 p-4 rounded-xl border border-white/5">
            <span className="text-gray-400 font-cyber text-sm uppercase tracking-wider">
              {t("intel_avg")}
            </span>
            <span className="font-mono font-bold text-[#00f3ff] text-xl drop-shadow-[0_0_5px_rgba(0,243,255,0.3)]">
              {selectedEntry.averageTime.toFixed(DISPLAY_FRACTION_DIGITS)}{" "}
              <span className="text-sm">{t("unit_ms")}</span>
            </span>
          </div>
          <div className="flex justify-between items-center bg-black/50 p-4 rounded-xl border border-white/5">
            <span className="text-gray-400 font-cyber text-sm uppercase tracking-wider">
              {t("intel_median")}
            </span>
            <span className="font-mono font-bold text-[#bc13fe] text-xl drop-shadow-[0_0_5px_rgba(188,19,254,0.3)]">
              {selectedEntry.medianTime.toFixed(DISPLAY_FRACTION_DIGITS)}{" "}
              <span className="text-sm">{t("unit_ms")}</span>
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          className="mt-8 w-full py-4"
          onClick={() => setSelectedEntry(null)}
        >
          {t("btn_close_intel")}
        </Button>
      </div>
    </div>
  );
};
