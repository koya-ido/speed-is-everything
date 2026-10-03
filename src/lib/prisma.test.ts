import { afterEach, describe, expect, it, vi } from "vitest";

describe("prisma lazy initialization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not throw upon importing prisma even when env vars are missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("DIRECT_URL", "");
    vi.stubEnv("NODE_ENV", "production");

    // Re-importing prisma
    const { prisma } = await import("@/lib/prisma");
    expect(prisma).toBeDefined();

    // Accessing a property should trigger the initialization and throw because connectionString is missing
    expect(() => {
      Reflect.get(prisma, "user");
    }).toThrow("DATABASE_URL or DIRECT_URL is not set");
  });
});
