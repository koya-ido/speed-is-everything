import { POST } from "@/app/api/user/foul/route";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
    userTitle: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("POST /api/user/foul", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles guest foul without database update", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.guest).toBe(true);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("increments foulCount for logged in user", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "user-1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "user-1",
      foulCount: 5,
    } as unknown as Awaited<ReturnType<typeof prisma.user.update>>);

    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.foulCount).toBe(5);
    expect(json.unlockedTitles).toEqual([]);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { foulCount: { increment: 1 } },
    });
  });

  it("unlocks trigger_happy when foulCount reaches 50", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "user-1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "user-1",
      foulCount: 50,
    } as unknown as Awaited<ReturnType<typeof prisma.user.update>>);

    vi.mocked(prisma.userTitle.findMany).mockResolvedValue([]);

    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.unlockedTitles).toContain("trigger_happy");
  });

  it("returns 403 when CSRF check fails", async () => {
    const req = new Request("http://localhost/api/user/foul", {
      method: "POST",
      headers: {
        "sec-fetch-site": "cross-site",
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Forbidden");
  });
});
