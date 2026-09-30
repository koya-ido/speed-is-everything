// @vitest-environment node
import {
  signGameToken,
  verifyGameToken,
  verifySameOrigin,
} from "@/utils/security";
import { beforeEach, describe, expect, it } from "vitest";

describe("security (JWT Game Token)", () => {
  beforeEach(() => {
    process.env.GAME_JWT_SECRET = "test-secret-key-12345678901234567890";
  });

  it("signs and verifies a valid token successfully", async () => {
    const startedAt = Date.now();
    const token = await signGameToken({ startedAt });
    expect(typeof token).toBe("string");

    const payload = await verifyGameToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.startedAt).toBe(startedAt);
  });

  it("returns null for an invalid or tampered token", async () => {
    const validToken = await signGameToken({ startedAt: Date.now() });
    const tamperedToken = validToken.slice(0, -5) + "xxxxx";

    const payload = await verifyGameToken(tamperedToken);
    expect(payload).toBeNull();
  });

  it("throws error if GAME_JWT_SECRET is missing", async () => {
    delete process.env.GAME_JWT_SECRET;
    await expect(signGameToken({ startedAt: Date.now() })).rejects.toThrow(
      "GAME_JWT_SECRET is missing",
    );
    await expect(verifyGameToken("token")).rejects.toThrow(
      "GAME_JWT_SECRET is missing",
    );
  });
});

describe("security (verifySameOrigin CSRF protection)", () => {
  it("returns true when origin matches host", () => {
    const req = new Request("http://example.com/api", {
      headers: {
        origin: "https://example.com",
        host: "example.com",
      },
    });
    expect(verifySameOrigin(req)).toBe(true);
  });

  it("returns false when origin host differs from host header", () => {
    const req = new Request("http://example.com/api", {
      headers: {
        origin: "https://evil.com",
        host: "example.com",
      },
    });
    expect(verifySameOrigin(req)).toBe(false);
  });

  it("returns false when sec-fetch-site is cross-site", () => {
    const req = new Request("http://example.com/api", {
      headers: {
        "sec-fetch-site": "cross-site",
      },
    });
    expect(verifySameOrigin(req)).toBe(false);
  });

  it("returns true when no origin/host headers exist (e.g. non-browser / direct)", () => {
    const req = new Request("http://example.com/api");
    expect(verifySameOrigin(req)).toBe(true);
  });
});
