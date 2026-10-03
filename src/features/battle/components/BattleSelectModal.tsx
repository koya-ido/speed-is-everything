"use client";

import { ArrowRight, LogIn, PlusCircle, Swords, X } from "lucide-react";
import { useTranslations } from "next-intl";

type BattleSelectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectCreate: () => void;
  onSelectJoin: () => void;
};

export const BattleSelectModal = ({
  isOpen,
  onClose,
  onSelectCreate,
  onSelectJoin,
}: BattleSelectModalProps) => {
  const t = useTranslations("HomePage");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg rounded-3xl border border-[#bc13fe]/40 shadow-[0_0_50px_rgba(188,19,254,0.2)] p-6 md:p-8 relative flex flex-col gap-6">
        {/* 閉じるボタン */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* モーダルヘッダー */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-[#bc13fe]">
            <Swords className="w-8 h-8 animate-pulse text-[#00f3ff]" />
            <h2 className="text-2xl md:text-3xl font-cyber font-bold tracking-wider text-white">
              {t("dialog_battle_select_title")}
            </h2>
          </div>
          <p className="text-xs md:text-sm text-gray-400 font-mono">
            {t("dialog_battle_select_subtitle")}
          </p>
        </div>

        {/* 2つの選択肢カード */}
        <div className="grid grid-cols-1 gap-4 mt-2">
          {/* 部屋を作る */}
          <button
            type="button"
            onClick={onSelectCreate}
            className="group relative p-5 rounded-2xl bg-gradient-to-r from-[#00f3ff]/10 to-transparent hover:from-[#00f3ff]/20 border border-[#00f3ff]/40 hover:border-[#00f3ff] transition-all duration-300 text-left flex items-center justify-between shadow-[0_0_20px_rgba(0,243,255,0.1)] hover:shadow-[0_0_25px_rgba(0,243,255,0.3)] hover:scale-[1.02] active:scale-98 cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/30 group-hover:scale-110 transition-transform">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-cyber font-bold text-lg md:text-xl text-white group-hover:text-[#00f3ff] transition-colors flex items-center gap-2">
                  {t("create_room_card_title")}
                  <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]/30 uppercase">
                    HOST
                  </span>
                </span>
                <span className="text-xs md:text-sm text-gray-400 font-mono mt-1">
                  {t("create_room_card_desc")}
                </span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#00f3ff] group-hover:translate-x-1 transition-all shrink-0 ml-2" />
          </button>

          {/* 部屋に参加 */}
          <button
            type="button"
            onClick={onSelectJoin}
            className="group relative p-5 rounded-2xl bg-gradient-to-r from-[#00ff66]/10 to-transparent hover:from-[#00ff66]/20 border border-[#00ff66]/40 hover:border-[#00ff66] transition-all duration-300 text-left flex items-center justify-between shadow-[0_0_20px_rgba(0,255,102,0.1)] hover:shadow-[0_0_25px_rgba(0,255,102,0.3)] hover:scale-[1.02] active:scale-98 cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/30 group-hover:scale-110 transition-transform">
                <LogIn className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-cyber font-bold text-lg md:text-xl text-white group-hover:text-[#00ff66] transition-colors flex items-center gap-2">
                  {t("join_room_card_title")}
                  <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/30 uppercase">
                    GUEST
                  </span>
                </span>
                <span className="text-xs md:text-sm text-gray-400 font-mono mt-1">
                  {t("join_room_card_desc")}
                </span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#00ff66] group-hover:translate-x-1 transition-all shrink-0 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};
