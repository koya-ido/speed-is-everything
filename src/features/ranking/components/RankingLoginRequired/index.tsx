"use client";

import { Button } from "@/components/Button";
import { Heading } from "@/components/Heading";
import { Link } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

export const RankingLoginRequired = () => {
  const t = useTranslations("Ranking");
  const supabase = createClient();

  const handleOAuthLogin = (provider: "google" | "x") => {
    supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/ranking`,
        queryParams: provider === "google" ? { hl: "ja" } : { lang: "ja" },
      },
    });
  };

  return (
    <div className="glass-panel p-8 md:p-12 rounded-2xl shadow-[0_0_30px_rgba(0,243,255,0.15)] border border-[#00f3ff]/30 text-center max-w-lg mx-auto w-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#00f3ff]/5 via-transparent to-[#bc13fe]/5 pointer-events-none" />

      {/* Lock / Security Icon */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#00f3ff]/20 to-[#bc13fe]/20 border border-[#00f3ff]/40 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(0,243,255,0.3)] animate-pulse">
          <svg
            className="w-8 h-8 text-[#00f3ff]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        <span className="font-cyber text-xs tracking-widest text-[#00f3ff] bg-[#00f3ff]/10 px-3 py-1 rounded-full border border-[#00f3ff]/30 uppercase mb-3">
          {t("login_required_badge")}
        </span>

        <Heading as="h1" variant="gradient" className="text-2xl md:text-3xl mb-3">
          {t("login_required_title")}
        </Heading>

        <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-8 max-w-sm">
          {t("login_required_desc")}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3.5 w-full">
          <Button
            variant="ghost"
            size="none"
            onClick={() => handleOAuthLogin("google")}
            className="flex items-center justify-center gap-3 w-full bg-white hover:bg-gray-100 text-gray-900 font-cyber font-bold py-3.5 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-98 shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]"
          >
            <svg
              className="w-5 h-5 shrink-0"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {t("btn_login_google")}
          </Button>

          <Button
            variant="ghost"
            size="none"
            onClick={() => handleOAuthLogin("x")}
            className="flex items-center justify-center gap-3 w-full bg-black hover:bg-gray-900 text-white font-cyber font-bold py-3.5 px-6 rounded-xl border border-gray-700 hover:border-gray-500 transition-all transform hover:scale-[1.02] active:scale-98 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
          >
            <svg
              className="w-5 h-5 shrink-0 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            {t("btn_login_x")}
          </Button>

          <Link
            href="/"
            className="mt-2 text-gray-400 hover:text-white font-cyber text-xs uppercase tracking-widest transition-colors py-2"
          >
            {t("btn_return")}
          </Link>
        </div>
      </div>
    </div>
  );
};
