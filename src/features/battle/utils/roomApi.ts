import {
  BattleRoomAdmission,
  BattleRoomParticipant,
  BattleRoomSnapshot,
} from "@/features/battle/types";

export type BattleRoomCredentials = { sessionId: string; token: string };
export type BattleRoomView = {
  room: BattleRoomSnapshot;
  participants: BattleRoomParticipant[];
};

export class BattleRoomRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

type PendingAdmission = {
  roomId: string;
  isHost: boolean;
  initialHp: number;
  userName: string;
  sessionId: string;
  sessionToken: string;
  role: "PLAYER_1" | "PLAYER_2" | "SPECTATOR";
  isOwner: boolean;
};

let pendingAdmission: PendingAdmission | null = null;
const ADMISSION_STORAGE_PREFIX = "battle_pending_admission:";

export const rememberBattleAdmission = (admission: PendingAdmission) => {
  pendingAdmission = admission;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(
        `${ADMISSION_STORAGE_PREFIX}${admission.roomId}`,
        JSON.stringify(admission),
      );
    } catch {
      // ignore storage errors
    }
  }
};

export const getBattleAdmission = (roomId: string): PendingAdmission | null => {
  if (pendingAdmission?.roomId === roomId) return pendingAdmission;
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(
        `${ADMISSION_STORAGE_PREFIX}${roomId}`,
      );
      if (raw) {
        const parsed = JSON.parse(raw) as PendingAdmission;
        if (parsed?.roomId === roomId) {
          pendingAdmission = parsed;
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
  }
  return null;
};

export const clearBattleAdmission = (roomId: string) => {
  if (pendingAdmission?.roomId === roomId) pendingAdmission = null;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(`${ADMISSION_STORAGE_PREFIX}${roomId}`);
    } catch {
      // ignore storage errors
    }
  }
};

const requestJson = async <T>(path: string, init: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      result !== null &&
      typeof result === "object" &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : "The room request failed.";
    const code =
      result !== null &&
      typeof result === "object" &&
      "code" in result &&
      typeof result.code === "string"
        ? result.code
        : undefined;
    throw new BattleRoomRequestError(message, response.status, code);
  }
  return result as T;
};

export const createBattleRoom = async (userName: string) => {
  const admission = await requestJson<BattleRoomAdmission>(
    "/api/battle/rooms",
    {
      method: "POST",
      body: JSON.stringify({ userName }),
    },
  );
  saveBattleCredentials(admission.room.code, admission.credentials);
  return admission;
};

const savedSessionKey = (roomId: string) => `battle_session:${roomId}`;

const getSavedCredentials = (roomId: string) => {
  try {
    const saved = sessionStorage.getItem(savedSessionKey(roomId));
    if (!saved) return undefined;
    const value: unknown = JSON.parse(saved);
    if (
      value &&
      typeof value === "object" &&
      "sessionId" in value &&
      typeof value.sessionId === "string" &&
      "token" in value &&
      typeof value.token === "string"
    ) {
      return { sessionId: value.sessionId, token: value.token };
    }
  } catch (error) {
    console.error("Unable to read the saved battle session:", error);
  }
  return undefined;
};

export const saveBattleCredentials = (
  roomId: string,
  credentials: BattleRoomCredentials,
) => {
  try {
    sessionStorage.setItem(
      savedSessionKey(roomId),
      JSON.stringify(credentials),
    );
  } catch (error) {
    console.error("Unable to save the battle session:", error);
  }
};

export const clearBattleCredentials = (roomId: string) => {
  try {
    sessionStorage.removeItem(savedSessionKey(roomId));
  } catch (error) {
    console.error("Unable to clear the battle session:", error);
  }
};

export const joinBattleRoom = async (
  roomId: string,
  userName: string,
): Promise<BattleRoomAdmission> => {
  const path = `/api/battle/rooms/${encodeURIComponent(roomId)}`;
  const credentials = getSavedCredentials(roomId);
  let result: BattleRoomAdmission;
  try {
    result = await requestJson<BattleRoomAdmission>(path, {
      method: "POST",
      body: JSON.stringify({ userName, ...credentials }),
    });
  } catch (error) {
    if (
      !(error instanceof BattleRoomRequestError) ||
      error.code !== "INVALID_SESSION"
    ) {
      throw error;
    }
    clearBattleCredentials(roomId);
    result = await requestJson<BattleRoomAdmission>(path, {
      method: "POST",
      body: JSON.stringify({ userName }),
    });
  }
  saveBattleCredentials(roomId, result.credentials);
  return result;
};

export const sendBattleSessionRequest = (
  roomId: string,
  credentials: BattleRoomCredentials,
  method: "PATCH" | "DELETE",
  options?: { keepalive?: boolean },
) =>
  fetch(
    `/api/battle/rooms/${encodeURIComponent(roomId)}/sessions/${encodeURIComponent(credentials.sessionId)}`,
    {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
      keepalive: options?.keepalive ?? false,
    },
  );

export const leaveSavedBattleSession = async (roomId: string) => {
  const credentials = getSavedCredentials(roomId);
  if (credentials) {
    clearBattleCredentials(roomId);
    try {
      await sendBattleSessionRequest(roomId, credentials, "DELETE", {
        keepalive: true,
      });
    } catch {
      // ignore network errors
    }
  }
};

export const renameBattleParticipantRequest = (
  roomId: string,
  credentials: BattleRoomCredentials,
  userName: string,
) =>
  requestJson<BattleRoomView>(
    `/api/battle/rooms/${encodeURIComponent(roomId)}/sessions/${encodeURIComponent(credentials.sessionId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ ...credentials, userName }),
    },
  );

export const dissolveBattleRoomRequest = (
  roomId: string,
  credentials: BattleRoomCredentials,
) =>
  fetch(`/api/battle/rooms/${encodeURIComponent(roomId)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

export const rotateBattleParticipantRequest = (
  roomId: string,
  credentials: BattleRoomCredentials,
) =>
  requestJson<BattleRoomView>(
    `/api/battle/rooms/${encodeURIComponent(roomId)}/rotate`,
    {
      method: "POST",
      body: JSON.stringify(credentials),
    },
  );

export const publishBattleSnapshotRequest = (
  roomId: string,
  credentials: BattleRoomCredentials,
  snapshot: unknown,
) =>
  requestJson<{ stateRevision: number; stateSnapshot: unknown }>(
    `/api/battle/rooms/${encodeURIComponent(roomId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ ...credentials, snapshot }),
    },
  );

export const getBattleRoomRequest = (roomId: string) =>
  requestJson<BattleRoomView>(
    `/api/battle/rooms/${encodeURIComponent(roomId)}`,
    { method: "GET" },
  );
