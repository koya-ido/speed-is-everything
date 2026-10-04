"use client";

import { INITIAL_HP_DEFAULT, InitialHpOption } from "@/features/battle/types";
import { formatRoomId } from "@/features/battle/utils/battleLogic";
import {
  BattleRoomRequestError,
  createBattleRoom,
  joinBattleRoom,
  renameBattleParticipantRequest,
} from "@/features/battle/utils/roomApi";
import { ArrowLeft, LogIn, PlusCircle, X, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type BattleLobbyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  onStartBattle: (config: {
    roomId: string;
    isHost: boolean;
    initialHp: InitialHpOption;
    userName: string;
    sessionId: string;
    sessionToken: string;
    role: "PLAYER_1" | "PLAYER_2" | "SPECTATOR";
    isOwner: boolean;
  }) => void;
  mode: "create" | "join";
  initialRoomId?: string;
  defaultUserName?: string;
  inviteMode?: boolean;
  showNameInput?: boolean;
  existingAdmission?: {
    roomId: string;
    isHost: boolean;
    initialHp: InitialHpOption;
    userName: string;
    sessionId: string;
    sessionToken: string;
    role: "PLAYER_1" | "PLAYER_2" | "SPECTATOR";
    isOwner: boolean;
  };
  onRoomCodeSubmit?: (roomCode: string) => void | Promise<void>;
};

