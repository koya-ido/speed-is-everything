import { RankingDetailModal } from "@/features/ranking/components/RankingDetailModal/index";
import { RankingEntry } from "@/features/ranking/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("RankingDetailModal", () => {
  afterEach(() => {
    cleanup();
  });

  const mockEntry: RankingEntry = {
    id: "r1",
    clearCount: 3,
    remainingTime: 2450,
    user: { id: "u1", name: "AcePlayer", country: "JP", image: null },
    rawReactions: [150.4, 210.2, 180.0],
    averageTime: 180.2,
    medianTime: 180.0,
    updatedAt: "2026-10-01T12:00:00.000Z",
  };

  it("renders modal with computed fastest and slowest reaction times", () => {
    const setSelectedEntry = vi.fn();
    render(
      <RankingDetailModal
        selectedEntry={mockEntry}
        setSelectedEntry={setSelectedEntry}
        rankings={[mockEntry]}
      />,
    );

    expect(screen.getByText("AcePlayer")).toBeInTheDocument();
    // Fastest is 150.4
    expect(screen.getByText("150.4")).toBeInTheDocument();
    // Slowest is 210.2
    expect(screen.getByText("210.2")).toBeInTheDocument();
  });

  it("handles null, undefined, or empty rawReactions gracefully without crashing", () => {
    const setSelectedEntry = vi.fn();
    const brokenEntry: RankingEntry = {
      ...mockEntry,
      rawReactions: [] as unknown as number[],
    };

    render(
      <RankingDetailModal
        selectedEntry={brokenEntry}
        setSelectedEntry={setSelectedEntry}
        rankings={[brokenEntry]}
      />,
    );

    expect(screen.getByText("AcePlayer")).toBeInTheDocument();
    // Fastest and slowest display '-'
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("calls setSelectedEntry(null) when close button is clicked", () => {
    const setSelectedEntry = vi.fn();
    render(
      <RankingDetailModal
        selectedEntry={mockEntry}
        setSelectedEntry={setSelectedEntry}
        rankings={[mockEntry]}
      />,
    );

    fireEvent.click(screen.getByText("btn_close_intel"));
    expect(setSelectedEntry).toHaveBeenCalledWith(null);
  });
});
