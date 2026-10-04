"use client";

import { useTranslations } from "next-intl";

type BattleSessionExpiredModalProps = {
  onReturnToTop: () => void;
};

export const BattleSessionExpiredModal = ({
  onReturnToTop,
}: BattleSessionExpiredModalProps) => {
  const t = useTranslations("Battle");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm"
      role="presentation"
    >
      <section
        aria-labelledby="battle-session-expired-title"
        aria-describedby="battle-session-expired-message"
        aria-modal="true"
        className="glass-panel w-full max-w-md rounded-2xl border border-[#ff0055]/40 p-6 text-center"
        role="dialog"
      >
        <h2
          className="font-cyber text-xl font-bold text-white"
          id="battle-session-expired-title"
        >
          {t("session_expired_title")}
        </h2>
        <p
          className="mt-3 text-sm text-gray-300"
          id="battle-session-expired-message"
        >
          {t("session_expired_message")}
        </p>
        <button
          type="button"
          onClick={onReturnToTop}
          className="mt-5 rounded-xl bg-[#00f3ff] px-5 py-3 text-sm font-bold text-black"
        >
          {t("return_to_top")}
        </button>
      </section>
    </div>
  );
};
