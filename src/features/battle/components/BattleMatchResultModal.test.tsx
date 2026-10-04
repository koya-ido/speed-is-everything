import { BattleMatchResultModal } from "@/features/battle/components/BattleMatchResultModal";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { hp?: string }) =>
    key === "match_hp" ? `match_hp:${values?.hp}` : key,
}));

const renderModal = (
  overrides: Partial<React.ComponentProps<typeof BattleMatchResultModal>> = {},
) =>
  render(
    <BattleMatchResultModal
      isOpen
      winner="draw"
      finishReason="both_hp_zero"
      player={{ userName: "Player", hp: 0, combo: 0 }}
      opponent={{ userName: "Opponent", hp: 0, combo: 0 }}
      opponentReturnedToLobby={false}
      rematchRequestedByMe={false}
      rematchRequestedByOpponent={false}
      spectatorCount={0}
      onOpenBattleLog={vi.fn()}
      onRequestRematch={vi.fn()}
      onReturnToLobby={vi.fn()}
      {...overrides}
    />,
  );

describe("BattleMatchResultModal rematch action", () => {
  it("hides the requested button after the opponent returns to the lobby", () => {
    renderModal({
      opponentReturnedToLobby: true,
      rematchRequestedByMe: true,
    });

    expect(
      screen.queryByRole("button", { name: "rematch_requested" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the requested button visible while waiting for the opponent", () => {
    renderModal({ rematchRequestedByMe: true });

    expect(
      screen.getByRole("button", { name: "rematch_requested" }),
    ).toBeDisabled();
  });

  it("shows a neutral result and player outcomes to spectators without rematch actions", () => {
    renderModal({
      isSpectator: true,
      winner: "opponent",
      finishReason: "foul",
      rematchRequestedByOpponent: true,
    });

    expect(screen.getByText("match_result")).toBeInTheDocument();
    expect(screen.getByText("spectator_result_foul")).toBeInTheDocument();
    expect(screen.getByText("match_loser")).toBeInTheDocument();
    expect(screen.getByText("match_winner")).toBeInTheDocument();
    expect(screen.getByText("Player")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "exit_match" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "rematch_accept" }),
    ).not.toBeInTheDocument();
  });

  it("marks both players as draw for spectator results", () => {
    const { container } = renderModal({ isSpectator: true });

    expect(
      within(container).getAllByText("match_draw", { selector: "span" }),
    ).toHaveLength(2);
    expect(screen.getByText("spectator_draw_simultaneous")).toBeInTheDocument();
  });

  it("highlights winner and loser cards and shows zero HP for a player foul", () => {
    const { container } = renderModal({
      winner: "opponent",
      finishReason: "foul",
      player: { userName: "Player", hp: 1500, combo: 0 },
      opponent: { userName: "Opponent", hp: 1500, combo: 0 },
    });

    expect(within(container).getByText("match_hp:0.0")).toBeInTheDocument();
    expect(within(container).getByText("match_hp:1500.0")).toBeInTheDocument();
    expect(
      within(container).getByText("match_you").closest(".rounded-xl"),
    ).toHaveClass("shadow-[0_0_20px_rgba(255,0,85,0.35)]");
    expect(
      within(container).getByText("log_opponent").closest(".rounded-xl"),
    ).toHaveClass("shadow-[0_0_20px_rgba(0,255,102,0.35)]");
    expect(within(container).getByText("match_hp:0.0")).toHaveClass(
      "text-[#ff0055]",
    );
    expect(within(container).getByText("match_hp:1500.0")).toHaveClass(
      "text-[#00f3ff]",
    );
  });

  it("uses blue HP text for the winner and red for the loser", () => {
    const { container } = renderModal({
      winner: "player",
      player: { userName: "Player", hp: 1500, combo: 0 },
      opponent: { userName: "Opponent", hp: 0, combo: 0 },
    });

    expect(within(container).getByText("match_hp:1500.0")).toHaveClass(
      "text-[#00f3ff]",
    );
    expect(within(container).getByText("match_hp:0.0")).toHaveClass(
      "text-[#ff0055]",
    );
  });
});
