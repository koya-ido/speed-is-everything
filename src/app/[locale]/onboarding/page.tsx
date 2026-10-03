"use client";

import { Button } from "@/components/Button";
import { Heading } from "@/components/Heading";
import { hasPendingScore as checkHasPendingScore } from "@/features/game";
import { CountrySelect } from "@/features/user";
import { useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { apiClient } from "@/utils/apiClient";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

const emptySubscribe = () => () => { };

const Onboarding = () => {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [customCountry, setCustomCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasPendingScore = useSyncExternalStore(
    emptySubscribe,
    () => checkHasPendingScore(),
    () => false,
  );
  const router = useRouter();
  const t = useTranslations("Onboarding");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || name.length > 15) {
      setError(t("error_name_length"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiClient.patch("/api/user/profile", {
        name,
        country: country === "OTHER" ? customCountry : country,
      });
      if ((data as { success?: boolean }).success) {
        const nextParams = new URLSearchParams(window.location.search).get(
          "next",
        );
        let redirectPath = "/game";
        if (
          nextParams &&
          nextParams.startsWith("/") &&
          !nextParams.startsWith("//")
        ) {
          redirectPath = nextParams;
        }
        router.push(redirectPath);
      } else {
        setError((data as { error?: string }).error || t("error_generic"));
      }
    } catch {
      setError(t("error_network"));
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();

    if (checkHasPendingScore()) {
      router.push("/game");
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#00f3ff] rounded-full blur-[150px] opacity-10 pointer-events-none"></div>

      <div className="glass-panel p-8 md:p-10 rounded-2xl w-full max-w-md shadow-[0_0_40px_rgba(0,243,255,0.15)] relative z-10 border border-[#00f3ff]/20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00f3ff]/5 to-[#bc13fe]/5 pointer-events-none rounded-2xl"></div>

        <Heading as="h1" variant="gradient" className="text-center mb-8">
          {t("title")}
        </Heading>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6 relative z-10"
        >
          <div>
            <label className="block text-xs font-cyber tracking-widest uppercase text-[#00f3ff] mb-2 drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]">
              {t("label_name")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/50 border border-[#00f3ff]/30 rounded-xl p-4 text-white font-mono text-lg focus:outline-none focus:border-[#00f3ff] focus:shadow-[0_0_15px_rgba(0,243,255,0.3)] transition-all placeholder-white/20"
              placeholder={t("placeholder_name")}
              required
              maxLength={15}
            />
          </div>

          <CountrySelect
            country={country}
            onCountryChange={setCountry}
            customCountry={customCountry}
            onCustomCountryChange={setCustomCountry}
          />

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm font-bold flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              <span className="font-cyber tracking-wider uppercase">
                {error}
              </span>
            </div>
          )}

          {/* Submit button triggers navigation, so use green theme */}
          <Button
            type="submit"
            disabled={loading}
            variant="success"
            className="w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5 text-[#00ff66]"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {t("btn_saving")}
              </span>
            ) : (
              t("btn_submit")
            )}
          </Button>

          <Button
            type="button"
            onClick={handleCancel}
            variant="ghost"
            className="w-full text-xs md:text-sm"
          >
            {hasPendingScore ? t("btn_cancel_to_result") : t("btn_cancel")}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
