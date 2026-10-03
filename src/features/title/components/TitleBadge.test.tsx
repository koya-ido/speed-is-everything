import { TitleBadge } from "@/features/title/components/TitleBadge";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("TitleBadge", () => {
  it("renders nothing when titleId is null or undefined", () => {
    const { container } = render(<TitleBadge titleId={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for unknown titleId", () => {
    const { container } = render(<TitleBadge titleId="invalid_title" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders title name and glowing badge for valid titleId", () => {
    render(<TitleBadge titleId="apex_predator" />);
    const badge = screen.getByText("Apex Predator");
    expect(badge).toBeInTheDocument();
  });

  it("applies correct size classes", () => {
    const { rerender } = render(<TitleBadge titleId="untouchable" size="sm" />);
    expect(screen.getByText("Untouchable")).toHaveClass("text-[10px]");

    rerender(<TitleBadge titleId="untouchable" size="lg" />);
    expect(screen.getByText("Untouchable")).toHaveClass("text-sm");
  });
});
