import {
  authorizeBattleResult,
  battleRoomErrorResponse,
} from "@/features/battle/server/rooms";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { verifySameOrigin } from "@/utils/security";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  if (!verifySameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      roomId,
      sessionId,
      sessionToken,
      result,
      remainingHp,
      rounds,
      initialHp = 1500,
      opponentHp = 0,
      myDevice = "PC",
      opponentDevice = "PC",
      maxGodlikeCombo = 0,
      maxExcellentCombo = 0,
      wasUnder100HpBeforeWin = false,
      drawCountInMatch = 0,
      reactionTimes = [],
      isFoul = false,
    } = body;

    // バリデーション
    if (
      typeof roomId !== "string" ||
      roomId.trim().length === 0 ||
      roomId.length > 50 ||
      typeof sessionId !== "string" ||
      typeof sessionToken !== "string" ||
      !["win", "lose", "draw"].includes(result) ||
      typeof remainingHp !== "number" ||
      !Number.isFinite(remainingHp)
    ) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 },
      );
    }

    const safeMaxGodlikeCombo =
      typeof maxGodlikeCombo === "number" && maxGodlikeCombo >= 0
        ? Math.min(maxGodlikeCombo, 100)
        : 0;
    const safeMaxExcellentCombo =
      typeof maxExcellentCombo === "number" && maxExcellentCombo >= 0
        ? Math.min(maxExcellentCombo, 100)
        : 0;
    const safeDrawCount =
      typeof drawCountInMatch === "number" && drawCountInMatch >= 0
        ? Math.min(drawCountInMatch, 100)
        : 0;
    const safeReactionTimes = Array.isArray(reactionTimes)
      ? reactionTimes
          .filter(
            (t): t is number =>
              typeof t === "number" &&
              Number.isFinite(t) &&
              t > 0 &&
              t <= 10000,
          )
          .slice(0, 100)
      : [];

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let unlockedTitles: string[] = [];
    const { participantUserId } = await authorizeBattleResult(
      roomId,
      sessionId,
      sessionToken,
    );

    // ログイン中のユーザーの場合、バトル戦績と称号を更新
    if (user && participantUserId === user.id) {
      const updateData: {
        battlePlayCount: { increment: number };
        battleWinCount?: { increment: number };
        battleLoseCount?: { increment: number };
        battleDrawCount?: { increment: number };
        foulCount?: { increment: number };
      } = {
        battlePlayCount: { increment: 1 },
      };

      if (result === "win") {
        updateData.battleWinCount = { increment: 1 };
      } else if (result === "lose") {
        updateData.battleLoseCount = { increment: 1 };
      } else if (result === "draw") {
        updateData.battleDrawCount = { increment: 1 };
      }

      if (isFoul) {
        updateData.foulCount = { increment: 1 };
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      // 称号判定 & 付与
      const { checkBattleModeTitles, grantTitles } =
        await import("@/features/title/server");

      const candidateTitles = checkBattleModeTitles(
        {
          userId: user.id,
          result: result as "win" | "lose" | "draw",
          remainingHp,
          initialHp: typeof initialHp === "number" ? initialHp : 1500,
          opponentHp: typeof opponentHp === "number" ? opponentHp : 0,
          myDevice: myDevice === "MOBILE" ? "MOBILE" : "PC",
          opponentDevice: opponentDevice === "MOBILE" ? "MOBILE" : "PC",
          maxGodlikeCombo: safeMaxGodlikeCombo,
          maxExcellentCombo: safeMaxExcellentCombo,
          wasUnder100HpBeforeWin: Boolean(wasUnder100HpBeforeWin),
          drawCountInMatch: safeDrawCount,
          reactionTimes: safeReactionTimes,
          isFoul: Boolean(isFoul),
        },
        {
          battleWinCount: updatedUser.battleWinCount,
          foulCount: updatedUser.foulCount ?? 0,
        },
      );

      unlockedTitles = await grantTitles(user.id, candidateTitles);
    }

    return NextResponse.json({
      success: true,
      data: {
        roomId,
        result,
        remainingHp,
        rounds: typeof rounds === "number" ? rounds : 1,
        unlockedTitles,
      },
    });
  } catch (err) {
    return battleRoomErrorResponse(err);
  }
};
