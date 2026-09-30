import { Avatar } from "@/features/user/components/Avatar/index";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

describe("Avatar", () => {
  afterEach(() => {
    cleanup();
  });
  it("renders image when src is provided", () => {
    render(<Avatar src="https://example.com/avatar.jpg" alt="User Avatar" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
    expect(img).toHaveAttribute("alt", "User Avatar");
  });

  it("renders fallback icon when src is null", () => {
    const { container } = render(<Avatar src={null} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders fallback icon on image error", () => {
    const { container } = render(<Avatar src="invalid.jpg" />);
    const img = screen.getByRole("img");

    // Simulate error
    fireEvent.error(img);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
