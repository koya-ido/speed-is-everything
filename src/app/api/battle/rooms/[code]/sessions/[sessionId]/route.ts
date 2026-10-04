import {
  battleRoomErrorResponse,
  heartbeatBattleRoom,
  leaveBattleRoom,
  readSessionCredentials,
  renameBattleParticipant,
} from "@/features/battle/server/rooms";
import { verifySameOrigin } from "@/utils/security";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ code: string; sessionId: string }>;
};

export const PATCH = async (request: NextRequest, { params }: RouteContext) => {
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { code, sessionId: pathSessionId } = await params;
    const { body, ...credentials } = await readSessionCredentials(request);
    if (credentials.sessionId !== pathSessionId) {
      return NextResponse.json(
        { error: "Invalid session credentials." },
        { status: 401 },
      );
    }
    if ("userName" in body) {
      return NextResponse.json(
        await renameBattleParticipant(
          code,
          pathSessionId,
          credentials.token,
          Reflect.get(body, "userName"),
        ),
      );
    }
    return NextResponse.json(
      await heartbeatBattleRoom(code, pathSessionId, credentials.token),
    );
  } catch (error) {
    return battleRoomErrorResponse(error);
  }
};

export const DELETE = async (request: NextRequest, { params }: RouteContext) => {
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { code, sessionId: pathSessionId } = await params;
    const credentials = await readSessionCredentials(request);
    if (credentials.sessionId !== pathSessionId) {
      return NextResponse.json(
        { error: "Invalid session credentials." },
        { status: 401 },
      );
    }
    return NextResponse.json(
      await leaveBattleRoom(code, pathSessionId, credentials.token),
    );
  } catch (error) {
    return battleRoomErrorResponse(error);
  }
};
