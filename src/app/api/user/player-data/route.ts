import { getReactionRank } from "@/features/game";
import { TITLE_LIST } from "@/features/title";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const GET = async () => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        titles: true,
        rankings: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 1. ランキング順位計算 (PC & MOBILE)
    const pcRanking = dbUser.rankings.find((r) => r.deviceType === "PC");
    const mobileRanking = dbUser.rankings.find(
      (r) => r.deviceType === "MOBILE",
    );

    let currentPcRank: number | null = null;
    if (pcRanking) {
      const betterPc = await prisma.ranking.count({
        where: {
          deviceType: "PC",
          isVerified: true,
          userId: { not: user.id },
          OR: [
            { clearCount: { gt: pcRanking.clearCount } },
            {
              clearCount: pcRanking.clearCount,
              remainingTime: { gt: pcRanking.remainingTime },
            },
          ],
        },
      });
      currentPcRank = betterPc + 1;
    }

    let currentMobileRank: number | null = null;
    if (mobileRanking) {
      const betterMobile = await prisma.ranking.count({
        where: {
          deviceType: "MOBILE",
          isVerified: true,
          userId: { not: user.id },
          OR: [
            { clearCount: { gt: mobileRanking.clearCount } },
            {
              clearCount: mobileRanking.clearCount,
              remainingTime: { gt: mobileRanking.remainingTime },
            },
          ],
        },
      });
      currentMobileRank = betterMobile + 1;
    }

    // 2. 総合データ（全有効リアクションの集計）
    const allReactionsWithDevice: { time: number; device: "PC" | "MOBILE" }[] =
      [];
    for (const r of dbUser.rankings) {
      if (!Array.isArray(r.rawReactions)) continue;
      for (const t of r.rawReactions) {
        if (typeof t === "number" && t > 0) {
          allReactionsWithDevice.push({ time: t, device: r.deviceType });
        }
      }
    }

    let fastestReaction: number | null = null;
    let averageReaction: number | null = null;
    let medianReaction: number | null = null;
    let excellentRate = 0;
    let godlikeRate = 0;

    if (allReactionsWithDevice.length > 0) {
      const times = allReactionsWithDevice.map((x) => x.time);
      fastestReaction = Math.min(...times);
      const total = times.reduce((sum, t) => sum + t, 0);
      averageReaction = Math.round((total / times.length) * 10) / 10;

      const sorted = [...times].sort((a, b) => a - b);
      medianReaction =
        Math.round(
          ((sorted[Math.floor((sorted.length - 1) / 2)] +
            sorted[Math.ceil((sorted.length - 1) / 2)]) /
            2) *
            10,
        ) / 10;

      let excellentCount = 0;
      let godlikeCount = 0;
      for (const item of allReactionsWithDevice) {
        const rank = getReactionRank(item.time, item.device);
        if (rank === "GODLIKE") godlikeCount++;
        else if (rank === "EXCELLENT") excellentCount++;
      }

      excellentRate =
        Math.round((excellentCount / allReactionsWithDevice.length) * 1000) /
        10;
      godlikeRate =
        Math.round((godlikeCount / allReactionsWithDevice.length) * 1000) / 10;
    }

    // 3. ゲームモードベストスコア
    let bestClearCount = 0;
    let bestRemainingTime = 0;
    for (const r of dbUser.rankings) {
      if (
        r.clearCount > bestClearCount ||
        (r.clearCount === bestClearCount && r.remainingTime > bestRemainingTime)
      ) {
        bestClearCount = r.clearCount;
        bestRemainingTime = r.remainingTime;
      }
    }

    // 4. バトルモード集計
    const battlePlays = dbUser.battlePlayCount;
    const battleWins = dbUser.battleWinCount;
    const battleLosses = dbUser.battleLoseCount;
    const battleDraws = dbUser.battleDrawCount;
    const battleWinRate =
      battlePlays > 0 ? Math.round((battleWins / battlePlays) * 1000) / 10 : 0;

    // 5. 称号セクション
    const unlockedMap = new Map<string, string>();
    for (const t of dbUser.titles) {
      unlockedMap.set(t.titleId, t.unlockedAt.toISOString());
    }

    const titlesWithStatus = TITLE_LIST.map((title) => {
      const unlocked = unlockedMap.has(title.id);
      const unlockedAt = unlockedMap.get(title.id) || null;
      const isSelected = dbUser.selectedTitle === title.id;

      let progress:
        | { current: number; target: number; unit?: string }
        | undefined;

      // 進捗状況
      if (title.id === "awakened") {
        progress = {
          current: Math.min(10, dbUser.playCount),
          target: 10,
          unit: "回",
        };
      } else if (title.id === "overclocked") {
        progress = {
          current: Math.min(50, dbUser.playCount),
          target: 50,
          unit: "回",
        };
      } else if (title.id === "neural_master") {
        progress = {
          current: Math.min(100, dbUser.playCount),
          target: 100,
          unit: "回",
        };
      } else if (title.id === "contender") {
        progress = {
          current: Math.min(10, battleWins),
          target: 10,
          unit: "勝",
        };
      } else if (title.id === "veteran") {
        progress = {
          current: Math.min(50, battleWins),
          target: 50,
          unit: "勝",
        };
      } else if (title.id === "speed_gladiator") {
        progress = {
          current: Math.min(100, battleWins),
          target: 100,
          unit: "勝",
        };
      } else if (title.id === "trigger_happy") {
        progress = {
          current: Math.min(50, dbUser.foulCount ?? 0),
          target: 50,
          unit: "回",
        };
      }

      return {
        ...title,
        unlocked,
        unlockedAt,
        isSelected,
        progress,
      };
    });

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        image: dbUser.image,
        country: dbUser.country,
        selectedTitle: dbUser.selectedTitle,
      },
      overall: {
        averageReaction,
        medianReaction,
        fastestReaction,
        currentRank: {
          pc: currentPcRank,
          mobile: currentMobileRank,
        },
        highestRank: {
          pc: dbUser.highestPcRank ?? currentPcRank,
          mobile: dbUser.highestMobileRank ?? currentMobileRank,
        },
        excellentRate,
        godlikeRate,
      },
      gameMode: {
        bestScore: {
          clearCount: bestClearCount,
          remainingTime: bestRemainingTime,
        },
        playCount: dbUser.playCount,
      },
      battleMode: {
        playCount: battlePlays,
        winCount: battleWins,
        loseCount: battleLosses,
        drawCount: battleDraws,
        winRate: battleWinRate,
      },
      titles: titlesWithStatus,
    });
  } catch (error) {
    console.error("Player data API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};
