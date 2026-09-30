import { HistoryModal } from "@/features/game/components/ResultSection/HistoryModal";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("HistoryModal", () => {
  it("applies PC threshold classes", () => {
    render(
      <HistoryModal
        isOpen={true}
        onClose={() => { }}
        rawReactions={[170, 190, 210]}
        fastest={170}
        failureType={null}
        failedReaction={null}
        deviceType="PC"
      />,
    );

    const godlikeEl = screen.getByText("170.0 unit_ms");
    expect(godlikeEl.className).toContain("text-[#ffd700]");

    const excellentEl = screen.getByText("190.0 unit_ms");
    expect(excellentEl.className).toContain("text-[#ff64ff]");

    const normalEl = screen.getByText("210.0 unit_ms");
    expect(normalEl.className).toContain("text-white");
  });

  it("applies Mobile threshold classes", () => {
    render(
      <HistoryModal
        isOpen={true}
        onClose={() => { }}
        rawReactions={[240.4, 260.0, 300.0]}
        fastest={240.4}
        failureType={null}
        failedReaction={null}
        deviceType="MOBILE"
      />,
    );

    const godlikeEl = screen.getByText("240.4 unit_ms");
    expect(godlikeEl.className).toContain("text-[#ffd700]");

    const excellentEl = screen.getByText("260.0 unit_ms");
    expect(excellentEl.className).toContain("text-[#ff64ff]");

    const normalEl = screen.getByText("300.0 unit_ms");
    expect(normalEl.className).toContain("text-white");
  });
});
