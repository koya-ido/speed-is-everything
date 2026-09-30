import { ScoreStats } from "@/features/game/components/ResultSection/ScoreStats";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("ScoreStats", () => {
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
    // On Mobile: Godlike < 250, Excellent 250 - 269, Normal >= 270
    // 240.4ms should be Godlike (#ffd700) on Mobile, but white on PC!
    render(
      <ScoreStats
        clearCount={10}
        remainingTime={500}
        average={240.4}
        median={260.0}
        deviceType="MOBILE"
      />,
    );

    const avgEl = screen.getByText("240.4 unit_ms");
    expect(avgEl.className).toContain("text-[#ffd700]");

    const medianEl = screen.getByText("260.0 unit_ms");
    expect(medianEl.className).toContain("text-[#ff64ff]");
  });
});
