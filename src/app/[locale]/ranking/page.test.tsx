import RankingPage from "@/app/[locale]/ranking/page";
import { redirect } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { cleanup, render, screen } from "@testing-library/react";
import { headers } from "next/headers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/i18n/routing", () => ({
  redirect: vi.fn(),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/Header", () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

vi.mock("@/features/ranking", () => ({
  RankingLoginRequired: () => (
    <div data-testid="ranking-login-required">Login Required</div>
  ),
}));

vi.mock("@/app/[locale]/ranking/RankingClient", () => ({
  RankingClient: ({
    currentUserId,
    initialDeviceType,
  }: {
    currentUserId: string;
    initialDeviceType?: string;
  }) => (
    <div data-testid="ranking-client">
      RankingClient for {currentUserId} ({initialDeviceType})
    </div>
  ),
}));

describe("RankingPage Server Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(headers).mockResolvedValue(new Headers());
  });

  afterEach(() => {
    cleanup();
  });

  it("renders RankingLoginRequired when user is not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const jsx = await RankingPage();
    render(jsx);

    expect(screen.getByTestId("ranking-login-required")).toBeInTheDocument();
    expect(screen.queryByTestId("ranking-client")).not.toBeInTheDocument();
  });

  it("renders RankingClient even if profile is not set", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const jsx = await RankingPage();
    render(jsx);

    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByTestId("ranking-client")).toBeInTheDocument();
  });

  it("renders RankingClient with PC when user is authenticated and on desktop device", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1",
      isProfileSet: true,
    } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>);

    const jsx = await RankingPage();
    render(jsx);

    expect(screen.getByTestId("ranking-client")).toBeInTheDocument();
    expect(screen.getByText("RankingClient for u1 (PC)")).toBeInTheDocument();
  });

  it("renders RankingClient with MOBILE when user is authenticated and on mobile device", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1",
      isProfileSet: true,
    } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>);

    vi.mocked(headers).mockResolvedValue(
      new Headers({
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15",
      }),
    );

    const jsx = await RankingPage();
    render(jsx);

    expect(screen.getByTestId("ranking-client")).toBeInTheDocument();
    expect(
      screen.getByText("RankingClient for u1 (MOBILE)"),
    ).toBeInTheDocument();
  });
});
