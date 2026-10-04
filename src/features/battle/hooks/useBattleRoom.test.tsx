import { useBattleRoom } from "@/features/battle/hooks/useBattleRoom";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => {
  const handlers: Record<string, unknown> = {};
  const channel = {
    on: vi.fn(
      (
        type: string,
        filter: { event: string },
        handler: (event: { payload: unknown }) => void,
      ) => {
        handlers[`${type}:${filter.event}`] = handler;
        return null;
      },
    ),
    presenceState: vi.fn(() => ({
      host: [
        {
          userId: "host-user",
          userName: "Host",
          device: "desktop",
          isReady: true,
          initialHp: 2000,
          isHost: true,
        },
      ],
    })),
    track: vi.fn(),
    send: vi.fn(),
    subscribe: vi.fn((callback: (status: string) => void) => {
      callback("SUBSCRIBED");
      return null;
    }),
    unsubscribe: vi.fn(),
  };

  return {
    handlers,
    channel,
    client: { channel: vi.fn(() => channel) },
  };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => supabaseMocks.client),
}));

vi.mock("@/features/game", () => ({
  getDeviceType: vi.fn(() => "MOBILE"),
  haptics: {
    action: vi.fn(),
    gameOver: vi.fn(),
    hitExcellent: vi.fn(),
    hitGodlike: vi.fn(),
    hitNormal: vi.fn(),
  },
  soundManager: {
    playAction: vi.fn(),
    playBgm: vi.fn(),
    playCountdown: vi.fn(),
    playGameOver: vi.fn(),
    playHitGodlike: vi.fn(),
    startTick: vi.fn(),
    stopTick: vi.fn(),
  },
}));

