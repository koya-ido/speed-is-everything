export const getUnpredictableDelay = (): number => {
  const minDelay = 1500; // 最低1.5秒待機
  const maxDelay = 7000; // 最大7.0秒で打ち止め
  const lambda = 0.0012;
  const expDelay = -Math.log(1 - Math.random()) / lambda;
  return minDelay + Math.min(expDelay, maxDelay - minDelay);
};

export const getShareUrl = (stats: {
  clearCount: number;
  remainingTime: number;
  average: number;
  median: number;
  deviceType: string;
  rank?: string;
  locale?: string;
}): string => {
  const rankLabel = stats.rank ? `ランク: ${stats.rank}\n` : "";
  const text =
    `【Speed is everything 反射神経測定】\n` +
    `スコア: ${stats.clearCount}回クリア！\n` +
    rankLabel +
    `残りタイム: ${stats.remainingTime.toFixed(1)}ms\n` +
    `平均: ${stats.average.toFixed(1)}ms / 中央値: ${stats.median.toFixed(1)}ms\n` +
    `部門: ${stats.deviceType}\n\n` +
    `#反射神経測定 #反射神経 #SpeedIsEverything #SIE`;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const locale = stats.locale || "ja";
  const params = new URLSearchParams({
    c: stats.clearCount.toString(),
    r: stats.remainingTime.toFixed(1),
    avg: stats.average.toFixed(1),
    med: stats.median.toFixed(1),
    rank: stats.rank || "NORMAL",
    d: stats.deviceType,
  });

  const shareTargetUrl = origin
    ? `${origin}/${locale}/share?${params.toString()}`
    : "";

  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareTargetUrl)}`;
};
