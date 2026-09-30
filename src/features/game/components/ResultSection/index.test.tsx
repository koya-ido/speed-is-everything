import { ResultSection } from "@/features/game/components/ResultSection/index";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock routing
vi.mock("@/i18n/routing", () => ({
  Link: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock Supabase
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  }),
}));

describe("ResultSection", () => {
  it("renders MISSION COMPLETE when clearCount > 0", async () => {
    render(
      <ResultSection
        clearCount={1}
        remainingTime={10}
        rawReactions={[200, 250]}
        failedReaction={null}
        failureType={null}
        sessionToken="dummy"
        onRetry={() => { }}
      />,
    );
    expect(
      await screen.findByText("mission_complete", undefined, { timeout: 1500 }),
    ).toBeInTheDocument();
  });

  it("renders GAME OVER when clearCount is 0", async () => {
    render(
      <ResultSection
        clearCount={0}
        remainingTime={10}
        rawReactions={[]}
        failedReaction={150}
        failureType="TOO_FAST"
        sessionToken="dummy"
        onRetry={() => { }}
      />,
    );
    expect(
      await screen.findByText("game_over", undefined, { timeout: 1500 }),
    ).toBeInTheDocument();
  });

  it("does not call /api/game/score when clearCount is 0", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    render(
      <ResultSection
        clearCount={0}
        remainingTime={10}
        rawReactions={[]}
        failedReaction={150}
        failureType="TOO_FAST"
        sessionToken="dummy"
        onRetry={() => { }}
      />,
    );

    await screen.findByText("game_over", undefined, { timeout: 1500 });
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/game/score",
      expect.anything(),
    );
  });
});
