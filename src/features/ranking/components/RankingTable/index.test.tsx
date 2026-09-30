import { RankingTable } from "@/features/ranking/components/RankingTable/index";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/features/user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/user")>();
  return {
    ...actual,
    CountryFlag: ({ countryCode }: { countryCode: string | null }) => (
      <span data-testid="country-flag">{countryCode}</span>
    ),
  };
});

const mockRankings = [
  {
    id: "r1",
    clearCount: 10,
    remainingTime: 2500,
    user: { id: "u1", name: "Player1", country: "JP", image: null },
  },
  {
    id: "r2",
    clearCount: 8,
    remainingTime: 1200,
    user: { id: "u2", name: "Player2", country: "US", image: "avatar.png" },
  },
];

describe("RankingTable", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders loading state", () => {
    render(
      <RankingTable
        loading={true}
        rankings={[]}
        currentUserId={null}
        setSelectedEntry={() => { }}
      />,
    );
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("renders no records state", () => {
    render(
      <RankingTable
        loading={false}
        rankings={[]}
        currentUserId={null}
        setSelectedEntry={() => { }}
      />,
    );
    expect(screen.getByText("no_records")).toBeInTheDocument();
  });

  it("renders ranking data", () => {
    render(
      <RankingTable
        loading={false}
        rankings={
          mockRankings as unknown as Parameters<
            typeof RankingTable
          >[0]["rankings"]
        }
        currentUserId="u1"
        setSelectedEntry={() => { }}
      />,
    );

    expect(screen.getByText("Player1")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("2500.0")).toBeInTheDocument();
    expect(screen.getAllByTestId("country-flag")[0]).toHaveTextContent("JP");

    expect(screen.getByText("Player2")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("1200.0")).toBeInTheDocument();
    expect(screen.getAllByTestId("country-flag")[1]).toHaveTextContent("US");
  });

  it("calls setSelectedEntry on details button click", () => {
    const setSelectedEntry = vi.fn();
    render(
      <RankingTable
        loading={false}
        rankings={
          mockRankings as unknown as Parameters<
            typeof RankingTable
          >[0]["rankings"]
        }
        currentUserId={null}
        setSelectedEntry={setSelectedEntry}
      />,
    );

    const detailsButtons = screen.getAllByText("btn_details");
    fireEvent.click(detailsButtons[0]);

    expect(setSelectedEntry).toHaveBeenCalledWith(mockRankings[0]);
  });
});
