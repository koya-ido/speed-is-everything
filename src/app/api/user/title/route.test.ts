import { POST } from "@/app/api/user/title/route";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { verifySameOrigin } from "@/utils/security";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
    userTitle: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/utils/security", () => ({
  verifySameOrigin: vi.fn(() => true),
}));

describe("POST /api/user/title", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 if CSRF check fails", async () => {
    vi.mocked(verifySameOrigin).mockReturnValueOnce(false);
    const req = new Request("http://localhost", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 401 if unauthenticated", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ titleId: "apex_predator" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for unknown titleId", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "user-1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ titleId: "non_existent_title" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 if user does not own the title", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "user-1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(prisma.userTitle.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ titleId: "apex_predator" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Title not unlocked");
  });

  it("equips title successfully if owned", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "user-1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(prisma.userTitle.findUnique).mockResolvedValue({
      id: "ut-1",
      userId: "user-1",
      titleId: "apex_predator",
    } as unknown as Awaited<ReturnType<typeof prisma.userTitle.findUnique>>);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "user-1",
      selectedTitle: "apex_predator",
    } as unknown as Awaited<ReturnType<typeof prisma.user.update>>);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ titleId: "apex_predator" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.selectedTitle).toBe("apex_predator");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { selectedTitle: "apex_predator" },
    });
  });

  it("unequips title when titleId is null", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "user-1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "user-1",
      selectedTitle: null,
    } as unknown as Awaited<ReturnType<typeof prisma.user.update>>);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ titleId: null }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.selectedTitle).toBeNull();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { selectedTitle: null },
    });
  });
});
