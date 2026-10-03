import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { verifySameOrigin } from "@/utils/security";
import { NextResponse } from "next/server";

export const POST = async (request?: Request) => {
  if (request && !verifySameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: true, guest: true });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        foulCount: { increment: 1 },
      },
    });

    let unlockedTitles: string[] = [];
    if (updatedUser.foulCount >= 50) {
      const { grantTitles } = await import("@/features/title/server");
      unlockedTitles = await grantTitles(user.id, ["trigger_happy"]);
    }

    return NextResponse.json({
      success: true,
      foulCount: updatedUser.foulCount,
      unlockedTitles,
    });
  } catch (error) {
    console.error("Foul tracking error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};
