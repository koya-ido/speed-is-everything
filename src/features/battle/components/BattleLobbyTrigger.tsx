"use client";

import { BattleLobbyModal } from "@/features/battle/components/BattleLobbyModal";
import { InitialHpOption } from "@/features/battle/types";
import { useRouter } from "@/i18n/routing";
import { LogIn, PlusCircle, Swords } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type BattleLobbyTriggerProps = {
  defaultUserName?: string;
};

export const BattleLobbyTrigger = ({
  defaultUserName,
}: BattleLobbyTriggerProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room");

  const [activeModal, setActiveModal] = useState<"create" | "join" | null>(null);
  const hasAutoOpenedRef = useRef(false);

  // URLに ?room=... があれば自動的に参加専用モーダルを開く（初回の明示アクセス時のみ）
  useEffect(() => {
    if (roomParam && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true;
      setActiveModal("join");
    }
  }, [roomParam]);

  const handleStartBattle = (config: {
    roomId: string;
    isHost: boolean;
    initialHp: InitialHpOption;
    userName: string;
  }) => {
    setActiveModal(null);
    const params = new URLSearchParams();
    params.set("room", config.roomId);
    if (config.isHost) {
      params.set("host", "true");
    }
    if (config.initialHp) {
      params.set("hp", config.initialHp.toString());
    }
    if (config.userName) {
      params.set("name", config.userName);
    }
    router.push(`/battle?${params.toString()}`);
  };

  return (
    <>
      <div className="w-full flex flex-col gap-2.5 relative z-10 pt-2 border-t border-gray-800/80">
        <div className="flex items-center justify-center gap-2 text-xs font-cyber tracking-widest text-[#00f3ff] uppercase mb-1">
          <Swords className="w-3.5 h-3.5" />
          <span>BATTLE MODE (1vs1 リアルタイム対戦)</span>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full">
          {/* 部屋を作る 専用ボタン */}
          <button
            type="button"
            onClick={() => setActiveModal("create")}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-gradient-to-r from-[#00f3ff]/15 to-[#00f3ff]/5 border border-[#00f3ff]/50 hover:border-[#00f3ff] hover:bg-[#00f3ff]/20 text-[#00f3ff] font-cyber font-bold text-sm tracking-wider uppercase transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(0,243,255,0.2)] cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>部屋を作る</span>
          </button>

          {/* 部屋に参加 専用ボタン */}
          <button
            type="button"
            onClick={() => setActiveModal("join")}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-gradient-to-r from-[#00ff66]/15 to-[#00ff66]/5 border border-[#00ff66]/50 hover:border-[#00ff66] hover:bg-[#00ff66]/20 text-[#00ff66] font-cyber font-bold text-sm tracking-wider uppercase transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(0,255,102,0.2)] cursor-pointer whitespace-nowrap"
          >
            <LogIn className="w-4 h-4 shrink-0" />
            <span>部屋に参加</span>
          </button>
        </div>
      </div>

      {/* それぞれのボタンに応じた専用ダイアログ */}
      {activeModal && (
        <BattleLobbyModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onStartBattle={handleStartBattle}
          mode={activeModal}
          initialRoomId={roomParam || ""}
          defaultUserName={defaultUserName}
        />
      )}
    </>
  );
};
