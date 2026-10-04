"use client";

import { useTranslations } from "next-intl";

type RoomDissolveConfirmationModalProps = {
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const RoomDissolveConfirmationModal = ({
  isPending,
  onCancel,
  onConfirm,
}: RoomDissolveConfirmationModalProps) => {
  const t = useTranslations("Battle");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onCancel();
      }}
    >
      <section
        aria-labelledby="room-dissolve-title"
        aria-describedby="room-dissolve-message"
        aria-modal="true"
        className="glass-panel w-full max-w-md rounded-2xl border border-[#ff0055]/40 p-6 text-center shadow-[0_0_35px_rgba(255,0,85,0.15)]"
        role="dialog"
      >
        <h2
          className="font-cyber text-lg font-bold text-white"
          id="room-dissolve-title"
        >
          {t("room_dissolve")}
        </h2>
        <p className="mt-3 text-sm text-gray-300" id="room-dissolve-message">
          {t("room_dissolve_confirm")}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            disabled={isPending}
            onClick={onCancel}
            className="rounded-xl border border-gray-600 px-5 py-3 text-sm text-gray-200 transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            {t("room_dissolve_cancel")}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="rounded-xl border border-[#ff0055]/60 bg-[#ff0055]/15 px-5 py-3 text-sm font-bold text-[#ff6b91] transition-colors hover:bg-[#ff0055]/25 disabled:opacity-50"
          >
            {isPending ? t("room_dissolve_pending") : t("room_dissolve")}
          </button>
        </div>
      </section>
    </div>
  );
};
