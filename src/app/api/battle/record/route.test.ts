import { POST } from "@/app/api/battle/record/route";
import { authorizeBattleResult } from "@/features/battle/server/rooms";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
    userTitle: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/features/battle/server/rooms", () => ({
  authorizeBattleResult: vi.fn().mockResolvedValue({ participantUserId: null }),
  battleRoomErrorResponse: (error: unknown) =>
    Response.json({ error: String(error) }, { status: 500 }),
}));

describe("POST /api/battle/record", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid payload", async () => {
    const req = new Request("http://localhost/api/battle/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: 123 }),
    });
    const res = await POST(new NextRequest(req));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid request payload");
  });

  it("handles battle record for anonymous user", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request("http://localhost/api/battle/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: "389-102",
        sessionId: "session-1",
        sessionToken: "session-secret",
        result: "win",
        remainingHp: 650.5,
        rounds: 3,
      }),
    });
    const res = await POST(new NextRequest(req));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.roomId).toBe("389-102");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("increments battlePlayCount and battleWinCount for logged in user", async () => {
    vi.mocked(authorizeBattleResult).mockResolvedValue({
      participantUserId: "user_abc",
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "user_abc" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "user_abc",
      battlePlayCount: 1,
      battleWinCount: 1,
      battleLoseCount: 0,
      battleDrawCount: 0,
      foulCount: 0,
    } as unknown as Awaited<ReturnType<typeof prisma.user.update>>);

    const req = new Request("http://localhost/api/battle/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: "389-102",
        sessionId: "session-1",
        sessionToken: "session-secret",
        result: "win",
        remainingHp: 400,
        rounds: 2,
      }),
    });
    const res = await POST(new NextRequest(req));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_abc" },
      data: {
        battlePlayCount: { increment: 1 },
        battleWinCount: { increment: 1 },
      },
    });
  });

  it("returns 403 when CSRF check fails", async () => {
    const req = new Request("http://localhost/api/battle/record", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "sec-fetch-site": "cross-site",
      },
      body: JSON.stringify({
        roomId: "389-102",
        sessionId: "session-1",
        sessionToken: "session-secret",
        result: "win",
        remainingHp: 400,
      }),
    });
    const res = await POST(new NextRequest(req));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Forbidden");
  });
});
