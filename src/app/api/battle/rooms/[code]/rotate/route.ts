import {
  battleRoomErrorResponse,
  readSessionCredentials,
  rotateBattleParticipant,
} from "@/features/battle/server/rooms";
import { verifySameOrigin } from "@/utils/security";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ code: string }> };

export const POST = async (request: NextRequest, { params }: RouteContext) => {
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { code } = await params;
    const { sessionId, token } = await readSessionCredentials(request);
    return NextResponse.json(
      await rotateBattleParticipant(code, sessionId, token),
    );
  } catch (error) {
    return battleRoomErrorResponse(error);
  }
};
