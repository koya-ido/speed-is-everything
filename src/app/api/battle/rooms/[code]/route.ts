import {
  battleRoomErrorResponse,
  dissolveBattleRoom,
  getBattleRoom,
  joinBattleRoom,
  optionalBattleUserId,
  readJsonObject,
  readSessionCredentials,
  saveBattleSnapshot,
} from "@/features/battle/server/rooms";
import { verifySameOrigin } from "@/utils/security";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ code: string }> };

export const GET = async (_request: NextRequest, { params }: RouteContext) => {
  try {
    const { code } = await params;
    return NextResponse.json(await getBattleRoom(code));
  } catch (error) {
    return battleRoomErrorResponse(error);
  }
};

export const POST = async (request: NextRequest, { params }: RouteContext) => {
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { code } = await params;
    const body = await readJsonObject(request);
    const userName = Reflect.get(body, "userName");
    const sessionId = Reflect.get(body, "sessionId");
    const token = Reflect.get(body, "token");
    const userId = await optionalBattleUserId();
    return NextResponse.json(
      await joinBattleRoom(code, userName, userId, { sessionId, token }),
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
    const { code } = await params;
    const { sessionId, token } = await readSessionCredentials(request);
    return NextResponse.json(
      await dissolveBattleRoom(code, sessionId, token),
    );
  } catch (error) {
    return battleRoomErrorResponse(error);
  }
};

export const PATCH = async (request: NextRequest, { params }: RouteContext) => {
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { code } = await params;
    const body = await readJsonObject(request);
    const sessionId = Reflect.get(body, "sessionId");
    const token = Reflect.get(body, "token");
    const snapshot = Reflect.get(body, "snapshot");
    if (typeof sessionId !== "string" || typeof token !== "string") {
      return NextResponse.json(
        { error: "Invalid session credentials." },
        { status: 401 },
      );
    }
    return NextResponse.json(
      await saveBattleSnapshot(code, sessionId, token, snapshot),
    );
  } catch (error) {
    return battleRoomErrorResponse(error);
  }
};
