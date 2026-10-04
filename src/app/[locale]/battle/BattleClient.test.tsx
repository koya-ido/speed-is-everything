import { BattleClient } from "@/app/[locale]/battle/BattleClient";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const battleClientMocks = vi.hoisted(() => ({
  clearBattleAdmission: vi.fn(),
  getBattleAdmission: vi.fn(),
  getSearchParam: vi.fn((name: string) => {
    if (name === "room") return "123-456";
    if (name === "confirm") return "true";
    return null;
  }),
}));

vi.mock("@/features/battle/utils/roomApi", () => ({
  clearBattleAdmission: battleClientMocks.clearBattleAdmission,
  getBattleAdmission: battleClientMocks.getBattleAdmission,
}));

vi.mock("@/features/battle", () => ({
  BattleArena: () => null,
  BattleLobbyModal: ({
    existingAdmission,
  }: {
    existingAdmission?: { sessionId: string };
  }) => (
    <div data-testid="existing-admission">
      {existingAdmission?.sessionId ?? "missing"}
    </div>
  ),
  normalizeInitialHp: () => 1500,
}));

vi.mock("@/i18n/routing", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: battleClientMocks.getSearchParam }),
}));

describe("BattleClient admission confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    battleClientMocks.getBattleAdmission.mockReturnValue({
      roomId: "123-456",
      isHost: true,
      initialHp: 1500,
      userName: "OriginalHostName",
      sessionId: "host-session",
      sessionToken: "secret-token",
      role: "PLAYER_1",
      isOwner: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("loads the in-memory host admission on the client for name confirmation", async () => {
    render(<BattleClient />);

    await waitFor(() => {
      expect(screen.getByTestId("existing-admission")).toHaveTextContent(
        "host-session",
      );
    });
    expect(battleClientMocks.getBattleAdmission).toHaveBeenCalledWith(
      "123-456",
    );
  });
});
