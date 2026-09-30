import { CountrySelect } from "@/features/user/components/CountrySelect/index";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("CountrySelect", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders custom dropdown and handles country selection", () => {
    const handleCountryChange = vi.fn();
    const handleCustomCountryChange = vi.fn();

    const { container } = render(
      <CountrySelect
        country=""
        onCountryChange={handleCountryChange}
        customCountry=""
        onCustomCountryChange={handleCustomCountryChange}
      />,
    );

    // Initial trigger element
    const trigger = container.querySelector(".cursor-pointer");
    expect(trigger).toBeInTheDocument();

    // Click trigger to open custom dropdown
    fireEvent.click(trigger!);

    // Click Japan option
    const jpOption = screen.getByRole("button", { name: /country_jp/i });
    expect(jpOption).toBeInTheDocument();
    fireEvent.click(jpOption);

    expect(handleCountryChange).toHaveBeenCalledWith("JP");
    expect(handleCustomCountryChange).toHaveBeenCalledWith("");
  });

  it("renders flag image when a country is selected in trigger", () => {
    render(
      <CountrySelect
        country="JP"
        onCountryChange={vi.fn()}
        customCountry=""
        onCustomCountryChange={vi.fn()}
      />,
    );

    const flagImg = screen.getByRole("img", { name: "JP" });
    expect(flagImg).toBeInTheDocument();
    expect(flagImg).toHaveAttribute("src", "https://flagcdn.com/w40/jp.png");
  });

  it("handles underlying select change for form/test compatibility", () => {
    const handleCountryChange = vi.fn();
    const handleCustomCountryChange = vi.fn();

    render(
      <CountrySelect
        country=""
        onCountryChange={handleCountryChange}
        customCountry=""
        onCustomCountryChange={handleCustomCountryChange}
      />,
    );

    const select = screen.getByRole("combobox", { hidden: true });
    expect(select).toBeInTheDocument();

    fireEvent.change(select, { target: { value: "US" } });
    expect(handleCountryChange).toHaveBeenCalledWith("US");
  });

  it("shows custom country input when country is OTHER", () => {
    const handleCountryChange = vi.fn();
    const handleCustomCountryChange = vi.fn();

    const { rerender } = render(
      <CountrySelect
        country="US"
        onCountryChange={handleCountryChange}
        customCountry=""
        onCustomCountryChange={handleCustomCountryChange}
      />,
    );

    expect(
      screen.queryByPlaceholderText("placeholder_country"),
    ).not.toBeInTheDocument();

    rerender(
      <CountrySelect
        country="OTHER"
        onCountryChange={handleCountryChange}
        customCountry="Atlantis"
        onCustomCountryChange={handleCustomCountryChange}
      />,
    );

    const customInput = screen.getByPlaceholderText("placeholder_country");
    expect(customInput).toBeInTheDocument();
    expect(customInput).toHaveValue("Atlantis");

    fireEvent.change(customInput, { target: { value: "El Dorado" } });
    expect(handleCustomCountryChange).toHaveBeenCalledWith("El Dorado");
  });
});
