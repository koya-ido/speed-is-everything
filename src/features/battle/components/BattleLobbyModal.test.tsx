import { BattleLobbyModal } from "@/features/battle/components/BattleLobbyModal";
import { BattleRoomRequestError } from "@/features/battle/utils/roomApi";
import { BattleParticipantRole } from "@/generated/prisma/client";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const roomMocks = vi.hoisted(() => ({
  createBattleRoom: vi.fn(),
  joinBattleRoom: vi.fn(),
  renameBattleParticipantRequest: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${Object.values(values).join(" ")}` : key,
}));

vi.mock("@/features/battle/utils/roomApi", () => ({
  BattleRoomRequestError: class BattleRoomRequestError extends Error {
    constructor(
      message: string,
      readonly status: number,
      readonly code?: string,
    ) {
      super(message);
    }
  },
  createBattleRoom: roomMocks.createBattleRoom,
  joinBattleRoom: roomMocks.joinBattleRoom,
  renameBattleParticipantRequest: roomMocks.renameBattleParticipantRequest,
}));

const admission = {
  room: {
    code: "123-456",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    expiresAt: new Date().toISOString(),
    stateRevision: 0,
    stateSnapshot: null,
  },
  participants: [],
  participant: {
    sessionId: "session-1",
    userName: "EditedName",
    role: BattleParticipantRole.PLAYER_2,
    joinOrder: 2,
    isOwner: false,
    isGameHost: false,
    connected: true,
  },
  credentials: { sessionId: "session-1", token: "secret-token" },
};

describe("BattleLobbyModal invite admission", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    roomMocks.joinBattleRoom.mockResolvedValue(admission);
    roomMocks.renameBattleParticipantRequest.mockResolvedValue({
      room: admission.room,
      participants: [
        { sessionId: "session-1", userName: "EditedName" },
      ],
    });
  });

  it("requires an editable name before submitting an invite room", async () => {
    const onStartBattle = vi.fn();
    render(
      <BattleLobbyModal
        isOpen
        onClose={vi.fn()}
        onStartBattle={onStartBattle}
        mode="join"
        inviteMode
        initialRoomId="123-456"
        defaultUserName="ProfileName"
      />,
    );

    expect(screen.getByLabelText("lobby_player_name")).toHaveValue(
      "ProfileName",
    );
    expect(
      screen.queryByLabelText("lobby_room_code_label"),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("lobby_player_name"), {
      target: { value: "  EditedName  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "lobby_join_submit" }));

    await waitFor(() => {
      expect(roomMocks.joinBattleRoom).toHaveBeenCalledWith(
        "123-456",
        "EditedName",
      );
      expect(onStartBattle).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: "123-456",
          userName: "EditedName",
          role: "PLAYER_2",
          sessionToken: "secret-token",
        }),
      );
    });
  });

  it("keeps an invalid invite in the confirmation screen without starting", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const onStartBattle = vi.fn();
    roomMocks.joinBattleRoom.mockRejectedValue(
      new BattleRoomRequestError("ended", 410, "ROOM_ENDED"),
    );
    render(
      <BattleLobbyModal
        isOpen
        onClose={vi.fn()}
        onStartBattle={onStartBattle}
        mode="join"
        inviteMode
        initialRoomId="123-456"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "lobby_join_submit" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("room_invalid");
    expect(onStartBattle).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("hides the name field while retaining the room code field", () => {
    render(
      <BattleLobbyModal
        isOpen
        onClose={vi.fn()}
        onStartBattle={vi.fn()}
        mode="join"
        defaultUserName="ProfileName"
        showNameInput={false}
      />,
    );

    expect(
      screen.queryByLabelText("lobby_player_name"),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("lobby_room_code_label")).toBeInTheDocument();
  });

  it("submits only the room code when name input is hidden", () => {
    const onRoomCodeSubmit = vi.fn();
    render(
      <BattleLobbyModal
        isOpen
        onClose={vi.fn()}
        onStartBattle={vi.fn()}
        onRoomCodeSubmit={onRoomCodeSubmit}
        mode="join"
        showNameInput={false}
      />,
    );

    fireEvent.change(screen.getByLabelText("lobby_room_code_label"), {
      target: { value: "956-681" },
    });
    fireEvent.click(screen.getByRole("button", { name: "lobby_join_submit" }));

    expect(onRoomCodeSubmit).toHaveBeenCalledWith("956-681");
    expect(roomMocks.joinBattleRoom).not.toHaveBeenCalled();
  });

  it("confirms an already-created room without requiring a room code or joining again", async () => {
    const onStartBattle = vi.fn();
    roomMocks.renameBattleParticipantRequest.mockResolvedValue({
      room: admission.room,
      participants: [
        { sessionId: "session-1", userName: "ConfirmedName" },
      ],
    });
    render(
      <BattleLobbyModal
        isOpen
        onClose={vi.fn()}
        onStartBattle={onStartBattle}
        mode="join"
        inviteMode
        initialRoomId="123-456"
        defaultUserName="EditedName"
        existingAdmission={{
          roomId: "123-456",
          isHost: true,
          initialHp: 1500,
          userName: "EditedName",
          sessionId: "session-1",
          sessionToken: "secret-token",
          role: "PLAYER_1",
          isOwner: true,
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("lobby_player_name"), {
      target: { value: "ConfirmedName" },
    });
    fireEvent.click(screen.getByRole("button", { name: "lobby_join_submit" }));

    await waitFor(() => {
      expect(roomMocks.renameBattleParticipantRequest).toHaveBeenCalledWith(
        "123-456",
        { sessionId: "session-1", token: "secret-token" },
        "ConfirmedName",
      );
      expect(roomMocks.joinBattleRoom).not.toHaveBeenCalled();
      expect(onStartBattle).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: "123-456",
          userName: "ConfirmedName",
          role: "PLAYER_1",
        }),
      );
    });
  });
});
