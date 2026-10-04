import { BattleSessionExpiredModal } from "@/features/battle/components/BattleSessionExpiredModal";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("BattleSessionExpiredModal", () => {
  it("explains the heartbeat timeout and provides a top-page action", () => {
    const onReturnToTop = vi.fn();
    render(<BattleSessionExpiredModal onReturnToTop={onReturnToTop} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("session_expired_message")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "return_to_top" }));
    expect(onReturnToTop).toHaveBeenCalledOnce();
  });
});
