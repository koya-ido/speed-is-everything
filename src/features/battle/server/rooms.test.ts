import {
  normalizePlayerName,
  normalizeRoomCode,
  RECONNECT_GRACE_MS,
  roleForJoin,
  selectNextGameHost,
} from "@/features/battle/server/rooms";
import { BattleParticipantRole } from "@/generated/prisma/client";
import { describe, expect, it } from "vitest";

describe("battle room validation", () => {
  it("keeps disconnected room sessions for three minutes", () => {
    expect(RECONNECT_GRACE_MS).toBe(3 * 60 * 1000);
  });

  it("normalizes the existing six-digit room code format", () => {
    expect(normalizeRoomCode("123456")).toBe("123-456");
    expect(normalizeRoomCode("123-456")).toBe("123-456");
    expect(normalizeRoomCode("12x-456")).toBeNull();
    expect(normalizeRoomCode("12345")).toBeNull();
  });

  it("trims names, allows blank names to be generated, and rejects names over 15 characters", () => {
    expect(normalizePlayerName("  Alice  ")).toBe("Alice");
    expect(normalizePlayerName("  ", "Guest_1234")).toBe("Guest_1234");
    expect(() => normalizePlayerName("1234567890123456")).toThrow(
      "15 characters or fewer",
    );
  });

  it("assigns seats before adding spectators", () => {
    expect(roleForJoin([])).toBe(BattleParticipantRole.PLAYER_1);
    expect(roleForJoin([BattleParticipantRole.PLAYER_1])).toBe(
      BattleParticipantRole.PLAYER_2,
    );
    expect(
      roleForJoin([
        BattleParticipantRole.PLAYER_1,
        BattleParticipantRole.PLAYER_2,
      ]),
    ).toBe(BattleParticipantRole.SPECTATOR);
  });

  it("prefers a player who was already active over a newly promoted spectator", () => {
    const now = new Date();
    const player = {
      role: BattleParticipantRole.PLAYER_2,
      isGameHost: false,
      joinOrder: 3,
      lastSeenAt: now,
    };
    const promotedSpectator = {
      role: BattleParticipantRole.PLAYER_1,
      isGameHost: false,
      joinOrder: 1,
      lastSeenAt: now,
    };

    expect(selectNextGameHost([player], [promotedSpectator, player], now)).toBe(
      player,
    );
  });

  it("selects the newly promoted player when no active player existed before promotion", () => {
    const now = new Date();
    const promotedSpectator = {
      role: BattleParticipantRole.PLAYER_1,
      isGameHost: false,
      joinOrder: 1,
      lastSeenAt: now,
    };

    expect(selectNextGameHost([], [promotedSpectator], now)).toBe(
      promotedSpectator,
    );
  });

  it("does not prioritize a player who was already offline before promotion", () => {
    const now = new Date();
    const offlinePlayer = {
      role: BattleParticipantRole.PLAYER_2,
      isGameHost: false,
      joinOrder: 2,
      lastSeenAt: new Date(now.getTime() - 16_000),
    };
    const promotedSpectator = {
      role: BattleParticipantRole.PLAYER_1,
      isGameHost: false,
      joinOrder: 3,
      lastSeenAt: now,
    };

    expect(
      selectNextGameHost(
        [offlinePlayer],
        [offlinePlayer, promotedSpectator],
        now,
      ),
    ).toBe(promotedSpectator);
  });
});
