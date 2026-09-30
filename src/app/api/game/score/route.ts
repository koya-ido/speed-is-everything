import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { verifyGameToken, verifySameOrigin } from "@/utils/security";
import { NextResponse } from "next/server";

export const POST = async (request: Request) => {
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

    const body = await request.json();
    const { session_token, device_type, clear_count, raw_reactions } = body;

    const payload = await verifyGameToken(session_token);
    if (!payload || !payload.startedAt) {
      return NextResponse.json(
        { success: false, error: "Invalid session token" },
        { status: 400 },
      );
    }

    if (payload.userId && payload.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Token belongs to another user" },
        { status: 403 },
      );
    }

    if (!Array.isArray(raw_reactions)) {
      return NextResponse.json(
        { success: false, error: "Invalid raw_reactions data" },
        { status: 400 },
      );
    }

    if (clear_count !== raw_reactions.length) {
      return NextResponse.json(
        { success: false, error: "Data mismatch" },
        { status: 400 },
      );
    }

    const hasImpossibleReaction = raw_reactions.some(
      (r: unknown) => typeof r !== "number" || !Number.isFinite(r) || r < 100,
    );
    if (hasImpossibleReaction) {
      return NextResponse.json(
        { success: false, error: "Impossible reaction detected" },
        { status: 400 },
      );
    }

    if (device_type !== "PC" && device_type !== "MOBILE") {
      return NextResponse.json(
        { success: false, error: "Invalid device_type" },
        { status: 400 },
      );
    }

    if (raw_reactions.length === 0 || raw_reactions.length > 100) {
      return NextResponse.json(
        { success: false, error: "Invalid clear count" },
        { status: 400 },
      );
    }

    const totalReactionTime = raw_reactions.reduce(
      (sum: number, r: number) => sum + r,
      0,
    );

    if (totalReactionTime > 3000) {
      return NextResponse.json(
        { success: false, error: "Reaction time exceeds allowance" },
        { status: 400 },
      );
    }

    const elapsedRealTime = Date.now() - (payload.startedAt as number);

    // 各ラウンドには最低1.5秒のWAITING待機と、クリアごとの0.8秒のINTERVAL待機が含まれる
    const minWaitTimePerRound = 1500;
    const intervalTime = 800;
    const totalMinWaitTime =
      clear_count * minWaitTimePerRound +
      Math.max(0, clear_count - 1) * intervalTime;

    const absoluteMinRequiredTime = totalReactionTime + totalMinWaitTime;

    // 通信遅延などの余裕を少し持たせる (例: -1000ms)
    if (elapsedRealTime < absoluteMinRequiredTime - 1000) {
      return NextResponse.json(
        { success: false, error: "Time manipulation detected" },
        { status: 400 },
      );
    }

    // 統計値をサーバー側で安全に再計算
    const calculatedRemainingTime = Math.max(0, 3000 - totalReactionTime);
    const calculatedAverage = totalReactionTime / raw_reactions.length;
    const sortedReactions = [...raw_reactions].sort((a, b) => a - b);
    const calculatedMedian =
      (sortedReactions[Math.floor((sortedReactions.length - 1) / 2)] +
        sortedReactions[Math.ceil((sortedReactions.length - 1) / 2)]) /
      2;

    // 人間には不可能な機械的超低分散（自動ボットクリック）の検知: 8ラウンド以上で分散が極小（標準偏差 < 2ms）
    if (raw_reactions.length >= 8) {
      const variance =
        raw_reactions.reduce(
          (sum: number, r: number) => sum + Math.pow(r - calculatedAverage, 2),
          0,
        ) / raw_reactions.length;
      if (variance < 4) {
        return NextResponse.json(
          { success: false, error: "Automated input detected" },
          { status: 400 },
        );
      }
    }

    const existingRanking = await prisma.ranking.findUnique({
      where: {
        userId_deviceType: {
          userId: user.id,
          deviceType: device_type,
        },
      },
    });

    let isNewRecord = false;
    if (!existingRanking) {
      isNewRecord = true;
    } else {
      if (
        clear_count > existingRanking.clearCount ||
        (clear_count === existingRanking.clearCount &&
          calculatedRemainingTime > existingRanking.remainingTime)
      ) {
        isNewRecord = true;
      }
    }

    if (isNewRecord) {
      await prisma.ranking.upsert({
        where: {
          userId_deviceType: {
            userId: user.id,
            deviceType: device_type,
          },
        },
        update: {
          clearCount: clear_count,
          remainingTime: calculatedRemainingTime,
          averageTime: calculatedAverage,
          medianTime: calculatedMedian,
          rawReactions: raw_reactions,
          isVerified: true,
        },
        create: {
          userId: user.id,
          deviceType: device_type,
          clearCount: clear_count,
          remainingTime: calculatedRemainingTime,
          averageTime: calculatedAverage,
          medianTime: calculatedMedian,
          rawReactions: raw_reactions,
          isVerified: true,
        },
      });
    }

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { playCount: { increment: 1 } },
      });
    } catch {
      await prisma.user.upsert({
        where: { id: user.id },
        update: { playCount: { increment: 1 } },
        create: {
          id: user.id,
          name: user.user_metadata?.full_name || "ゲスト",
          image: user.user_metadata?.avatar_url,
          playCount: 1,
        },
      });
    }

    return NextResponse.json({ success: true, is_new_record: isNewRecord });
  } catch (error: unknown) {
    console.error("Score submission error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
};
