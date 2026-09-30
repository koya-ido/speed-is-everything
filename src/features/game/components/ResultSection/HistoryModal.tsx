import { Button } from "@/components/Button";
import { Heading } from "@/components/Heading";
import { calculateRemainingTime } from "@/features/game/utils/stats";
import { DeviceType, getReactionRank } from "@/features/game/utils/thresholds";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawReactions: number[];
  fastest: number;
  failureType: "FALSE_START" | "TOO_FAST" | "TIME_OVER" | "TAB_LEAVE" | null;
  failedReaction: number | null;
  deviceType?: DeviceType;
}

export const HistoryModal = ({
  isOpen,
  onClose,
  rawReactions,
  fastest,
  failureType,
  failedReaction,
  deviceType = "PC",
}: HistoryModalProps) => {
  const t = useTranslations("ResultSection");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="glass-panel rounded-2xl p-4 md:p-6 w-full max-w-md max-h-[85vh] flex flex-col shadow-[0_0_40px_rgba(0,243,255,0.2)] relative text-left">
        <Heading
          as="h3"
          variant="cyan"
          className="!text-xl md:!text-2xl shrink-0 mb-4 border-b border-[#00f3ff]/20 pb-3 flex items-center gap-2"
        >
          <span className="w-2 h-2 bg-[#00f3ff] rounded-full shadow-[0_0_5px_#00f3ff]"></span>
          {t("history_title")}
        </Heading>
        <div className="flex-1 overflow-y-auto pr-2 space-y-2 text-sm font-mono mb-4 custom-scrollbar">
          {rawReactions.map((r, i) => {
            const isFastest = r === fastest;
            let textColorClass = "text-white";
            let borderClass = "border-white/5 hover:border-[#00f3ff]/30";

            const rank = getReactionRank(r, deviceType);
            if (rank === "GODLIKE") {
              textColorClass =
                "text-[#ffd700] drop-shadow-[0_0_5px_rgba(255,215,0,0.8)]";
              borderClass =
                "border-[#ffd700]/30 shadow-[0_0_10px_rgba(255,215,0,0.2)] hover:border-[#ffd700]/60 hover:shadow-[0_0_15px_rgba(255,215,0,0.4)]";
            } else if (rank === "EXCELLENT") {
              textColorClass =
                "text-[#ff64ff] drop-shadow-[0_0_5px_rgba(255,100,255,0.8)]";
              borderClass =
                "border-[#ff64ff]/30 shadow-[0_0_10px_rgba(255,100,255,0.2)] hover:border-[#ff64ff]/60 hover:shadow-[0_0_15px_rgba(255,100,255,0.4)]";
            }

            const currentRemaining = calculateRemainingTime(
              3000,
              rawReactions.slice(0, i + 1),
            );
            return (
              <div
                key={i}
                className={`flex justify-between items-center bg-black/40 p-3 rounded border transition-all ${borderClass}`}
              >
                <div>
                  <span className="text-[#00f3ff] opacity-70 mr-3">
                    #{String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={`font-bold ${textColorClass}`}>
                    {r.toFixed(1)} {t("unit_ms")}
                  </span>
                  {isFastest && (
                    <span className="ml-2 text-yellow-400" title="Fastest">
                      ⚡
                    </span>
                  )}
                </div>
                <div className="text-gray-500 text-xs">
                  {t("history_rem")}{" "}
                  <span className="text-gray-300">
                    {currentRemaining.toFixed(1)} {t("unit_ms")}
                  </span>
                </div>
              </div>
            );
          })}
          {failureType && (
            <div className="flex justify-between items-center bg-red-900/30 border border-red-500/50 p-3 rounded text-red-200 mt-3 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              <div>
                <span className="mr-3 font-cyber text-red-400">
                  {t("critical")}
                </span>
                <span className="font-bold">
                  {failedReaction !== null
                    ? `${failedReaction.toFixed(1)} ${t("unit_ms")}`
                    : "-"}
                </span>
              </div>
              <div className="text-xs uppercase font-bold tracking-wider text-red-400 bg-red-500/10 px-2 py-1 rounded">
                {failureType === "TIME_OVER" && t("err_time_over")}
                {failureType === "FALSE_START" && t("err_false_start")}
                {failureType === "TOO_FAST" && t("err_too_fast")}
                {failureType === "TAB_LEAVE" && t("err_tab_leave")}
              </div>
            </div>
          )}
          {rawReactions.length === 0 && !failureType && (
            <div className="text-gray-500 text-center py-6 font-cyber uppercase tracking-widest">
              {t("no_data")}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          className="shrink-0 mt-2 w-full py-3"
          onClick={onClose}
        >
          {t("btn_close")}
        </Button>
      </div>
    </div>,
    document.body,
  );
};
