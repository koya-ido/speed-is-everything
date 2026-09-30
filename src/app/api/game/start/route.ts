import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { signGameToken, verifySameOrigin } from "@/utils/security";
import { NextResponse } from "next/server";

export const POST = async (request: Request) => {
  if (!verifySameOrigin(request)) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 },
    );
  }

  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
    }
  } catch {
    // Guest play allowed
  }

  let deviceType: "PC" | "MOBILE" | null = null;
  try {
    const body = await request.json();
    if (body?.device_type === "PC" || body?.device_type === "MOBILE") {
      deviceType = body.device_type;
    }
  } catch {
    // Body is optional or empty
  }

  // Record gameplay log asynchronously without blocking failure
  try {
    let validUserId = userId;
    if (validUserId) {
      const dbUser = await prisma.user.findUnique({ where: { id: validUserId } });
      if (!dbUser) {
        validUserId = null;
      }
    }
    await prisma.gamePlay.create({
      data: {
        userId: validUserId,
        deviceType,
      },
    });
  } catch (error) {
    console.error("Failed to record game play:", error);
  }

  const token = await signGameToken({
    startedAt: Date.now(),
    userId,
    jti: crypto.randomUUID(),
  });
  return NextResponse.json({ session_token: token });
};
