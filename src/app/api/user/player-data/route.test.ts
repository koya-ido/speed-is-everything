import { GET } from "@/app/api/user/player-data/route";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    ranking: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("GET /api/user/player-data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthorized", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 404 when user record does not exist", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "user-1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("calculates and returns comprehensive player statistics", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "user-1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      name: "CyberRunner",
      image: "avatar.png",
      country: "JP",
      selectedTitle: "apex_predator",
      playCount: 15,
      foulCount: 2,
      highestPcRank: 1,
      highestMobileRank: null,
      battlePlayCount: 10,
      battleWinCount: 8,
      battleLoseCount: 1,
      battleDrawCount: 1,
      titles: [
        {
          id: "ut-1",
          userId: "user-1",
          titleId: "apex_predator",
          unlockedAt: new Date("2026-01-01T00:00:00Z"),
        },
      ],
      rankings: [
        {
          deviceType: "PC",
          clearCount: 10,
          remainingTime: 2500,
          rawReactions: [150, 160, 170, 180],
        },
      ],
    } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>);

    vi.mocked(prisma.ranking.count).mockResolvedValue(0); // 0 people better -> rank 1

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // ユーザー情報
    expect(json.user.name).toBe("CyberRunner");
    expect(json.user.selectedTitle).toBe("apex_predator");

    // 総合データ
    expect(json.overall.fastestReaction).toBe(150);
    expect(json.overall.currentRank.pc).toBe(1);
    expect(json.overall.highestRank.pc).toBe(1);

    // ゲームモード
    expect(json.gameMode.bestScore.clearCount).toBe(10);
    expect(json.gameMode.playCount).toBe(15);

    // バトルモード
    expect(json.battleMode.playCount).toBe(10);
    expect(json.battleMode.winCount).toBe(8);
    expect(json.battleMode.winRate).toBe(80);

    // 称号リスト
    expect(json.titles.length).toBeGreaterThan(0);
    const apex = json.titles.find(
      (title: { id: string }) => title.id === "apex_predator",
    );
    expect(apex?.unlocked).toBe(true);
    expect(apex?.isSelected).toBe(true);

    const awakened = json.titles.find(
      (title: { id: string }) => title.id === "awakened",
    );
    expect(awakened?.progress).toEqual({ current: 10, target: 10, unit: "回" });
  });
});
