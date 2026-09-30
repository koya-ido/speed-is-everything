import { CountryFlag } from "@/features/user/components/CountryFlag/index";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("CountryFlag", () => {
  it("renders a dash when countryCode is null", () => {
    render(<CountryFlag countryCode={null} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("renders an image when countryCode is configured", () => {
    render(<CountryFlag countryCode="JP" />);
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://flagcdn.com/w40/jp.png");
    expect(img).toHaveAttribute("alt", "JP");
  });

  it("renders a globe emoji when countryCode is not configured", () => {
    render(<CountryFlag countryCode="XX" />);
    expect(screen.getByText("🌐")).toBeInTheDocument();
  });
});
