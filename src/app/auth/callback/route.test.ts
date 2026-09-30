import { getSafeRedirectUrl } from "@/app/auth/callback/route";
import { describe, expect, it } from "vitest";

describe("getSafeRedirectUrl (Open Redirect Prevention)", () => {
  it("allows safe relative paths", () => {
    expect(getSafeRedirectUrl("/ranking")).toBe("/ranking");
    expect(getSafeRedirectUrl("/ja/game")).toBe("/ja/game");
    expect(getSafeRedirectUrl("/profile?tab=edit#section")).toBe(
      "/profile?tab=edit#section",
    );
  });

  it("rejects protocol-relative URLs", () => {
    expect(getSafeRedirectUrl("//evil.com")).toBe("/");
    expect(getSafeRedirectUrl("//evil.com/path")).toBe("/");
  });

  it("rejects absolute URLs", () => {
    expect(getSafeRedirectUrl("https://evil.com")).toBe("/");
    expect(getSafeRedirectUrl("http://evil.com/fake")).toBe("/");
  });

  it("rejects backslash bypasses", () => {
    expect(getSafeRedirectUrl("/\\evil.com")).toBe("/");
    expect(getSafeRedirectUrl("/\\evil.com/path")).toBe("/");
    expect(getSafeRedirectUrl("\\evil.com")).toBe("/");
  });

  it("rejects non-http schemes like javascript:", () => {
    expect(getSafeRedirectUrl("javascript:alert(1)")).toBe("/");
    expect(getSafeRedirectUrl("data:text/html,<script>alert(1)</script>")).toBe(
      "/",
    );
  });

  it("handles null, empty, or undefined safely", () => {
    expect(getSafeRedirectUrl(null)).toBe("/");
    expect(getSafeRedirectUrl("")).toBe("/");
    expect(getSafeRedirectUrl(undefined as unknown as string)).toBe("/");
  });

  it("supports custom fallback path", () => {
    expect(getSafeRedirectUrl("//evil.com", "/fallback")).toBe("/fallback");
  });
});
