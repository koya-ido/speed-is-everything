import { POST } from "@/app/api/game/score/route";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { verifyGameToken, verifySameOrigin } from "@/utils/security";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/utils/security", () => ({
  verifyGameToken: vi.fn(),
  verifySameOrigin: vi.fn(() => true),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ranking: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    user: {
      update: vi
        .fn()
        .mockResolvedValue({ id: "user-1", playCount: 1, foulCount: 0 }),
      upsert: vi
        .fn()
        .mockResolvedValue({ id: "user-1", playCount: 1, foulCount: 0 }),
    },
    userTitle: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

const mockCreateClient = vi.mocked(createClient);
const mockVerifyGameToken = vi.mocked(verifyGameToken);
const mockRankingUpsert = vi.mocked(prisma.ranking.upsert);
const mockRankingFindUnique = vi.mocked(prisma.ranking.findUnique);

const mockUser = (user: { id: string } | null) => {
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: () => Promise.resolve({ data: { user } }),
    },
  } as unknown as Awaited<ReturnType<typeof createClient>>);
};

describe("POST /api/game/score", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if unauthorized", async () => {
    mockUser(null);

    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 if token is invalid", async () => {
    mockUser({ id: "user-1" });
    mockVerifyGameToken.mockResolvedValue(null);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        session_token: "bad",
        raw_reactions: [],
        clear_count: 0,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid session token");
  });

  it("returns 400 if there is an impossible reaction", async () => {
    mockUser({ id: "user-1" });
    mockVerifyGameToken.mockResolvedValue({
      startedAt: Date.now() - 5000,
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        session_token: "good",
        raw_reactions: [90], // impossible
        clear_count: 1,
        stats: {},
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Impossible reaction detected");
  });

  it("returns 400 if time manipulation is detected (game cleared impossibly fast)", async () => {
    mockUser({ id: "user-1" });

    // トークンが発行されてから2秒しか経っていないのに、5回クリアしたというあり得ない結果をシミュレート
    mockVerifyGameToken.mockResolvedValue({
      startedAt: Date.now() - 2000,
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        session_token: "good",
        raw_reactions: [150, 150, 150, 150, 150], // 5 clears
        clear_count: 5,
        remaining_time: 2250,
        device_type: "PC",
        stats: { average: 150, median: 150 },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Time manipulation detected");
  });

  it("saves new record successfully", async () => {
    mockUser({ id: "user-1" });
    mockVerifyGameToken.mockResolvedValue({
      startedAt: Date.now() - 5000,
    });
    mockRankingFindUnique.mockResolvedValue(null as never); // no existing
    mockRankingUpsert.mockResolvedValue({} as never);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        session_token: "good",
        raw_reactions: [250, 300],
        clear_count: 2,
        remaining_time: 2500,
        device_type: "PC",
        stats: { average: 275, median: 275 },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.is_new_record).toBe(true);
    expect(prisma.ranking.upsert).toHaveBeenCalled();
    const upsertCall = mockRankingUpsert.mock.calls[0][0];
    // Verify server calculated remainingTime = 3000 - 550 = 2450, average = 275, median = 275
    expect(upsertCall.create.remainingTime).toBe(2450);
    expect(upsertCall.create.averageTime).toBe(275);
    expect(upsertCall.create.medianTime).toBe(275);
  });

  it("returns 400 if device_type is invalid", async () => {
    mockUser({ id: "user-1" });
    mockVerifyGameToken.mockResolvedValue({
      startedAt: Date.now() - 5000,
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        session_token: "good",
        raw_reactions: [250],
        clear_count: 1,
        device_type: "SMART_WATCH", // invalid
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid device_type");
  });

  it("returns 400 if reaction time exceeds 3000ms total", async () => {
    mockUser({ id: "user-1" });
    mockVerifyGameToken.mockResolvedValue({
      startedAt: Date.now() - 50000,
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        session_token: "good",
        raw_reactions: [1600, 1500], // total 3100 > 3000
        clear_count: 2,
        device_type: "PC",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Reaction time exceeds allowance");
  });

  it("returns 403 if origin is cross-site / forbidden", async () => {
    vi.mocked(verifySameOrigin).mockReturnValueOnce(false);

    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Forbidden");
  });

  it("returns 403 if token belongs to another user", async () => {
    mockUser({ id: "user-1" });
    mockVerifyGameToken.mockResolvedValue({
      startedAt: Date.now() - 5000,
      userId: "user-2", // different user
    });

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        session_token: "stolen-token",
        raw_reactions: [200],
        clear_count: 1,
        device_type: "PC",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Token belongs to another user");
  });

  it("returns 400 if automated input is detected with near-zero variance", async () => {
    mockUser({ id: "user-1" });
    mockVerifyGameToken.mockResolvedValue({
      startedAt: Date.now() - 30000,
    });

    // 8 reactions, all identically 150ms -> variance = 0 < 4
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        session_token: "good",
        raw_reactions: [150, 150, 150, 150, 150, 150, 150, 150],
        clear_count: 8,
        device_type: "PC",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Automated input detected");
  });
});
