import { BattleRoomParticipant } from "@/features/battle/types";
import {
  getActivePlayerNames,
  getBattleLogPlayerNames,
} from "@/features/battle/utils/roomPresentation";
import { describe, expect, it } from "vitest";

const participant = (
  sessionId: string,
  role: BattleRoomParticipant["role"],
  userName: string,
): BattleRoomParticipant => ({
  sessionId,
  role,
  userName,
  joinOrder: Number(sessionId),
  isOwner: false,
  isGameHost: false,
  connected: true,
});

describe("getActivePlayerNames", () => {
  it("uses names assigned to current player roles, ignoring spectators", () => {
    const participants = [
      participant("1", "SPECTATOR", "Waiting"),
      participant("2", "PLAYER_2", "Promoted"),
      participant("3", "PLAYER_1", "Remaining"),
    ];

    expect(getActivePlayerNames(participants)).toEqual({
      playerOneName: "Remaining",
      playerTwoName: "Promoted",
    });
  });

  it("returns null for vacant player slots", () => {
    expect(
      getActivePlayerNames([participant("1", "PLAYER_1", "Remaining")]),
    ).toEqual({
      playerOneName: "Remaining",
      playerTwoName: null,
    });
  });

  describe("getBattleLogPlayerNames", () => {
    it("uses the game host and other active player, never a spectator", () => {
      const participants = [
        {
          ...participant("1", "PLAYER_1", "Host"),
          isGameHost: true,
        },
        participant("2", "SPECTATOR", "Watcher"),
        participant("3", "PLAYER_2", "Guest"),
      ];

      expect(getBattleLogPlayerNames(participants)).toEqual({
        playerName: "Host",
        opponentName: "Guest",
      });
    });

    it("uses the promoted game host rather than assuming player one", () => {
      const participants = [
        participant("1", "PLAYER_1", "Guest"),
        {
          ...participant("2", "PLAYER_2", "Promoted Host"),
          isGameHost: true,
        },
      ];

      expect(getBattleLogPlayerNames(participants)).toEqual({
        playerName: "Promoted Host",
        opponentName: "Guest",
      });
    });
  });
});
