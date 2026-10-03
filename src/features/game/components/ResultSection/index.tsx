"use client";

import { Button } from "@/components/Button";
import { Heading } from "@/components/Heading";
import { HistoryModal } from "@/features/game/components/ResultSection/HistoryModal";
import { LoginMenu } from "@/features/game/components/ResultSection/LoginMenu";
import { ScoreStats } from "@/features/game/components/ResultSection/ScoreStats";
import { getShareUrl } from "@/features/game/utils/gameLogic";
import {
  clearPendingScore,
  setPendingScore,
} from "@/features/game/utils/pendingScore";
import {
  calculateAverage,
  calculateFastest,
  calculateMedian,
  calculateRemainingTime,
  calculateSlowest,
} from "@/features/game/utils/stats";
import { Link } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  DeviceType,
  getDeviceType,
  getReactionRank,
} from "@/features/game/utils/thresholds";

import type { User } from "@supabase/supabase-js";

type ResultSectionProps = {
  clearCount: number;
  remainingTime: number;
  rawReactions: number[];
  failedReaction: number | null;
  failureType: "FALSE_START" | "TOO_FAST" | "TIME_OVER" | "TAB_LEAVE" | null;
  sessionToken: string | null;
  deviceType?: DeviceType;
  onRetry: () => void;
};

export const ResultSection = ({
  clearCount,
  remainingTime,
  rawReactions,
  failedReaction,
  failureType,
  sessionToken,
  deviceType,
  onRetry,
}: ResultSectionProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isActionable, setIsActionable] = useState(false);
  const t = useTranslations("ResultSection");

  const supabase = createClient();

  const validReactions = rawReactions.filter((r) => r > 0);
  const fastestNum = calculateFastest(validReactions);
  const slowestNum = calculateSlowest(validReactions);
  const fastest = fastestNum ?? 0;
  const slowest = slowestNum ?? 0;
  const average = calculateAverage(validReactions);
  const median = calculateMedian(validReactions);
  const activeDeviceType = deviceType ?? getDeviceType();
  const finalRemainingTime =
    clearCount > 0 ? calculateRemainingTime(3000, rawReactions) : remainingTime;

  useEffect(() => {
    const timer = setTimeout(() => setIsActionable(true), 1000);
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
    return () => clearTimeout(timer);
  }, [supabase]);

  useEffect(() => {
    const submitScore = async () => {
      setIsSubmitting(true);
      try {
        const res = await fetch("/api/game/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_token: sessionToken,
            device_type: activeDeviceType,
            clear_count: clearCount,
            remaining_time: finalRemainingTime,
            raw_reactions: rawReactions,
            stats: { fastest, slowest, average, median },
          }),
        });
        const data = await res.json();
        if (data.is_new_record) {
          setResultMsg(t("msg_new_record"));
        } else if (data.success) {
          setResultMsg(t("msg_success"));
        } else {
          setResultMsg(t("msg_failed") + (data.error || ""));
        }
      } catch {
        setResultMsg(t("msg_error"));
      }
      setIsSubmitting(false);
    };

    if (user && sessionToken && clearCount > 0) {
      submitScore();
    }
  }, [
    user,
    sessionToken,
    clearCount,
    finalRemainingTime,
    rawReactions,
    fastest,
    slowest,
    average,
    median,
    activeDeviceType,
    t,
  ]);

  const saveScoreState = () => {
    setPendingScore({
      session_token: sessionToken,
      device_type: activeDeviceType,
      clear_count: clearCount,
      remaining_time: finalRemainingTime,
      raw_reactions: rawReactions,
      failed_reaction: failedReaction,
      failure_type: failureType,
      stats: { fastest, slowest, average, median },
      isSubmitted: !!user || clearCount === 0,
    });
  };

  const locale = useLocale();
  const overallRank =
    clearCount > 0 ? getReactionRank(average, activeDeviceType) : "NORMAL";

  const shareUrl = getShareUrl({
    clearCount,
    remainingTime: finalRemainingTime,
    average,
    median,
    deviceType: activeDeviceType,
    rank: overallRank,
    locale,
  });

  return (
    <div
      className={`glass-panel p-5 md:p-6 rounded-2xl shadow-[0_0_30px_rgba(188,19,254,0.2)] text-white text-center relative overflow-hidden transition-opacity duration-300 ${!isActionable ? "pointer-events-none opacity-90" : "opacity-100"}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#00f3ff]/5 to-[#bc13fe]/5 pointer-events-none"></div>

      {!isActionable ? (
        <div className="flex flex-col items-center justify-center py-12 md:py-16">
          <div className="w-12 h-12 border-4 border-[#00f3ff] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-cyber text-[#00f3ff] animate-pulse tracking-widest">
            ANALYZING...
          </p>
        </div>
      ) : (
        <>
          <Heading as="h2" variant="gradient">
            {clearCount === 0 ? t("game_over") : t("mission_complete")}
          </Heading>

          <ScoreStats
            clearCount={clearCount}
            remainingTime={finalRemainingTime}
            average={average}
            median={median}
            deviceType={activeDeviceType}
          />

          {resultMsg && (
            <p className="text-[#00ff66] font-cyber font-bold mb-3 drop-shadow-[0_0_5px_#00ff66] text-xs md:text-sm">
              {resultMsg}
            </p>
          )}

          <div className="flex flex-col gap-2 relative z-10">
            <Button
              variant="success-solid"
              size="lg"
              className="relative z-10 w-full whitespace-nowrap"
              disabled={isSubmitting}
              onClick={() => {
                clearPendingScore();
                onRetry();
              }}
            >
              <span className="w-2.5 h-2.5 md:w-3 md:h-3 shrink-0 bg-black animate-pulse rounded-full"></span>
              {t("btn_retry")}
            </Button>

            <Button
              variant="primary"
              size="md"
              className="w-full text-xs md:text-sm py-2.5"
              onClick={() => setIsHistoryModalOpen(true)}
            >
              {t("btn_history")}
            </Button>

            {user ? (
              <Link
                href="/ranking"
                onClick={saveScoreState}
                className="block w-full bg-[#00ff66]/20 hover:bg-[#00ff66]/30 text-[#00ff66] border border-[#00ff66]/50 py-2.5 rounded-xl font-cyber font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(0,255,102,0.2)] hover:shadow-[0_0_25px_rgba(0,255,102,0.5)] text-xs md:text-sm"
              >
                {t("btn_ranking")}
              </Link>
            ) : (
              <LoginMenu onLoginStart={saveScoreState} />
            )}

            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-black hover:bg-gray-900 text-white py-2.5 rounded-xl font-cyber font-bold uppercase tracking-widest transition-all border border-gray-700 hover:border-gray-500 text-xs md:text-sm"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="w-4 h-4 fill-current"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
              </svg>
              {t("btn_share")}
            </a>

            <Link
              href="/"
              className="flex items-center justify-center w-full bg-transparent hover:bg-white/5 py-2.5 rounded-xl font-cyber font-bold uppercase tracking-widest transition-all border border-transparent hover:border-white/10 text-gray-400 hover:text-white text-xs md:text-sm mt-1"
            >
              {t("btn_return")}
            </Link>
          </div>
        </>
      )}

      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        rawReactions={rawReactions}
        fastest={fastest}
        failureType={failureType}
        failedReaction={failedReaction}
        deviceType={activeDeviceType}
      />
    </div>
  );
};
