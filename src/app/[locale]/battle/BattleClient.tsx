"use client";

import {
  BattleArena,
  BattleLobbyModal,
  InitialHpOption,
  normalizeInitialHp,
} from "@/features/battle";
import {
  clearBattleAdmission,
  getBattleAdmission,
  leaveSavedBattleSession,
} from "@/features/battle/utils/roomApi";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

const subscribeToMount = () => () => { };
const getClientMountSnapshot = () => true;
const getServerMountSnapshot = () => false;

type BattleClientProps = {
  initialUserName?: string;
  initialUserId?: string;
};

type ActiveBattle = {
  roomId: string;
  isHost: boolean;
  initialHp: InitialHpOption;
  userName: string;
  sessionId: string;
  sessionToken: string;
  role: "PLAYER_1" | "PLAYER_2" | "SPECTATOR";
  isOwner: boolean;
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
  const isConfirmingAdmission = searchParams.get("confirm") === "true";
  const initialHpParam: InitialHpOption = normalizeInitialHp(
    searchParams.get("hp"),
  );

  const router = useRouter();

  const pendingAdmission =
    mounted && roomParam
      ? getBattleAdmission(roomParam)
      : null;
  const [activeBattle, setActiveBattle] = useState<ActiveBattle | null>(null);
  const [isLobbyOpen, setIsLobbyOpen] = useState(true);

  const handleStartBattle = (config: ActiveBattle) => {
    setActiveBattle(config);
    setIsLobbyOpen(false);
    clearBattleAdmission(config.roomId);
    try {
      sessionStorage.setItem("battle_user_name", config.userName);
    } catch (error) {
      console.error("Unable to save the battle display name:", error);
    }
  };

  const handleExit = () => {
    setIsLobbyOpen(false);
    router.push("/");
  };

  let savedUserName = initialUserName || "";
  if (!savedUserName && mounted) {
    try {
      savedUserName = sessionStorage.getItem("battle_user_name") || "";
    } catch (error) {
      console.error("Unable to read the saved battle display name:", error);
    }
  }

  const battleToRender =
    activeBattle ??
    (pendingAdmission && !isConfirmingAdmission
      ? { ...pendingAdmission, initialHp: initialHpParam }
      : null);

  useEffect(() => {
    if (!battleToRender && roomParam && !isConfirmingAdmission) {
      void leaveSavedBattleSession(roomParam);
    }
  }, [battleToRender, roomParam, isConfirmingAdmission]);

  if (!mounted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#050508] text-[#00f3ff] font-cyber tracking-widest animate-pulse">
        LOADING BATTLE ARENA...
      </div>
    );
  }

  if (battleToRender) {
    return (
      <BattleArena
        roomId={battleToRender.roomId}
        isHost={battleToRender.isHost}
        initialHp={battleToRender.initialHp}
        userId={initialUserId}
        userName={battleToRender.userName}
        sessionId={battleToRender.sessionId}
        sessionToken={battleToRender.sessionToken}
        role={battleToRender.role}
        isOwner={battleToRender.isOwner}
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
        mode="join"
        initialRoomId={roomParam || ""}
        defaultUserName={pendingAdmission?.userName || savedUserName}
        inviteMode={Boolean(roomParam)}
        existingAdmission={
          isConfirmingAdmission
            ? pendingAdmission || undefined
            : undefined
        }
      />
    </div>
  );
};
