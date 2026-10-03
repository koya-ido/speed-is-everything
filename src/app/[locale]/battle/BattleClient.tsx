"use client";

import {
  BattleArena,
  BattleLobbyModal,
  InitialHpOption,
  normalizeInitialHp,
} from "@/features/battle";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

const subscribeToMount = () => () => {};
const getClientMountSnapshot = () => true;
const getServerMountSnapshot = () => false;

type BattleClientProps = {
  initialUserName?: string;
  initialUserId?: string;
};

export const BattleClient = ({
  initialUserName,
  initialUserId,
}: BattleClientProps) => {
  const mounted = useSyncExternalStore(
    subscribeToMount,
    getClientMountSnapshot,
    getServerMountSnapshot,
  );

  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room");
  const isHostParam = searchParams.get("host") === "true";
  const initialHpParam: InitialHpOption = normalizeInitialHp(
    searchParams.get("hp"),
  );
  const nameParam = searchParams.get("name");

  const router = useRouter();

  const [activeBattle, setActiveBattle] = useState<{
    roomId: string;
    isHost: boolean;
    initialHp: InitialHpOption;
    userName: string;
  } | null>(() => {
    if (roomParam) {
      let resolvedName = nameParam || initialUserName;
      if (!resolvedName && typeof window !== "undefined") {
        const stored = sessionStorage.getItem("battle_user_name");
        if (stored) resolvedName = stored;
      }
      if (!resolvedName) {
        const suffix = Math.floor(1000 + Math.random() * 9000);
        resolvedName = isHostParam ? `Host_${suffix}` : `Guest_${suffix}`;
        if (typeof window !== "undefined") {
          sessionStorage.setItem("battle_user_name", resolvedName);
        }
      }
      return {
        roomId: roomParam,
        isHost: isHostParam,
        initialHp: initialHpParam,
        userName: resolvedName,
      };
    }
    return null;
  });

  const lobbyMode = isHostParam ? "create" : "join";
  const [isLobbyOpen, setIsLobbyOpen] = useState(!roomParam);

  const handleStartBattle = (config: {
    roomId: string;
    isHost: boolean;
    initialHp: InitialHpOption;
    userName: string;
  }) => {
    setActiveBattle(config);
    setIsLobbyOpen(false);
  };

  const handleExit = () => {
    setIsLobbyOpen(false);
    router.push("/");
  };

  if (!mounted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#050508] text-[#00f3ff] font-cyber tracking-widest animate-pulse">
        LOADING BATTLE ARENA...
      </div>
    );
  }

  if (activeBattle) {
    return (
      <BattleArena
        roomId={activeBattle.roomId}
        isHost={activeBattle.isHost}
        initialHp={activeBattle.initialHp}
        userId={initialUserId}
        userName={activeBattle.userName}
        onExit={handleExit}
      />
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050508]">
      <BattleLobbyModal
        isOpen={isLobbyOpen}
        onClose={() => router.push("/")}
        onStartBattle={handleStartBattle}
        mode={lobbyMode}
        defaultUserName={initialUserName}
      />
    </div>
  );
};
