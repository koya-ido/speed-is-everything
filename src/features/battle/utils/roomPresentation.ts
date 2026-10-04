import { BattleRoomParticipant } from "@/features/battle/types";

export const getActivePlayerNames = (
  participants: readonly BattleRoomParticipant[],
) => ({
  playerOneName:
    participants.find((participant) => participant.role === "PLAYER_1")
      ?.userName ?? null,
  playerTwoName:
    participants.find((participant) => participant.role === "PLAYER_2")
      ?.userName ?? null,
});

export const getBattleLogPlayerNames = (
  participants: readonly BattleRoomParticipant[],
) => {
  const activePlayers = participants.filter(
    (participant) => participant.role !== "SPECTATOR",
  );
  const gameHost = activePlayers.find((participant) => participant.isGameHost);
  const opponent = activePlayers.find(
    (participant) => participant.sessionId !== gameHost?.sessionId,
  );

  return {
    playerName: gameHost?.userName ?? null,
    opponentName: opponent?.userName ?? null,
  };
};
