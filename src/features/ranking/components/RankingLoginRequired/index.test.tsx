import { RankingLoginRequired } from "@/features/ranking/components/RankingLoginRequired/index";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSignInWithOAuth = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/routing", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

describe("RankingLoginRequired", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders login required elements", () => {
    render(<RankingLoginRequired />);

    expect(screen.getByText("login_required_badge")).toBeInTheDocument();
    expect(screen.getByText("login_required_title")).toBeInTheDocument();
    expect(screen.getByText("login_required_desc")).toBeInTheDocument();
    expect(screen.getByText("btn_login_google")).toBeInTheDocument();
    expect(screen.getByText("btn_login_x")).toBeInTheDocument();
    expect(screen.getByText("btn_return")).toBeInTheDocument();
  });

  it("calls signInWithOAuth for Google when Google button is clicked", () => {
    render(<RankingLoginRequired />);

    fireEvent.click(screen.getByText("btn_login_google"));
    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "google",
      }),
    );
  });

  it("calls signInWithOAuth for X when X button is clicked", () => {
    render(<RankingLoginRequired />);

    fireEvent.click(screen.getByText("btn_login_x"));
    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "x",
      }),
    );
  });
});
