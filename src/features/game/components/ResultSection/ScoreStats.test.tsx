import { ScoreStats } from "@/features/game/components/ResultSection/ScoreStats";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("ScoreStats", () => {
  afterEach(() => {
    cleanup();
  });

  it("applies PC threshold colors correctly", () => {
    // 175ms is Godlike on PC (< 180)
    const { rerender } = render(
      <ScoreStats
        clearCount={10}
        remainingTime={500}
        average={175}
        median={190}
        deviceType="PC"
      />,
    );

    const avgEl = screen.getByText("175.0 unit_ms");
    expect(avgEl.className).toContain("text-[#ffd700]");

    const medianEl = screen.getByText("190.0 unit_ms");
    expect(medianEl.className).toContain("text-[#ff64ff]");

    // 210ms is Normal on PC (>= 200)
    rerender(
      <ScoreStats
        clearCount={10}
        remainingTime={500}
        average={210}
        median={210}
        deviceType="PC"
      />,
    );
    expect(screen.getAllByText("210.0 unit_ms")[0].className).toContain(
      "text-white",
    );
  });

  it("applies Mobile threshold colors correctly", () => {
    // On Mobile: Godlike < 180, Excellent 180 - 199, Normal >= 200
    const { rerender } = render(
      <ScoreStats
        clearCount={10}
        remainingTime={500}
        average={170}
        median={190}
        deviceType="MOBILE"
      />,
    );

    const avgEl = screen.getByText("170.0 unit_ms");
    expect(avgEl.className).toContain("text-[#ffd700]");

    const medianEl = screen.getByText("190.0 unit_ms");
    expect(medianEl.className).toContain("text-[#ff64ff]");

    rerender(
      <ScoreStats
        clearCount={10}
        remainingTime={500}
        average={210}
        median={210}
        deviceType="MOBILE"
      />,
    );
    expect(screen.getAllByText("210.0 unit_ms")[0].className).toContain(
      "text-white",
    );
  });
});
