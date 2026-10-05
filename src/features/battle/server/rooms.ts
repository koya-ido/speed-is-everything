import { MAX_ROOM_PARTICIPANTS } from "@/features/battle/types";
import {
  BattleParticipantRole,
  BattleRoomStatus,
  Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createHash,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

export const ROOM_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const RECONNECT_GRACE_MS = 3 * 60 * 1000;
const SESSION_ONLINE_MS = 15 * 1000;

type EndedRoomResult = { roomEndedError: BattleRoomError };

const unwrapEndedRoomResult = <T>(result: T | EndedRoomResult): T => {
  if (
    result &&
    typeof result === "object" &&
    "roomEndedError" in result &&
    result.roomEndedError instanceof BattleRoomError
  ) {
    throw result.roomEndedError;
  }
  return result as T;
};

const inRoomTransaction = <T>(
  work: (tx: Prisma.TransactionClient) => Promise<T | EndedRoomResult>,
) => prisma.$transaction(work).then(unwrapEndedRoomResult);

export class BattleRoomError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

export const normalizeRoomCode = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const code = value.replace(/[^0-9a-z]/gi, "").toUpperCase();
  if (!/^\d{6}$/.test(code)) return null;
  return `${code.slice(0, 3)}-${code.slice(3)}`;
};

export const normalizePlayerName = (
  value: unknown,
  fallbackName = `Player_${randomInt(1000, 10000)}`,
): string => {
  const name = typeof value === "string" ? value.trim() : "";
  const normalized = Array.from(name).join("");
  if (Array.from(normalized).length > 15) {
    throw new BattleRoomError(
      "Player names must be 15 characters or fewer.",
      400,
      "INVALID_PLAYER_NAME",
    );
  }
  return normalized || fallbackName;
};

export const roleForJoin = (
  roles: readonly BattleParticipantRole[],
): BattleParticipantRole => {
  if (!roles.includes(BattleParticipantRole.PLAYER_1)) {
    return BattleParticipantRole.PLAYER_1;
  }
  if (!roles.includes(BattleParticipantRole.PLAYER_2)) {
    return BattleParticipantRole.PLAYER_2;
  }
  return BattleParticipantRole.SPECTATOR;
};

export const selectVacantPlayerRole = (
  roles: readonly BattleParticipantRole[],
  fallbackRole: BattleParticipantRole = BattleParticipantRole.SPECTATOR,
): BattleParticipantRole => {
  if (!roles.includes(BattleParticipantRole.PLAYER_1)) {
    return BattleParticipantRole.PLAYER_1;
  }
  if (!roles.includes(BattleParticipantRole.PLAYER_2)) {
    return BattleParticipantRole.PLAYER_2;
  }
  return fallbackRole;
};

export const selectNextGameHost = <
  T extends {
    role: BattleParticipantRole;
    isGameHost: boolean;
    joinOrder: number;
    lastSeenAt: Date;
  },
