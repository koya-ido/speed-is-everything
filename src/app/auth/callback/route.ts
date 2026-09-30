import { prisma } from "@/lib/prisma";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const getSafeRedirectUrl = (
  target: string | null,
  fallback = "/",
): string => {
  if (!target || typeof target !== "string") return fallback;
  // Must start with a single '/' and not with '//' or '/\' (protocol-relative or backslash bypasses)
  if (
    target.startsWith("/") &&
    !target.startsWith("//") &&
    !target.startsWith("/\\")
  ) {
    try {
      const parsed = new URL(target, "http://localhost");
      if (parsed.origin === "http://localhost") {
        return parsed.pathname + parsed.search + parsed.hash;
      }
    } catch {
      return fallback;
    }
  }
  return fallback;
};

export const GET = async (request: Request) => {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const safeNext = getSafeRedirectUrl(searchParams.get("next"), "/");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {}
          },
        },
      },
    );
    const {
      data: { user },
      error,
    } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && user) {
      const existingUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      if (!existingUser) {
        await prisma.user.create({
          data: {
            id: user.id,
            name: user.user_metadata?.full_name || "ゲスト",
            image: user.user_metadata?.avatar_url,
          },
        });
      }

      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // 認証キャンセル時などは code がなく error が返るため、元のページにリダイレクト
  const error = searchParams.get("error");
  if (error) {
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  // 予期せぬエラーの場合もトップページにリダイレクト
  return NextResponse.redirect(`${origin}/`);
};
