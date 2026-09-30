import { DeviceType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const deviceType = searchParams.get("device_type") as DeviceType;

    if (deviceType !== "PC" && deviceType !== "MOBILE") {
      return NextResponse.json(
        { success: false, error: "Invalid device_type" },
        { status: 400 },
      );
    }
    const rankings = await prisma.ranking.findMany({
      where: { deviceType },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            country: true,
            image: true,
          },
        },
      },
      orderBy: [{ clearCount: "desc" }, { remainingTime: "desc" }],
      take: 500,
    });

    return NextResponse.json({ success: true, rankings });
  } catch (error: unknown) {
    console.error("Failed to fetch rankings:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};
