import { RankingClient } from "@/app/[locale]/ranking/RankingClient";
import { apiClient } from "@/utils/apiClient";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/routing", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/Header", () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

vi.mock("@/features/ranking", () => ({
  RankingTable: () => <div data-testid="ranking-table">RankingTable</div>,
  RankingDetailModal: () => <div data-testid="ranking-modal">Modal</div>,
}));

let mockDeviceType: "PC" | "MOBILE" = "PC";

vi.mock("@/features/game", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/game")>();
  return {
    ...actual,
    getPendingScore: vi.fn(() => null),
    setPendingScore: vi.fn(),
    getDeviceType: vi.fn(() => mockDeviceType),
  };
});

vi.mock("@/utils/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("RankingClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeviceType = "PC";
    vi.mocked(apiClient.get).mockResolvedValue({
      success: true,
      rankings: [],
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("initializes with PC when initialDeviceType is PC on non-touch device", async () => {
    mockDeviceType = "PC";

    await act(async () => {
      render(<RankingClient currentUserId="user-1" initialDeviceType="PC" />);
    });

    const pcButton = screen.getByText("pc_terminal");
    const mobileButton = screen.getByText("mobile_device");

    expect(pcButton.className).toContain("text-[#00f3ff]");
    expect(mobileButton.className).toContain("text-gray-400");
    expect(apiClient.get).toHaveBeenCalledWith("/api/ranking", {
      params: { device_type: "PC" },
    });
  });

  it("initializes with MOBILE when initialDeviceType is MOBILE", async () => {
    await act(async () => {
      render(
        <RankingClient currentUserId="user-1" initialDeviceType="MOBILE" />,
      );
    });

    const pcButton = screen.getByText("pc_terminal");
    const mobileButton = screen.getByText("mobile_device");

    expect(mobileButton.className).toContain("text-[#bc13fe]");
    expect(pcButton.className).toContain("text-gray-400");
    expect(apiClient.get).toHaveBeenCalledWith("/api/ranking", {
      params: { device_type: "MOBILE" },
    });
  });

  it("switches to MOBILE when initialDeviceType is PC but touch is detected", async () => {
    mockDeviceType = "MOBILE";

    await act(async () => {
      render(<RankingClient currentUserId="user-1" initialDeviceType="PC" />);
    });

    const mobileButton = screen.getByText("mobile_device");
    expect(mobileButton.className).toContain("text-[#bc13fe]");
    expect(apiClient.get).toHaveBeenCalledWith("/api/ranking", {
      params: { device_type: "MOBILE" },
    });
  });

  it("defaults to getDeviceType() when initialDeviceType is not provided (e.g. MOBILE detected)", async () => {
    mockDeviceType = "MOBILE";

    await act(async () => {
      render(<RankingClient currentUserId="user-1" />);
    });

    const mobileButton = screen.getByText("mobile_device");
    expect(mobileButton.className).toContain("text-[#bc13fe]");
    expect(apiClient.get).toHaveBeenCalledWith("/api/ranking", {
      params: { device_type: "MOBILE" },
    });
  });

  it("defaults to getDeviceType() when initialDeviceType is not provided (e.g. PC detected)", async () => {
    mockDeviceType = "PC";

    await act(async () => {
      render(<RankingClient currentUserId="user-1" />);
    });

    const pcButton = screen.getByText("pc_terminal");
    expect(pcButton.className).toContain("text-[#00f3ff]");
    expect(apiClient.get).toHaveBeenCalledWith("/api/ranking", {
      params: { device_type: "PC" },
    });
  });

  it("switches deviceType when clicking the buttons", async () => {
    mockDeviceType = "PC";

    await act(async () => {
      render(<RankingClient currentUserId="user-1" initialDeviceType="PC" />);
    });

    expect(apiClient.get).toHaveBeenCalledWith("/api/ranking", {
      params: { device_type: "PC" },
    });

    const mobileButton = screen.getByText("mobile_device");
    await act(async () => {
      fireEvent.click(mobileButton);
    });

    expect(apiClient.get).toHaveBeenCalledWith("/api/ranking", {
      params: { device_type: "MOBILE" },
    });
    expect(mobileButton.className).toContain("text-[#bc13fe]");

    const pcButton = screen.getByText("pc_terminal");
    await act(async () => {
      fireEvent.click(pcButton);
    });

    expect(apiClient.get).toHaveBeenCalledWith("/api/ranking", {
      params: { device_type: "PC" },
    });
    expect(pcButton.className).toContain("text-[#00f3ff]");
  });
});
