import { GameCanvas } from "@/features/game/components/GameCanvas/index";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/features/game/utils/gameLogic", () => ({
  getUnpredictableDelay: vi.fn(() => 2000),
}));

vi.mock("@/features/game/utils/pendingScore", () => ({
  getPendingScore: vi.fn(() => null),
  clearPendingScore: vi.fn(),
}));

vi.mock("@/features/game/components/ResultSection", () => ({
  ResultSection: (props: {
    onClick?: () => void;
    children?: React.ReactNode;
    failureType?: string;
    onRetry?: () => void;
    deviceType?: string;
  }) => (
    <div data-testid="mock-result-section">
      FailureType: {props.failureType || "none"}
      <button onClick={props.onRetry} data-testid="retry-btn">
        Retry
      </button>
    </div>
  ),
}));

global.fetch = vi.fn() as import("vitest").Mock;

describe("GameCanvas", () => {
  let perfTime = 0;
  let rafCallbacks: FrameRequestCallback[] = [];

  beforeEach(() => {
    perfTime = 0;
    vi.useFakeTimers();

    rafCallbacks = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => { });
    vi.spyOn(performance, "now").mockImplementation(() => perfTime);

    (global.fetch as import("vitest").Mock).mockResolvedValue({
      json: () => Promise.resolve({ session_token: "test-token" }),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts game and handles FALSE_START", async () => {
    render(<GameCanvas />);

    await act(async () => {
      fireEvent.pointerDown(screen.getByText("state_start"));
    });

    await act(async () => {
      fireEvent.pointerDown(screen.getByText("state_waiting"));
    });

    expect(screen.getByTestId("mock-result-section")).toBeInTheDocument();
    expect(screen.getByText("FailureType: FALSE_START")).toBeInTheDocument();
  });

  it("transitions to ACTION and handles success click", async () => {
    render(<GameCanvas />);

    await act(async () => {
      fireEvent.pointerDown(screen.getByText("state_start"));
    });

    await act(async () => {
      perfTime = 2000;
      vi.advanceTimersByTime(2000);
    });

    await act(async () => {
      const callbacks = rafCallbacks;
      rafCallbacks = [];
      callbacks.forEach((cb) => cb(perfTime));
    });

    expect(screen.getByText("state_action")).toBeInTheDocument();

    await act(async () => {
      perfTime = 2250;
      vi.advanceTimersByTime(250);
    });

    await act(async () => {
      const el = screen.getByText("state_action");
      const event = new Event("pointerdown", { bubbles: true });
      Object.defineProperty(event, "timeStamp", { value: 0 });
      fireEvent(el, event);
    });

    expect(screen.getByText("-250.0ms")).toBeInTheDocument();
  });

  it("triggers Godlike! popup on PC for reaction < 180ms", async () => {
    render(<GameCanvas />);

    await act(async () => {
      fireEvent.pointerDown(screen.getByText("state_start"));
    });

    await act(async () => {
      perfTime = 2000;
      vi.advanceTimersByTime(2000);
    });

    await act(async () => {
      const callbacks = rafCallbacks;
      rafCallbacks = [];
      callbacks.forEach((cb) => cb(perfTime));
    });

    expect(screen.getByText("state_action")).toBeInTheDocument();

    await act(async () => {
      perfTime = 2170;
      vi.advanceTimersByTime(170);
      const el = screen.getByText("state_action");
      fireEvent.pointerDown(el, { pointerType: "mouse" });
    });

    expect(screen.getByText("Godlike!")).toBeInTheDocument();
    expect(screen.getByText("-170.0ms")).toBeInTheDocument();
  });

  it("triggers Godlike! popup on Mobile for reaction < 250ms", async () => {
    render(<GameCanvas />);

    await act(async () => {
      fireEvent.pointerUp(screen.getByText("state_start"), {
        pointerType: "touch",
      });
    });

    await act(async () => {
      perfTime = 2000;
      vi.advanceTimersByTime(2000);
    });

    await act(async () => {
      const callbacks = rafCallbacks;
      rafCallbacks = [];
      callbacks.forEach((cb) => cb(perfTime));
    });

    expect(screen.getByText("state_action")).toBeInTheDocument();

    await act(async () => {
      perfTime = 2240;
      vi.advanceTimersByTime(240);
      const el = screen.getByText("state_action");
      fireEvent.pointerUp(el, { pointerType: "touch" });
    });

    // 240ms on mobile: < 250ms so it should be Godlike!
    expect(screen.getByText("Godlike!")).toBeInTheDocument();
    expect(screen.getByText("-240.0ms")).toBeInTheDocument();
  });

  it("triggers Excellent! popup on Mobile for 250ms - 269ms", async () => {
    render(<GameCanvas />);

    await act(async () => {
      fireEvent.pointerUp(screen.getByText("state_start"), {
        pointerType: "touch",
      });
    });

    await act(async () => {
      perfTime = 2000;
      vi.advanceTimersByTime(2000);
    });

    await act(async () => {
      const callbacks = rafCallbacks;
      rafCallbacks = [];
      callbacks.forEach((cb) => cb(perfTime));
    });

    expect(screen.getByText("state_action")).toBeInTheDocument();

    await act(async () => {
      perfTime = 2260;
      vi.advanceTimersByTime(260);
      const el = screen.getByText("state_action");
      fireEvent.pointerUp(el, { pointerType: "touch" });
    });

    // 260ms on mobile: >= 250ms and < 270ms so it should be Excellent!
    expect(screen.getByText("Excellent!")).toBeInTheDocument();
    expect(screen.getByText("-260.0ms")).toBeInTheDocument();
  });
});
