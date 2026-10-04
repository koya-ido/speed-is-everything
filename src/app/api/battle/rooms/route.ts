import {
  battleRoomErrorResponse,
  createBattleRoom,
  optionalBattleUserId,
  readJsonObject,
} from "@/features/battle/server/rooms";
import { verifySameOrigin } from "@/utils/security";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (request: NextRequest) => {
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await readJsonObject(request);
    const userName = Reflect.get(body, "userName");
    const userId = await optionalBattleUserId();
    return NextResponse.json(await createBattleRoom(userName, userId));
  } catch (error) {
    return battleRoomErrorResponse(error);
  }
};
