import { BattleSelectModal } from "@/features/battle/components/BattleSelectModal";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("BattleSelectModal mobile layout", () => {
  it("keeps both room action labels on one line beside compact role tags", () => {
    render(
      <BattleSelectModal
        isOpen
        onClose={vi.fn()}
        onSelectCreate={vi.fn()}
        onSelectJoin={vi.fn()}
      />,
    );

    for (const title of ["create_room_card_title", "join_room_card_title"]) {
      expect(screen.getByText(title)).toHaveClass("whitespace-nowrap");
    }
    expect(screen.getByText("GUEST")).toHaveClass("shrink-0");
    expect(screen.getByText("HOST")).toHaveClass("shrink-0");
  });
});