export const BattleLobbyModal = ({
  isOpen,
  onClose,
  onBack,
  onStartBattle,
  mode,
  initialRoomId = "",
  defaultUserName = "",
  inviteMode = false,
  showNameInput = true,
  existingAdmission,
  onRoomCodeSubmit,
}: BattleLobbyModalProps) => {
  const [inputRoomId, setInputRoomId] = useState(
    initialRoomId ? formatRoomId(initialRoomId) : "",
  );
  const [userName, setUserName] = useState(defaultUserName);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations("Battle");

  if (!isOpen) return null;

  const handleRoomIdChange = (val: string) => {
    setError(null);
    setInputRoomId(formatRoomId(val));
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const admission = await createBattleRoom(userName.trim());
      onStartBattle({
        roomId: admission.room.code,
        isHost: admission.participant.isGameHost,
        initialHp: INITIAL_HP_DEFAULT,
        userName: admission.participant.userName,
        sessionId: admission.credentials.sessionId,
        sessionToken: admission.credentials.token,
        role: admission.participant.role,
        isOwner: admission.participant.isOwner,
      });
    } catch (reason) {
      setError(
        reason instanceof BattleRoomRequestError &&
          reason.code === "INVALID_PLAYER_NAME"
          ? t("invalid_player_name")
          : t("room_request_failed"),
      );
      console.error("Unable to create a battle room:", reason);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const finalRoomId = formatRoomId(inputRoomId);
    if (!existingAdmission) {
      const cleaned = finalRoomId.replace(/[^0-9A-Za-z]/g, "");
      if (cleaned.length !== 6) {
        setError(t("lobby_error_room_code"));
        return;
      }
    }

    setError(null);
    setIsSubmitting(true);
    try {
      if (existingAdmission) {
        const roomView = await renameBattleParticipantRequest(
          existingAdmission.roomId,
          {
            sessionId: existingAdmission.sessionId,
            token: existingAdmission.sessionToken,
          },
          userName.trim(),
        );
        const renamedParticipant = roomView.participants.find(
          (participant) =>
            participant.sessionId === existingAdmission.sessionId,
        );
        if (!renamedParticipant) {
          throw new Error(
            "Renamed battle participant was missing from the room response.",
          );
        }
        onStartBattle({
          ...existingAdmission,
          userName: renamedParticipant.userName,
        });
      } else if (onRoomCodeSubmit) {
        await onRoomCodeSubmit(finalRoomId);
      } else {
        const admission = await joinBattleRoom(finalRoomId, userName.trim());
        onStartBattle({
          roomId: admission.room.code,
          isHost: admission.participant.isGameHost,
          initialHp: INITIAL_HP_DEFAULT,
          userName: admission.participant.userName,
          sessionId: admission.credentials.sessionId,
          sessionToken: admission.credentials.token,
          role: admission.participant.role,
          isOwner: admission.participant.isOwner,
        });
      }
    } catch (reason) {
      const errorCode =
        reason &&
        typeof reason === "object" &&
        "code" in reason &&
        typeof reason.code === "string"
          ? reason.code
          : undefined;
      const isInvalidRoom = ["ROOM_NOT_FOUND", "ROOM_ENDED"].includes(
        errorCode || "",
      );
      const isInvalidPlayerName = errorCode === "INVALID_PLAYER_NAME";

      setError(
        isInvalidRoom
          ? t("room_invalid")
          : isInvalidPlayerName
            ? t("invalid_player_name")
            : t("room_request_failed"),
      );
      if (!isInvalidRoom && !isInvalidPlayerName) {
        console.error("Unable to join a battle room:", reason);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg rounded-3xl border border-[#00f3ff]/40 shadow-[0_0_50px_rgba(0,243,255,0.2)] p-6 md:p-8 relative flex flex-col gap-6">
        {/* 戻るボタン */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute top-5 left-5 text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 flex items-center gap-1.5 text-xs font-mono"
            aria-label={t("lobby_back")}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t("lobby_back")}</span>
          </button>
        )}

        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          aria-label={t("lobby_close")}
        >
          <X className="w-5 h-5" />
        </button>

        {/* モーダルヘッダー（モード専用） */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div
            className={`flex items-center gap-2 ${
              mode === "create" ? "text-[#00f3ff]" : "text-[#00ff66]"
            }`}
          >
            {mode === "create" ? (
              <PlusCircle className="w-7 h-7 animate-pulse" />
            ) : (
              <LogIn className="w-7 h-7 animate-pulse" />
            )}
            <h2 className="text-2xl md:text-3xl font-cyber font-bold tracking-wider text-white">
              {mode === "create"
                ? t("lobby_create_title")
                : t("lobby_join_title")}
            </h2>
          </div>
          <p className="text-xs md:text-sm text-gray-400 font-mono">
            {mode === "create"
              ? t("lobby_create_description")
              : t("lobby_join_description")}
          </p>
        </div>

        {showNameInput && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="battle-player-name"
              className="text-xs uppercase font-mono text-gray-400 tracking-wider"
            >
              {t("lobby_player_name")}
            </label>
            <input
              id="battle-player-name"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder={t("lobby_player_name_placeholder")}
              maxLength={15}
              autoFocus={inviteMode}
              autoComplete="nickname"
              className={`w-full px-4 py-3 rounded-xl bg-black/60 border border-gray-800 outline-none text-white text-sm font-medium transition-colors ${
                mode === "create"
                  ? "focus:border-[#00f3ff]"
                  : "focus:border-[#00ff66]"
              }`}
            />
          </div>
        )}


        {/* 部屋作成フォーム */}
        {mode === "create" && (
          <form onSubmit={handleCreateRoom} className="flex flex-col gap-5">
            {/* ルール要約 */}
            <div className="p-3.5 rounded-xl bg-black/30 border border-gray-800/80 text-[11px] text-gray-400 leading-relaxed font-mono flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-yellow-400 font-bold">
                <Zap className="w-3.5 h-3.5" />
                <span>{t("lobby_rules_title")}</span>
              </div>
              <div>・{t("lobby_rule_false_start")}</div>
              <div>・{t("lobby_rule_attack")}</div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl font-cyber font-bold text-lg uppercase tracking-widest bg-[#00f3ff] hover:bg-[#33f6ff] disabled:opacity-50 disabled:cursor-wait text-black shadow-[0_0_25px_rgba(0,243,255,0.5)] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              {isSubmitting ? t("room_creating") : t("lobby_create_submit")}
            </button>
          </form>
        )}

        {/* 部屋参加フォーム */}
        {mode === "join" && (
          <form onSubmit={handleJoinRoom} className="flex flex-col gap-5">
            {inviteMode ? (
              <p className="text-center font-mono text-sm text-[#00ff66]">
                {t("invite_room_code", { code: formatRoomId(initialRoomId) })}
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="battle-room-code"
                  className="text-xs uppercase font-mono text-gray-400 tracking-wider"
                >
                  {t("lobby_room_code_label")}
                </label>
                <input
                  id="battle-room-code"
                  type="text"
                  value={inputRoomId}
                  onChange={(e) => handleRoomIdChange(e.target.value)}
                  placeholder={t("lobby_room_code_placeholder")}
                  maxLength={7}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-black/60 border border-gray-800 focus:border-[#00ff66] outline-none text-[#00ff66] text-xl font-mono font-bold tracking-widest text-center transition-colors placeholder:text-gray-700"
                />
              </div>
            )}

            {!inviteMode && (
              <div className="p-3.5 rounded-xl bg-black/30 border border-gray-800/80 text-[11px] text-gray-400 leading-relaxed font-mono flex flex-col gap-1">
                <div>・{t("lobby_join_instruction_code")}</div>
                <div>・{t("lobby_join_instruction_start")}</div>
              </div>
            )}
            {inviteMode && (
              <p className="text-center text-xs text-gray-400 font-mono">
                {t("invite_name_confirmation")}
              </p>
            )}

                    {error && (
          <p className="text-xs text-[#ff0055] font-mono" role="alert">
            {error}
          </p>
        )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl font-cyber font-bold text-lg uppercase tracking-widest bg-[#00ff66] hover:bg-[#33ff88] disabled:opacity-50 disabled:cursor-wait text-black shadow-[0_0_25px_rgba(0,255,102,0.5)] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              {isSubmitting ? t("room_joining") : t("lobby_join_submit")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