describe("useBattleRoom round state synchronization", () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    Object.keys(supabaseMocks.handlers).forEach((key) => {
      delete supabaseMocks.handlers[key];
    });
  });

  it("uses host HP snapshots when the guest starts the next round", () => {
    const { result, unmount } = renderHook(() =>
      useBattleRoom({ roomId: "123-456", isHost: false }),
    );

    const presenceSync = supabaseMocks.handlers["presence:sync"] as
      (() => void) | undefined;
    act(() => presenceSync?.());

    const roundStart = supabaseMocks.handlers["broadcast:round_start"] as
      ((event: { payload: unknown }) => void) | undefined;
    act(() =>
      roundStart?.({
        payload: {
          round: 3,
          delay: 3000,
          initialHp: 2000,
          hostState: {
            hp: 1888.5,
            combo: 0,
            godlikeCombo: 0,
            comboRank: null,
          },
          guestState: {
            hp: 1527.9,
            combo: 0,
            godlikeCombo: 0,
            comboRank: null,
          },
        },
      }),
    );

    expect(result.current.player.hp).toBe(1527.9);
    expect(result.current.opponent?.hp).toBe(1888.5);
    expect(result.current.currentRound).toBe(3);

    unmount();
  });

  it("shows the synchronized round countdown to spectators", () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() =>
      useBattleRoom({
        roomId: "123-456",
        isHost: false,
        role: "SPECTATOR",
      }),
    );
    const roundStart = supabaseMocks.handlers["broadcast:round_start"] as
      ((event: { payload: unknown }) => void) | undefined;

    act(() =>
      roundStart?.({
        payload: {
          round: 2,
          delay: 5000,
          hostState: {
            hp: 2000,
            combo: 0,
            godlikeCombo: 0,
            comboRank: null,
          },
          guestState: {
            hp: 1800,
            combo: 1,
            godlikeCombo: 0,
            comboRank: null,
          },
        },
      }),
    );

    expect(result.current.phase).toBe("COUNTDOWN");
    expect(result.current.countdown).toBe(3);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.countdown).toBe(2);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.countdown).toBe(1);
    expect(result.current.handleTap()).toBeNull();
    unmount();
  });

  it("restores the observed battle log from the spectator room snapshot", async () => {
    const roundLog = {
      round: 1,
      winner: "player" as const,
      playerTime: 180,
      playerRank: "EXCELLENT" as const,
      playerFoul: null,
      playerComboBefore: 0,
      opponentTime: 220,
      opponentRank: "NORMAL" as const,
      opponentFoul: null,
      opponentComboBefore: 0,
      damage: 100,
      playerHpAfter: 1500,
      opponentHpAfter: 1400,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          room: {
            code: "123-456",
            status: "ACTIVE",
            createdAt: "",
            expiresAt: "",
            stateRevision: 1,
            stateSnapshot: {
              phase: "MATCH_FINISHED",
              currentRound: 2,
              initialHp: 1500,
              player: {
                userId: "host-session",
                userName: "Host Player",
                device: "desktop",
                hp: 1500,
                combo: 0,
                godlikeCombo: 0,
                currentRoundTime: null,
                currentRoundRank: null,
                currentRoundFoul: null,
                isReady: true,
              },
              opponent: {
                userId: "guest-session",
                userName: "Guest Player",
                device: "desktop",
                hp: 1400,
                combo: 0,
                godlikeCombo: 0,
                currentRoundTime: null,
                currentRoundRank: null,
                currentRoundFoul: null,
                isReady: true,
              },
              roundResult: null,
              roundLogs: [roundLog],
              matchWinner: "player",
              matchFinishReason: "hp_zero",
            },
          },
          participants: [
            {
              sessionId: "host-session",
              userName: "Host Player",
              role: "PLAYER_1",
              joinOrder: 1,
              isOwner: true,
              isGameHost: true,
              connected: true,
            },
            {
              sessionId: "guest-session",
              userName: "Guest Player",
              role: "PLAYER_2",
              joinOrder: 2,
              isOwner: false,
              isGameHost: false,
              connected: true,
            },
            {
              sessionId: "spectator-session",
              userName: "Watcher",
              role: "SPECTATOR",
              joinOrder: 3,
              isOwner: false,
              isGameHost: false,
              connected: true,
            },
          ],
        }),
      }),
    );

    const { result, unmount } = renderHook(() =>
      useBattleRoom({
        roomId: "123-456",
        isHost: false,
        role: "SPECTATOR",
        userName: "Watcher",
        sessionId: "spectator-session",
        sessionToken: "spectator-token",
      }),
    );

    await waitFor(() => expect(result.current.roundLogs).toEqual([roundLog]));
    expect(result.current.phase).toBe("MATCH_FINISHED");
    unmount();
  });

  it("restores and reverses the latest room snapshot when promoted to game host", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        room: {
          code: "123-456",
          status: "ACTIVE",
          createdAt: "",
          expiresAt: "",
          stateRevision: 4,
          stateSnapshot: {
            phase: "WAITING",
            currentRound: 3,
            initialHp: 1500,
            player: {
              userId: "former-host",
              userName: "Former Host",
              device: "desktop",
              hp: 900,
              combo: 2,
              godlikeCombo: 1,
              currentRoundTime: null,
              currentRoundRank: null,
              currentRoundFoul: null,
              isReady: true,
            },
            opponent: {
              userId: "new-host",
              userName: "New Host",
              device: "mobile",
              hp: 1200,
              combo: 1,
              godlikeCombo: 0,
              currentRoundTime: null,
              currentRoundRank: null,
              currentRoundFoul: null,
              isReady: true,
            },
            roundResult: null,
            roundLogs: [
              {
                round: 2,
                winner: "player",
                playerTime: 180,
                playerRank: "EXCELLENT",
                playerFoul: null,
                playerComboBefore: 1,
                opponentTime: 220,
                opponentRank: "NORMAL",
                opponentFoul: null,
                opponentComboBefore: 0,
                damage: 100,
                playerHpAfter: 900,
                opponentHpAfter: 1200,
              },
            ],
            matchWinner: null,
            matchFinishReason: null,
          },
        },
        participants: [
          {
            sessionId: "former-host",
            userName: "Former Host",
            role: "PLAYER_1",
            joinOrder: 1,
            isOwner: true,
            isGameHost: false,
            connected: false,
          },
          {
            sessionId: "new-host",
            userName: "New Host",
            role: "PLAYER_2",
            joinOrder: 2,
            isOwner: false,
            isGameHost: true,
            connected: true,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result, unmount } = renderHook(() =>
      useBattleRoom({
        roomId: "123-456",
        isHost: false,
        sessionId: "new-host",
        sessionToken: "new-host-token",
      }),
    );

    await waitFor(() => {
      expect(result.current.isHost).toBe(true);
      expect(result.current.player.userId).toBe("new-host");
      expect(result.current.player.hp).toBe(1200);
      expect(result.current.opponent?.userId).toBe("former-host");
      expect(result.current.opponent?.hp).toBe(900);
      expect(result.current.roundLogs[0]?.winner).toBe("opponent");
      expect(result.current.roundLogs[0]?.playerHpAfter).toBe(1200);
    });
    unmount();
  });

  it("finishes a spectator match when both players foul and the host broadcasts a draw", () => {
    const { result, unmount } = renderHook(() =>
      useBattleRoom({
        roomId: "123-456",
        isHost: false,
        role: "SPECTATOR",
      }),
    );
    const matchFinished = supabaseMocks.handlers["broadcast:match_finished"] as
      ((event: { payload: unknown }) => void) | undefined;

    act(() =>
      matchFinished?.({
        payload: {
          winner: "draw",
          reason: "foul",
          playerHp: 0,
          opponentHp: 0,
        },
      }),
    );

    expect(result.current.phase).toBe("MATCH_FINISHED");
    expect(result.current.matchWinner).toBe("draw");
    expect(result.current.matchFinishReason).toBe("foul");
    expect(result.current.player.hp).toBe(0);
    unmount();
  });

  it("marks the player as fouled instead of waiting after a false start", () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() =>
      useBattleRoom({ roomId: "123-456", isHost: false }),
    );
    const roundStart = supabaseMocks.handlers["broadcast:round_start"] as
      ((event: { payload: unknown }) => void) | undefined;

    act(() => {
      roundStart?.({
        payload: {
          round: 2,
          delay: 5000,
          hostState: {
            hp: 2000,
            combo: 0,
            godlikeCombo: 0,
            comboRank: null,
          },
          guestState: {
            hp: 1800,
            combo: 1,
            godlikeCombo: 0,
            comboRank: null,
          },
        },
      });
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.phase).toBe("WAITING");

    act(() => {
      result.current.handleTap();
    });

    expect(result.current.player.currentRoundFoul).toBe("early_click");
    unmount();
  });

  it("allows spectator reactions while rejecting player-only actions", () => {
    const { result, unmount } = renderHook(() =>
      useBattleRoom({
        roomId: "123-456",
        isHost: false,
        role: "SPECTATOR",
      }),
    );

    act(() => {
      expect(result.current.handleTap()).toBeNull();
      result.current.startMatch();
      result.current.acceptDeviceWarning();
      result.current.requestRematch();
      result.current.sendReaction("👀");
    });

    const sentEvents = supabaseMocks.channel.send.mock.calls.map(([message]) =>
      typeof message === "object" && message !== null && "event" in message
        ? message.event
        : null,
    );
    expect(sentEvents).not.toContain("device_warning_accept");
    expect(sentEvents).not.toContain("rematch_request");
    expect(sentEvents).toContain("reaction");
    expect(supabaseMocks.channel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "reaction",
        payload: expect.objectContaining({
          emoji: "👀",
          role: "SPECTATOR",
          userName: expect.any(String),
        }),
      }),
    );
    unmount();
  });

  it("only allows the current game host to dissolve the room", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        room: {
          code: "123-456",
          status: "ACTIVE",
          createdAt: "",
          expiresAt: "",
          stateRevision: 0,
          stateSnapshot: null,
        },
        participants: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const nonHost = renderHook(() =>
      useBattleRoom({
        roomId: "123-456",
        isHost: false,
        isOwner: true,
        sessionId: "owner-session",
        sessionToken: "owner-token",
      }),
    );

    await expect(nonHost.result.current.dissolveRoom()).rejects.toThrow(
      "Only the game host",
    );
    expect(
      fetchMock.mock.calls.some(([, options]) => options?.method === "DELETE"),
    ).toBe(false);
    nonHost.unmount();

    const host = renderHook(() =>
      useBattleRoom({
        roomId: "123-456",
        isHost: true,
        isOwner: false,
        sessionId: "host-session",
        sessionToken: "host-token",
      }),
    );

    await act(async () => {
      await host.result.current.dissolveRoom();
    });
    expect(
      fetchMock.mock.calls.some(([, options]) => options?.method === "DELETE"),
    ).toBe(true);
    host.unmount();
  });

  it("sends the eyes reaction stamp", () => {
    const { result, unmount } = renderHook(() =>
      useBattleRoom({ roomId: "123-456", isHost: false }),
    );

    act(() => {
      result.current.sendReaction("👀");
    });

    expect(supabaseMocks.channel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "reaction",
        payload: expect.objectContaining({ emoji: "👀" }),
      }),
    );
    unmount();
  });

  it("displays spectator reactions separately from player reactions", () => {
    const { result, unmount } = renderHook(() =>
      useBattleRoom({ roomId: "123-456", isHost: false }),
    );
    const reactionHandler = supabaseMocks.handlers["broadcast:reaction"] as
      ((event: { payload: unknown }) => void) | undefined;

    act(() =>
      reactionHandler?.({
        payload: {
          emoji: "👀",
          role: "SPECTATOR",
          senderId: "spectator-1",
          userName: "Watcher",
        },
      }),
    );

    expect(result.current.spectatorReaction).toHaveLength(1);
    expect(result.current.spectatorReaction[0]).toMatchObject({
      senderId: "spectator-1",
      emoji: "👀",
      userName: "Watcher",
    });
    expect(result.current.opponentReaction).toBeNull();
    unmount();
  });

  it("keeps simultaneous spectator reactions in receive order", () => {
    const { result, unmount } = renderHook(() =>
      useBattleRoom({ roomId: "123-456", isHost: false }),
    );
    const reactionHandler = supabaseMocks.handlers["broadcast:reaction"] as
      ((event: { payload: unknown }) => void) | undefined;

    act(() => {
      reactionHandler?.({
        payload: {
          emoji: "👀",
          role: "SPECTATOR",
          senderId: "spectator-1",
          userName: "First watcher",
        },
      });
      reactionHandler?.({
        payload: {
          emoji: "👍",
          role: "SPECTATOR",
          senderId: "spectator-2",
          userName: "Second watcher",
        },
      });
    });

    expect(
      result.current.spectatorReaction.map(({ senderId, userName, emoji }) => ({
        senderId,
        userName,
        emoji,
      })),
    ).toEqual([
      {
        senderId: "spectator-1",
        userName: "First watcher",
        emoji: "👀",
      },
      {
        senderId: "spectator-2",
        userName: "Second watcher",
        emoji: "👍",
      },
    ]);
    unmount();
  });

  it("bounds the active spectator reaction queue", () => {
    const { result, unmount } = renderHook(() =>
      useBattleRoom({ roomId: "123-456", isHost: false }),
    );
    const reactionHandler = supabaseMocks.handlers["broadcast:reaction"] as
      ((event: { payload: unknown }) => void) | undefined;

    act(() => {
      for (let index = 0; index < 13; index += 1) {
        reactionHandler?.({
          payload: {
            emoji: "👀",
            role: "SPECTATOR",
            senderId: `spectator-${index}`,
            userName: `Watcher ${index}`,
          },
        });
      }
    });

    expect(result.current.spectatorReaction).toHaveLength(12);
    expect(
      result.current.spectatorReaction.map(({ senderId }) => senderId),
    ).toEqual(
      Array.from({ length: 12 }, (_, index) => `spectator-${index + 1}`),
    );
    unmount();
  });

  it("keeps spectator stamps visible for the complete upward animation", () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() =>
      useBattleRoom({ roomId: "123-456", isHost: false }),
    );
    const reactionHandler = supabaseMocks.handlers["broadcast:reaction"] as
      ((event: { payload: unknown }) => void) | undefined;

    act(() =>
      reactionHandler?.({
        payload: {
          emoji: "👀",
          role: "SPECTATOR",
          senderId: "spectator-1",
          userName: "Watcher",
        },
      }),
    );

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.spectatorReaction).toHaveLength(1);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.spectatorReaction).toHaveLength(0);
    unmount();
  });

  it("keeps player reactions on the opponent card", () => {
    const { result, unmount } = renderHook(() =>
      useBattleRoom({ roomId: "123-456", isHost: false }),
    );
    const reactionHandler = supabaseMocks.handlers["broadcast:reaction"] as
      ((event: { payload: unknown }) => void) | undefined;

    act(() =>
      reactionHandler?.({
        payload: {
          emoji: "👍",
          role: "PLAYER_2",
          senderId: "player-2",
          userName: "Opponent",
        },
      }),
    );

    expect(result.current.opponentReaction).toBe("👍");
    expect(result.current.spectatorReaction).toEqual([]);
    unmount();
  });

  it("marks the session expired and stops heartbeats after an unauthorized response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "Invalid or expired session.",
            code: "INVALID_SESSION",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );
    sessionStorage.setItem(
      "battle_session:123-456",
      JSON.stringify({ sessionId: "session-1", token: "expired-token" }),
    );

    const { result, unmount } = renderHook(() =>
      useBattleRoom({
        roomId: "123-456",
        isHost: false,
        sessionId: "session-1",
        sessionToken: "expired-token",
      }),
    );

    await waitFor(() => expect(result.current.sessionExpired).toBe(true));

    expect(sessionStorage.getItem("battle_session:123-456")).toBeNull();
    expect(supabaseMocks.channel.unsubscribe).toHaveBeenCalled();
    unmount();
  });
});
