import { BattleRoundLogModal } from "@/features/battle/components/BattleRoundLogModal";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations:
    () => (key: string, values?: Record<string, unknown>) => {
      if (key === "log_summary") return `log_summary:${values?.count}`;
      if (key === "log_named_win") return `${values?.name}の勝利`;
      if (key === "log_spectator_damage") return `ダメージ: ${values?.damage}`;
      if (key === "log_spectator_player_hp")
        return `${values?.name} 残HP: ${values?.hp}`;
      if (key === "log_spectator_opponent_hp")
        return `${values?.name} 残HP: ${values?.hp}`;
      if (key === "log_damage_dealt") return `与ダメ: ${values?.damage}`;
      if (key === "log_damage_taken") return `被ダメ: ${values?.damage}`;
      if (key === "log_player_hp") return `あなたの残HP: ${values?.hp}`;
      if (key === "log_opponent_hp") return `相手の残HP: ${values?.hp}`;
      return key;
    },
}));

describe("BattleRoundLogModal", () => {
  it("shows spectator player names, neutral damage, and named HP labels in spectator mode", () => {
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

    // Spectator mode neutral labels
    expect(screen.getByText("ダメージ: 100.0")).toBeInTheDocument();
    expect(screen.getByText("Host Player 残HP: 1500.0")).toBeInTheDocument();
    expect(screen.getByText("Guest Player 残HP: 1400.0")).toBeInTheDocument();
  });

  it("shows player-relative labels in player mode", () => {
    render(
      <BattleRoundLogModal
        isOpen
        isSpectator={false}
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

    // Player mode labels
    expect(screen.getByText("与ダメ: 100.0")).toBeInTheDocument();
    expect(screen.getByText("あなたの残HP: 1500.0")).toBeInTheDocument();
    expect(screen.getByText("相手の残HP: 1400.0")).toBeInTheDocument();
  });
});
