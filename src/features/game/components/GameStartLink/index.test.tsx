import { getPendingScore, setPendingScore } from "@/features/game";
import { GameStartLink } from "@/features/game/components/GameStartLink/index";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock routing Link
vi.mock("@/i18n/routing", () => ({
  Link: ({
    children,
    href,
    onClick,
  }: {
    children?: React.ReactNode;
    href?: string;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick} data-testid="game-start-link">
      {children}
    </a>
  ),
}));

describe("GameStartLink", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("clears pending score when clicked", () => {
    setPendingScore({ some_data: "test" });
    expect(getPendingScore()).not.toBeNull();

    render(<GameStartLink>Start Game</GameStartLink>);
    const link = screen.getByTestId("game-start-link");

    fireEvent.click(link);

    expect(getPendingScore()).toBeNull();
  });
});
