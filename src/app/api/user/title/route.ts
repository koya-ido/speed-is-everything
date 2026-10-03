import { TITLES } from "@/features/title";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { verifySameOrigin } from "@/utils/security";
import { NextResponse } from "next/server";

export const POST = async (request: Request) => {
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { titleId } = await request.json();

    // 称号の解除（null）
    if (titleId === null || titleId === "") {
      await prisma.user.update({
        where: { id: user.id },
        data: { selectedTitle: null },
      });
      return NextResponse.json({ success: true, selectedTitle: null });
    }

    // 有効な称号IDか検証
    if (typeof titleId !== "string" || !(titleId in TITLES)) {
      return NextResponse.json({ error: "Invalid title ID" }, { status: 400 });
    }

    // ユーザーが該当称号を所持しているか検証
    const userTitle = await prisma.userTitle.findUnique({
      where: {
        userId_titleId: {
          userId: user.id,
          titleId,
        },
      },
    });

    if (!userTitle) {
      return NextResponse.json(
        { error: "Title not unlocked" },
        { status: 403 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { selectedTitle: titleId },
    });

    return NextResponse.json({
      success: true,
      selectedTitle: titleId,
    });
  } catch (error) {
    console.error("Set title error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};
