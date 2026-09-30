import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { verifySameOrigin } from "@/utils/security";
import { NextResponse } from "next/server";

export const PATCH = async (request: Request) => {
  if (!verifySameOrigin(request)) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 },
    );
  }

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

    const { name, country } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid name" },
        { status: 400 },
      );
    }

    const trimmedName = name.trim().replace(/[\x00-\x1F\x7F]/g, "");
    if (trimmedName.length === 0 || trimmedName.length > 15) {
      return NextResponse.json(
        { success: false, error: "Invalid name" },
        { status: 400 },
      );
    }

    let sanitizedCountry: string | null = null;
    if (country !== undefined && country !== null && country !== "") {
      if (typeof country !== "string") {
        return NextResponse.json(
          { success: false, error: "Invalid country format" },
          { status: 400 },
        );
      }
      const trimmedCountry = country.trim().replace(/[\x00-\x1F\x7F]/g, "");
      if (trimmedCountry.length > 50) {
        return NextResponse.json(
          { success: false, error: "Country string too long" },
          { status: 400 },
        );
      }
      sanitizedCountry = trimmedCountry.length > 0 ? trimmedCountry : null;
    }

    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        name: trimmedName,
        country: sanitizedCountry,
        isProfileSet: true,
      },
      create: {
        id: user.id,
        name: trimmedName,
        country: sanitizedCountry,
        image: user.user_metadata?.avatar_url,
        isProfileSet: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};
