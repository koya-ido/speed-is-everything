import { BattleRoundLogModal } from "@/features/battle/components/BattleRoundLogModal";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations:
    () => (key: string, values?: { count?: number; name?: string }) => {
      if (key === "log_summary") return `log_summary:${values?.count}`;
      if (key === "log_named_win") return `${values?.name}の勝利`;
      return key;
    },
}));

describe("BattleRoundLogModal", () => {
  it("shows spectator player names and synchronized round logs", () => {
    render(
      <BattleRoundLogModal
        isOpen
        isSpectator
        playerName="Host Player"
        opponentName="Guest Player"
        logs={[
          {
            round: 1,
            winner: "player",
            playerTime: 180,
            playerRank: "EXCELLENT",
            playerFoul: null,
            playerComboBefore: 0,
            opponentTime: 220,
            opponentRank: "NORMAL",
            opponentFoul: null,
            opponentComboBefore: 0,
            damage: 100,
            playerHpAfter: 1500,
            opponentHpAfter: 1400,
          },
        ]}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("log_summary:1")).toBeInTheDocument();
    expect(screen.getByText("Host Player")).toBeInTheDocument();
    expect(screen.getByText("Guest Player")).toBeInTheDocument();
    expect(screen.getByText("180.0ms")).toBeInTheDocument();
    expect(screen.getByText("Host Playerの勝利")).toBeInTheDocument();
    expect(screen.getByText("Host Player")).toHaveClass("text-[#00f3ff]");
    expect(screen.getByText("Guest Player")).toHaveClass("text-[#ff0055]");
  });
});
