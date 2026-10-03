import { useBattleRoom } from "@/features/battle/hooks/useBattleRoom";
import { act, renderHook } from "@testing-library/react";
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
      | (() => void)
      | undefined;
    act(() => presenceSync?.());

    const roundStart = supabaseMocks.handlers["broadcast:round_start"] as
      | ((event: { payload: unknown }) => void)
      | undefined;
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
});