>(
  previouslyActivePlayers: readonly T[],
  participants: readonly T[],
  now: Date,
): T | undefined => {
  const isOnline = (participant: T) =>
    now.getTime() - participant.lastSeenAt.getTime() <= SESSION_ONLINE_MS;
  const nextHost = [...previouslyActivePlayers]
    .filter(
      (participant) =>
        participant.role !== BattleParticipantRole.SPECTATOR &&
        isOnline(participant),
    )
    .sort((left, right) => left.joinOrder - right.joinOrder)[0];
  if (nextHost) return nextHost;

  const activePlayers = participants
    .filter(
      (participant) =>
        participant.role !== BattleParticipantRole.SPECTATOR &&
        isOnline(participant),
    )
    .sort((left, right) => left.joinOrder - right.joinOrder);
  if (activePlayers[0]) return activePlayers[0];

  if (
    participants.some(
      (participant) => participant.role !== BattleParticipantRole.SPECTATOR,
    )
  ) {
    return undefined;
  }
  return participants.find(
    (participant) =>
      participant.role === BattleParticipantRole.SPECTATOR &&
      isOnline(participant),
  );
};

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const tokenMatches = (expectedHash: string, token: string) => {
  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

const newCredentials = () => ({
  sessionId: randomUUID(),
  token: randomBytes(32).toString("base64url"),
});

const codeFromRandom = () => `${randomInt(100, 1000)}-${randomInt(100, 1000)}`;

const lockRoom = async (tx: Prisma.TransactionClient, code: string) => {
  await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "BattleRoom" WHERE "code" = ${code} FOR UPDATE
  `;
};

const fillVacantPlayerSlots = async (
  tx: Prisma.TransactionClient,
  roomId: string,
  participants: Awaited<
    ReturnType<Prisma.TransactionClient["battleParticipant"]["findMany"]>
  >,
  now: Date,
) => {
  const queued = participants
    .filter(
      (participant) =>
        participant.role === BattleParticipantRole.SPECTATOR &&
        now.getTime() - participant.lastSeenAt.getTime() <= SESSION_ONLINE_MS,
    )
    .sort((left, right) => left.joinOrder - right.joinOrder);
  const occupied = new Set(participants.map((participant) => participant.role));
  for (const slot of [
    BattleParticipantRole.PLAYER_1,
    BattleParticipantRole.PLAYER_2,
  ]) {
    if (occupied.has(slot)) continue;
    const next = queued.shift();
    if (!next) break;
    await tx.battleParticipant.update({
      where: { sessionId: next.sessionId },
      data: { role: slot },
    });
    occupied.add(slot);
  }
  return tx.battleParticipant.findMany({
    where: { roomId },
    orderBy: { joinOrder: "asc" },
  });
};

const ensureUsableRoom = async (tx: Prisma.TransactionClient, code: string) => {
  await tx.battleRoom.deleteMany({
    where: {
      status: BattleRoomStatus.ENDED,
      expiresAt: { lt: new Date() },
    },
  });
  const room = await tx.battleRoom.findUnique({
    where: { code },
    include: { participants: { orderBy: { joinOrder: "asc" } } },
  });
  if (!room) {
    throw new BattleRoomError("Room does not exist.", 404, "ROOM_NOT_FOUND");
  }

  const now = new Date();
  if (room.status !== BattleRoomStatus.ACTIVE || room.expiresAt <= now) {
    if (room.status === BattleRoomStatus.ACTIVE) {
      await endRoom(tx, room.id, now);
    }
    return {
      ...room,
      status: BattleRoomStatus.ENDED,
      participants: room.participants,
    };
  }

  const reconnectBefore = new Date(now.getTime() - RECONNECT_GRACE_MS);
  await tx.battleParticipant.deleteMany({
    where: { roomId: room.id, lastSeenAt: { lt: reconnectBefore } },
  });

  let participants = await tx.battleParticipant.findMany({
    where: { roomId: room.id },
    orderBy: { joinOrder: "asc" },
  });
  if (
    participants.length === 0 &&
    room.lastActivityAt.getTime() + RECONNECT_GRACE_MS <= now.getTime()
  ) {
    await endRoom(tx, room.id, now);
    return { ...room, status: BattleRoomStatus.ENDED, participants };
  }

  const previouslyActivePlayers = participants.filter(
    (participant) =>
      participant.role !== BattleParticipantRole.SPECTATOR &&
      now.getTime() - participant.lastSeenAt.getTime() <= SESSION_ONLINE_MS,
  );
  participants = await fillVacantPlayerSlots(tx, room.id, participants, now);
  const firstOnline = participants.find(
    (participant) =>
      now.getTime() - participant.lastSeenAt.getTime() <= SESSION_ONLINE_MS,
  );
  if (firstOnline && !participants.some((participant) => participant.isOwner)) {
    await tx.battleParticipant.update({
      where: { sessionId: firstOnline.sessionId },
      data: { isOwner: true },
    });
    await tx.battleRoom.update({
      where: { id: room.id },
      data: { ownerSessionId: firstOnline.sessionId },
    });
  }
  const activePlayers = participants.filter(
    (participant) =>
      participant.role !== BattleParticipantRole.SPECTATOR &&
      now.getTime() - participant.lastSeenAt.getTime() <= SESSION_ONLINE_MS,
  );
  if (!activePlayers.some((participant) => participant.isGameHost)) {
    const nextHost = selectNextGameHost(
      previouslyActivePlayers,
      participants,
      now,
    );
    if (nextHost) {
      await tx.battleParticipant.updateMany({
        where: { roomId: room.id, isGameHost: true },
        data: { isGameHost: false },
      });
      const vacantRole = selectVacantPlayerRole(
        participants.map((p) => p.role),
        nextHost.role,
      );

      await tx.battleParticipant.update({
        where: { sessionId: nextHost.sessionId },
        data: {
          role:
            nextHost.role === BattleParticipantRole.SPECTATOR
              ? vacantRole
              : nextHost.role,
          isGameHost: true,
        },
      });
    }
  }
  participants = await tx.battleParticipant.findMany({
    where: { roomId: room.id },
    orderBy: { joinOrder: "asc" },
  });

  return { ...room, participants };
};

const endRoom = async (
  tx: Prisma.TransactionClient,
  roomId: string,
  now = new Date(),
) => {
  await tx.battleRoom.updateMany({
    where: { id: roomId, status: BattleRoomStatus.ACTIVE },
    data: {
      status: BattleRoomStatus.ENDED,
      endedAt: now,
      expiresAt: new Date(now.getTime() + ROOM_LIFETIME_MS),
    },
  });
};

const publicParticipant = (
  participant: {
    sessionId: string;
    userName: string;
    role: BattleParticipantRole;
    joinOrder: number;
    isOwner: boolean;
    isGameHost: boolean;
    lastSeenAt: Date;
  },
  now = Date.now(),
) => ({
  sessionId: participant.sessionId,
  userName: participant.userName,
  role: participant.role,
  joinOrder: participant.joinOrder,
  isOwner: participant.isOwner,
  isGameHost: participant.isGameHost,
  connected: now - participant.lastSeenAt.getTime() <= SESSION_ONLINE_MS,
});

const roomResponse = (
  room: {
    code: string;
    status: BattleRoomStatus;
    createdAt: Date;
    expiresAt: Date;
    stateRevision: number;
    stateSnapshot: Prisma.JsonValue | null;
    participants: Parameters<typeof publicParticipant>[0][];
  },
  now = Date.now(),
) => ({
  room: {
    code: room.code,
    status: room.status,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
    stateRevision: room.stateRevision,
    stateSnapshot: room.stateSnapshot,
  },
  participants: room.participants.map((participant) =>
    publicParticipant(participant, now),
  ),
});

export const createBattleRoom = async (userName: unknown, userId?: string) => {
  const name = normalizePlayerName(userName, `Host_${randomInt(1000, 10000)}`);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = codeFromRandom();
    const credentials = newCredentials();
    try {
      const created = await prisma.$transaction(async (tx) => {
        const now = new Date();
        const room = await tx.battleRoom.create({
          data: {
            code,
            ownerSessionId: credentials.sessionId,
            expiresAt: new Date(now.getTime() + ROOM_LIFETIME_MS),
            participants: {
              create: {
                sessionId: credentials.sessionId,
                userId,
                userName: name,
                role: BattleParticipantRole.PLAYER_1,
                joinOrder: 1,
                isOwner: true,
                isGameHost: true,
                tokenHash: hashToken(credentials.token),
                lastSeenAt: now,
              },
            },
          },
          include: { participants: { orderBy: { joinOrder: "asc" } } },
        });
        return room;
      });
      return {
        ...roomResponse(created),
        participant: publicParticipant(created.participants[0]),
        credentials,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        attempt < 9
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new BattleRoomError(
    "Could not allocate a unique room code.",
    503,
    "ROOM_CODE_UNAVAILABLE",
  );
};

export const getBattleRoom = async (inputCode: unknown) => {
  const code = normalizeRoomCode(inputCode);
  if (!code) {
    throw new BattleRoomError("Invalid room code.", 400, "INVALID_ROOM_CODE");
  }
  return inRoomTransaction(async (tx) => {
    await lockRoom(tx, code);
    const room = await ensureUsableRoom(tx, code);
    if (room.status !== BattleRoomStatus.ACTIVE) {
      return {
        roomEndedError: new BattleRoomError(
          "Room has ended.",
          410,
          "ROOM_ENDED",
        ),
      };
    }
    return roomResponse(room);
  });
};

export const joinBattleRoom = async (
  inputCode: unknown,
  requestedName: unknown,
  userId?: string,
  credentials?: { sessionId?: unknown; token?: unknown },
) => {
  const code = normalizeRoomCode(inputCode);
  if (!code) {
    throw new BattleRoomError("Invalid room code.", 400, "INVALID_ROOM_CODE");
  }

  const suppliedSessionId =
    typeof credentials?.sessionId === "string" ? credentials.sessionId : null;
  const suppliedToken =
    typeof credentials?.token === "string" ? credentials.token : null;
  if (
    (suppliedSessionId && !suppliedToken) ||
    (!suppliedSessionId && suppliedToken)
  ) {
    throw new BattleRoomError(
      "Invalid session credentials.",
      401,
      "INVALID_SESSION",
    );
  }

  const newSession = newCredentials();
  const now = new Date();
  return inRoomTransaction(async (tx) => {
    await lockRoom(tx, code);
    const room = await ensureUsableRoom(tx, code);
    if (room.status !== BattleRoomStatus.ACTIVE) {
      return {
        roomEndedError: new BattleRoomError(
          "Room has ended.",
          410,
          "ROOM_ENDED",
        ),
      };
    }

    if (suppliedSessionId && suppliedToken) {
      const existing = room.participants.find(
        (participant) => participant.sessionId === suppliedSessionId,
      );
      if (!existing || !tokenMatches(existing.tokenHash, suppliedToken)) {
        throw new BattleRoomError(
          "This saved session can no longer rejoin.",
          401,
          "INVALID_SESSION",
        );
      }
      const resumed = await tx.battleParticipant.update({
        where: { sessionId: existing.sessionId },
        data: {
          lastSeenAt: now,
          userName: normalizePlayerName(
            requestedName,
            `Guest_${randomInt(1000, 10000)}`,
          ),
        },
      });
      await tx.battleRoom.update({
        where: { id: room.id },
        data: { lastActivityAt: now },
      });
      const participants = await tx.battleParticipant.findMany({
        where: { roomId: room.id },
        orderBy: { joinOrder: "asc" },
      });
      return {
        ...roomResponse({ ...room, participants }),
        participant: publicParticipant(resumed),
        credentials: { sessionId: resumed.sessionId, token: suppliedToken },
      };
    }

    if (room.participants.length >= MAX_ROOM_PARTICIPANTS) {
      throw new BattleRoomError("This room is full.", 409, "ROOM_FULL");
    }

    const nextOrder =
      room.participants.reduce(
        (maximum, participant) => Math.max(maximum, participant.joinOrder),
        0,
      ) + 1;
    const role = roleForJoin(room.participants.map((item) => item.role));
    const participant = await tx.battleParticipant.create({
      data: {
        sessionId: newSession.sessionId,
        roomId: room.id,
        userId,
        userName: normalizePlayerName(
          requestedName,
          `Guest_${randomInt(1000, 10000)}`,
        ),
        role,
        joinOrder: nextOrder,
        isOwner: room.participants.length === 0,
        isGameHost: room.participants.length === 0,
        tokenHash: hashToken(newSession.token),
        lastSeenAt: now,
      },
    });
    await tx.battleRoom.update({
      where: { id: room.id },
      data: {
        lastActivityAt: now,
        ...(room.participants.length === 0
          ? { ownerSessionId: participant.sessionId }
          : {}),
      },
    });
    const participants = await tx.battleParticipant.findMany({
      where: { roomId: room.id },
      orderBy: { joinOrder: "asc" },
    });
    return {
      ...roomResponse({ ...room, participants }),
      participant: publicParticipant(participant),
      credentials: newSession,
    };
  });
};

const authenticate = async (
  tx: Prisma.TransactionClient,
  roomCode: string,
  sessionId: string,
  token: string,
) => {
  const code = normalizeRoomCode(roomCode);
  if (!code || !sessionId || !token) {
    throw new BattleRoomError(
      "Invalid session credentials.",
      401,
      "INVALID_SESSION",
    );
  }
  await lockRoom(tx, code);
  const room = await ensureUsableRoom(tx, code);
  if (room.status !== BattleRoomStatus.ACTIVE) {
    return {
      roomEndedError: new BattleRoomError("Room has ended.", 410, "ROOM_ENDED"),
    };
  }
  const participant = room.participants.find(
    (item) => item.sessionId === sessionId,
  );
  if (!participant || !tokenMatches(participant.tokenHash, token)) {
    throw new BattleRoomError(
      "Invalid or expired session.",
      401,
      "INVALID_SESSION",
    );
  }
  return { room, participant } as const;
};

export const heartbeatBattleRoom = async (
  code: string,
  sessionId: string,
  token: string,
) =>
  inRoomTransaction(async (tx) => {
    const auth = await authenticate(tx, code, sessionId, token);
    if ("roomEndedError" in auth) return auth;
    const { room, participant } = auth;
    const now = new Date();
    await tx.battleParticipant.update({
      where: { sessionId: participant.sessionId },
      data: { lastSeenAt: now },
    });
    await tx.battleRoom.update({
      where: { id: room.id },
      data: { lastActivityAt: now },
    });
    const participants = await tx.battleParticipant.findMany({
      where: { roomId: room.id },
      orderBy: { joinOrder: "asc" },
    });
    return roomResponse({ ...room, participants });
  });

export const renameBattleParticipant = async (
  code: string,
  sessionId: string,
  token: string,
  requestedName: unknown,
) =>
  inRoomTransaction(async (tx) => {
    const auth = await authenticate(tx, code, sessionId, token);
    if ("roomEndedError" in auth) return auth;
    const userName = normalizePlayerName(requestedName);
    const { room, participant } = auth;
    const renamedParticipant = await tx.battleParticipant.update({
      where: { sessionId: participant.sessionId },
      data: { userName, lastSeenAt: new Date() },
    });
    const participants = await tx.battleParticipant.findMany({
      where: { roomId: room.id },
      orderBy: { joinOrder: "asc" },
    });
    return roomResponse({
      ...room,
      participants: participants.map((currentParticipant) =>
        currentParticipant.sessionId === renamedParticipant.sessionId
          ? renamedParticipant
          : currentParticipant,
      ),
    });
  });

export const leaveBattleRoom = async (
  code: string,
  sessionId: string,
  token: string,
) =>
  inRoomTransaction(async (tx) => {
    const auth = await authenticate(tx, code, sessionId, token);
    if ("roomEndedError" in auth) return auth;
    const { room, participant } = auth;
    await tx.battleParticipant.delete({
      where: { sessionId: participant.sessionId },
    });
    const remaining = await tx.battleParticipant.findMany({
      where: { roomId: room.id },
      orderBy: { joinOrder: "asc" },
    });
    const waiting = remaining.find(
      (candidate) =>
        candidate.role === BattleParticipantRole.SPECTATOR &&
        Date.now() - candidate.lastSeenAt.getTime() <= SESSION_ONLINE_MS,
    );
    const existingPlayerReplacement = remaining
      .filter(
        (candidate) =>
          candidate.role !== BattleParticipantRole.SPECTATOR &&
          !candidate.isGameHost,
      )
      .sort((left, right) => left.joinOrder - right.joinOrder)[0];
    if (participant.role !== BattleParticipantRole.SPECTATOR && waiting) {
      await tx.battleParticipant.update({
        where: { sessionId: waiting.sessionId },
        data: {
          role: participant.role,
          isGameHost: false,
        },
      });
    }
    const replacement =
      existingPlayerReplacement ??
      (participant.isGameHost ? waiting : undefined);
    if (replacement && participant.isGameHost) {
      await tx.battleParticipant.update({
        where: { sessionId: replacement.sessionId },
        data: { isGameHost: true },
      });
    }
    if (participant.isOwner && remaining[0]) {
      await tx.battleParticipant.updateMany({
        where: { roomId: room.id, isOwner: true },
        data: { isOwner: false },
      });
      const newOwner = waiting ?? remaining[0];
      await tx.battleParticipant.update({
        where: { sessionId: newOwner.sessionId },
        data: { isOwner: true },
      });
    }
    await tx.battleRoom.update({
      where: { id: room.id },
      data: {
        lastActivityAt: new Date(),
        ...(participant.isOwner && remaining[0]
          ? { ownerSessionId: (waiting ?? remaining[0]).sessionId }
          : {}),
      },
    });
    return { success: true };
  });

export const dissolveBattleRoom = async (
  code: string,
  sessionId: string,
  token: string,
) =>
  inRoomTransaction(async (tx) => {
    const auth = await authenticate(tx, code, sessionId, token);
    if ("roomEndedError" in auth) return auth;
    const { room, participant } = auth;
    if (!participant.isGameHost) {
      throw new BattleRoomError(
        "Only the game host can dissolve it.",
        403,
        "HOST_REQUIRED",
      );
    }
    const now = new Date();
    await endRoom(tx, room.id, now);
    return { success: true };
  });

export const rotateBattleParticipant = async (
  code: string,
  sessionId: string,
  token: string,
) =>
  inRoomTransaction(async (tx) => {
    const auth = await authenticate(tx, code, sessionId, token);
    if ("roomEndedError" in auth) return auth;
    const { room, participant } = auth;
    if (participant.role === BattleParticipantRole.SPECTATOR) {
      throw new BattleRoomError(
        "Spectators cannot leave a player slot.",
        409,
        "NOT_A_PLAYER",
      );
    }
    const waiting = room.participants
      .filter(
        (candidate) =>
          candidate.role === BattleParticipantRole.SPECTATOR &&
          candidate.sessionId !== sessionId &&
          Date.now() - candidate.lastSeenAt.getTime() <= SESSION_ONLINE_MS,
      )
      .sort((a, b) => a.joinOrder - b.joinOrder)[0];
    const maxOrder = room.participants.reduce(
      (maximum, candidate) => Math.max(maximum, candidate.joinOrder),
      0,
    );

    if (waiting) {
      await tx.battleParticipant.update({
        where: { sessionId: waiting.sessionId },
        data: { role: participant.role },
      });
    }
    const hostTarget = participant.isGameHost
      ? (room.participants.find(
          (candidate) =>
            candidate.sessionId !== sessionId &&
            candidate.role !== BattleParticipantRole.SPECTATOR &&
            !candidate.isGameHost,
        ) ?? waiting)
      : undefined;
    await tx.battleParticipant.update({
      where: { sessionId },
      data: {
        role: BattleParticipantRole.SPECTATOR,
        joinOrder: maxOrder + 1,
        isGameHost: false,
      },
    });
    if (participant.isGameHost && hostTarget) {
      await tx.battleParticipant.update({
        where: { sessionId: hostTarget.sessionId },
        data: { isGameHost: true },
      });
    }
    await tx.battleRoom.update({
      where: { id: room.id },
      data: { lastActivityAt: new Date() },
    });
    const participants = await tx.battleParticipant.findMany({
      where: { roomId: room.id },
      orderBy: { joinOrder: "asc" },
    });
    return roomResponse({ ...room, participants });
  });

export const saveBattleSnapshot = async (
  code: string,
  sessionId: string,
  token: string,
  snapshot: unknown,
) => {
  const publisherSessionId =
    snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
      ? Reflect.get(snapshot, "publisherSessionId")
      : undefined;
  const clientSequence =
    snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
      ? Reflect.get(snapshot, "clientSequence")
      : undefined;
  if (
    snapshot === null ||
    typeof snapshot !== "object" ||
    Array.isArray(snapshot) ||
    JSON.stringify(snapshot).length > 100_000 ||
    typeof publisherSessionId !== "string" ||
    !Number.isSafeInteger(clientSequence) ||
    (clientSequence as number) < 1
  ) {
    throw new BattleRoomError("Invalid battle snapshot.", 400, "INVALID_STATE");
  }
  return inRoomTransaction(async (tx) => {
    const auth = await authenticate(tx, code, sessionId, token);
    if ("roomEndedError" in auth) return auth;
    const { room, participant } = auth;
    if (!participant.isGameHost) {
      throw new BattleRoomError(
        "Only the game host may publish match state.",
        403,
        "GAME_HOST_REQUIRED",
      );
    }
    if (publisherSessionId !== participant.sessionId) {
      throw new BattleRoomError(
        "Snapshot writer does not match the authenticated session.",
        403,
        "GAME_HOST_REQUIRED",
      );
    }
    if (
      room.snapshotWriterSessionId === participant.sessionId &&
      (clientSequence as number) <= room.snapshotWriterSequence
    ) {
      return {
        stateRevision: room.stateRevision,
        stateSnapshot: room.stateSnapshot,
      };
    }
    const updated = await tx.battleRoom.update({
      where: { id: room.id },
      data: {
        stateSnapshot: snapshot as Prisma.InputJsonValue,
        stateRevision: { increment: 1 },
        snapshotWriterSessionId: participant.sessionId,
        snapshotWriterSequence: clientSequence as number,
        lastActivityAt: new Date(),
      },
      select: { stateRevision: true, stateSnapshot: true },
    });
    return updated;
  });
};

export const authorizeBattleResult = async (
  code: string,
  sessionId: string,
  token: string,
) =>
  inRoomTransaction<{ participantUserId: string | null }>(async (tx) => {
    const auth = await authenticate(tx, code, sessionId, token);
    if (
      "roomEndedError" in auth &&
      auth.roomEndedError instanceof BattleRoomError
    ) {
      return { roomEndedError: auth.roomEndedError };
    }
    if (!("participant" in auth) || !auth.participant) {
      throw new BattleRoomError(
        "Invalid or expired session.",
        401,
        "INVALID_SESSION",
      );
    }
    if (auth.participant.role === BattleParticipantRole.SPECTATOR) {
      throw new BattleRoomError(
        "Spectators cannot submit match results.",
        403,
        "PLAYER_REQUIRED",
      );
    }
    return { participantUserId: auth.participant.userId };
  });

export const battleRoomErrorResponse = (error: unknown) => {
  if (error instanceof BattleRoomError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error("Battle room API error:", error);
  return Response.json(
    { error: "Unable to process the battle room request." },
    { status: 500 },
  );
};

export const optionalBattleUserId = async () => {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      console.error("Battle room authentication lookup failed:", error);
      return undefined;
    }
    return user?.id;
  } catch (error) {
    console.error(
      "Battle room authentication lookup threw an exception:",
      error,
    );
    return undefined;
  }
};

export const readSessionCredentials = async (request: Request) => {
  const body = await readJsonObject(request);
  const sessionId = Reflect.get(body, "sessionId");
  const token = Reflect.get(body, "token");
  if (typeof sessionId !== "string" || typeof token !== "string") {
    throw new BattleRoomError(
      "Invalid session credentials.",
      401,
      "INVALID_SESSION",
    );
  }
  return { body, sessionId, token };
};

export const readJsonObject = async (request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BattleRoomError(
      "Invalid JSON request body.",
      400,
      "INVALID_BODY",
    );
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new BattleRoomError("Invalid request payload.", 400, "INVALID_BODY");
  }
  return body;
};
