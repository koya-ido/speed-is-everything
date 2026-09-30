import { PATCH } from "@/app/api/user/profile/route";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
    },
  },
}));

describe("PATCH /api/user/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "Alice" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid or whitespace-only name", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    // Whitespace only
    const req1 = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "    " }),
    });
    const res1 = await PATCH(req1);
    expect(res1.status).toBe(400);

    // Non-string
    const req2 = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: 12345 }),
    });
    const res2 = await PATCH(req2);
    expect(res2.status).toBe(400);
  });

  it("returns 400 for name longer than 15 chars", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "1234567890123456" }), // 16 chars
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for country longer than 50 chars", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "ValidName", country: "A".repeat(51) }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("updates profile successfully with sanitized inputs", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () =>
          Promise.resolve({ data: { user: { id: "u1", user_metadata: {} } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(prisma.user.upsert).mockResolvedValue({} as never);

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "  PlayerOne  ", country: "  JP  " }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        update: expect.objectContaining({
          name: "PlayerOne",
          country: "JP",
        }),
      }),
    );
  });
});
