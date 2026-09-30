import { GET } from "@/app/api/ranking/route";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ranking: {
      findMany: vi.fn(),
    },
  },
}));

describe("GET /api/ranking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is unauthorized", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request("http://localhost/api/ranking?device_type=PC");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 400 if device_type is invalid", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request("http://localhost/api/ranking?device_type=TABLET");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid device_type");
  });

  it("returns 200 with rankings if user is authenticated and device_type is valid", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const mockRankings = [
      {
        id: "r1",
        clearCount: 10,
        remainingTime: 2000,
        deviceType: "PC",
        user: { id: "u1", name: "Player1", country: "JP", image: null },
      },
    ];
    vi.mocked(prisma.ranking.findMany).mockResolvedValue(
      mockRankings as unknown as Awaited<
        ReturnType<typeof prisma.ranking.findMany>
      >,
    );

    const req = new Request("http://localhost/api/ranking?device_type=PC");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.rankings).toEqual(mockRankings);
  });
});
