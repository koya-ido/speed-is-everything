import { RoomDissolveConfirmationModal } from "@/features/battle/components/RoomDissolveConfirmationModal";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("RoomDissolveConfirmationModal", () => {
  afterEach(() => cleanup());

  it("shows the warning and invokes cancel or confirm actions", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <RoomDissolveConfirmationModal
        isPending={false}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
      "room_dissolve_confirm",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "room_dissolve_cancel" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "room_dissolve" }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("disables actions while the room is being dissolved", () => {
    render(
      <RoomDissolveConfirmationModal
        isPending
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "room_dissolve_cancel" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "room_dissolve_pending" }),
    ).toBeDisabled();
  });
});
