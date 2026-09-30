"use client";

import { Button } from "@/components/Button";
import { Header } from "@/components/Header";
import { Heading } from "@/components/Heading";
import {
  DeviceType,
  getDeviceType,
  getPendingScore,
  setPendingScore,
} from "@/features/game";
import {
  RankingDetailModal,
  RankingEntry,
  RankingTable,
} from "@/features/ranking";
import { Link } from "@/i18n/routing";
import { apiClient } from "@/utils/apiClient";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export const RankingClient = ({
  currentUserId,
  initialDeviceType,
}: {
  currentUserId: string;
  initialDeviceType?: DeviceType;
}) => {
  const [deviceType, setDeviceType] = useState<DeviceType>(
    () => initialDeviceType ?? getDeviceType(),
  );
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<RankingEntry | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const t = useTranslations("Ranking");

  useEffect(() => {
    if (initialDeviceType === "PC" && getDeviceType() === "MOBILE") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDeviceType("MOBILE");
    }
  }, [initialDeviceType]);

  useEffect(() => {
    let ignore = false;

    const fetchRankings = async () => {
      setLoading(true);
      try {
        const data = (await apiClient.get(`/api/ranking`, {
          params: { device_type: deviceType },
        })) as { success?: boolean; rankings?: RankingEntry[] };
        if (!ignore && data.success && data.rankings) {
          setRankings(data.rankings);
        }
      } catch (e) {
        console.error(e);
      }
      if (!ignore) {
        setLoading(false);
      }
    };

    const submitPendingScore = async () => {
      const pendingData = getPendingScore();
      if (pendingData) {
        try {
          if (
            !pendingData.isSubmitted &&
            typeof pendingData.clear_count === "number" &&
            pendingData.clear_count > 0 &&
            Array.isArray(pendingData.raw_reactions) &&
            pendingData.raw_reactions.length > 0
          ) {
            await apiClient.post(
              "/api/game/score",
              JSON.stringify(pendingData),
            );
          }
        } catch (e) {
          console.error("Failed to submit pending score:", e);
        } finally {
          pendingData.isSubmitted = true;
          setPendingScore(pendingData);
        }
      }
    };

    submitPendingScore().then(() => {
      if (!ignore) {
        fetchRankings();
      }
    });

    return () => {
      ignore = true;
    };
  }, [deviceType]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > window.innerHeight) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentUserIndex = currentUserId
    ? rankings.findIndex((r) => r.user.id === currentUserId)
    : -1;
  const currentUserEntry =
    currentUserIndex !== -1 ? rankings[currentUserIndex] : null;

  return (
    <div className="min-h-screen relative text-white flex flex-col">
      <Header />
      <div className="pt-24 md:pt-28 px-4 max-w-5xl mx-auto pb-12 w-full flex-1">
        <div className="text-center mb-10 w-full">
          <Heading as="h1" variant="gradient">
            {t("title")}
          </Heading>
          <p className="text-lg text-[#00f3ff] font-bold tracking-widest uppercase">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex justify-center mb-10 gap-4">
          <Button
            variant={deviceType === "PC" ? "primary" : "ghost"}
            onClick={() => setDeviceType("PC")}
          >
            {t("pc_terminal")}
          </Button>
          <Button
            variant={deviceType === "MOBILE" ? "secondary" : "ghost"}
            onClick={() => setDeviceType("MOBILE")}
          >
            {t("mobile_device")}
          </Button>
        </div>

        {currentUserEntry && (
          <div className="mb-6 p-4 rounded-xl border-2 border-[#00f3ff] bg-[#00f3ff]/10 shadow-[0_0_20px_rgba(0,243,255,0.2)] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[#00f3ff] font-cyber tracking-widest text-sm md:text-base uppercase mb-1">
                {t("your_rank")}
              </span>
              <div className="flex items-center gap-3">
                <div className="text-3xl md:text-4xl font-black font-cyber text-yellow-400 drop-shadow-[0_0_5px_yellow]">
                  {currentUserIndex + 1}
                </div>
                <div className="text-sm md:text-xl font-bold">
                  {currentUserEntry.user.name}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[#00f3ff] font-bold text-lg md:text-2xl">
                {currentUserEntry.clearCount}{" "}
                <span className="text-xs md:text-sm text-gray-400">
                  {t("table_clear_count_short")}
                </span>
              </div>
              <div className="text-[#bc13fe] font-mono text-sm md:text-xl">
                {currentUserEntry.remainingTime.toFixed(1)}{" "}
                <span className="text-xs md:text-sm text-gray-400">
                  {t("unit_ms")}
                </span>
              </div>
            </div>
          </div>
        )}

        <RankingTable
          loading={loading}
          rankings={rankings}
          currentUserId={currentUserId}
          setSelectedEntry={setSelectedEntry}
        />

        <div className="mt-12 flex w-full justify-center items-center">
          <Link
            href="/"
            className="w-full md:w-auto bg-[#00ff66]/10 hover:bg-[#00ff66]/20 border border-[#00ff66]/30 hover:border-[#00ff66]/50 text-[#00ff66] px-10 py-4 rounded-xl font-cyber font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(0,255,102,0.1)] text-center"
          >
            {t("btn_return")}
          </Link>
        </div>

        {selectedEntry && (
          <RankingDetailModal
            selectedEntry={selectedEntry}
            setSelectedEntry={setSelectedEntry}
            rankings={rankings}
          />
        )}
      </div>

      {showScrollTop && (
        <Button
          variant="primary"
          size="none"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full !p-0"
          aria-label="Scroll to top"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </Button>
      )}
    </div>
  );
};
