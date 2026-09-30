import { POST } from "@/app/api/game/start/route";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { signGameToken, verifySameOrigin } from "@/utils/security";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    gamePlay: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/utils/security", () => ({
  signGameToken: vi.fn(),
  verifySameOrigin: vi.fn(() => true),
}));

describe("POST /api/game/start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 if origin verification fails", async () => {
    vi.mocked(verifySameOrigin).mockReturnValueOnce(false);

    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Forbidden");
  });

  it("generates token for anonymous user when not logged in and records gameplay", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(signGameToken).mockResolvedValue("mock-anon-token");

    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_type: "MOBILE" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.session_token).toBe("mock-anon-token");

    expect(signGameToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
      }),
    );
    expect(prisma.gamePlay.create).toHaveBeenCalledWith({
      data: {
        userId: null,
        deviceType: "MOBILE",
      },
    });
  });

  it("binds logged in userId to game token and records gameplay", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "user-xyz" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-xyz" } as unknown as {
      id: string;
      name: string | null;
      image: string | null;
      country: string | null;
      isProfileSet: boolean;
      playCount: number;
      createdAt: Date;
      updatedAt: Date;
    });
    vi.mocked(signGameToken).mockResolvedValue("mock-user-token");

    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_type: "PC" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.session_token).toBe("mock-user-token");

    expect(signGameToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-xyz",
      }),
    );
    expect(prisma.gamePlay.create).toHaveBeenCalledWith({
      data: {
        userId: "user-xyz",
        deviceType: "PC",
      },
    });
  });
});
