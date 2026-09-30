import { Select } from "@/components/Select/index";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Select", () => {
  it("renders select element with children options", () => {
    render(
      <Select defaultValue="US">
        <option value="JP">Japan</option>
        <option value="US">USA</option>
      </Select>,
    );

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue("US");
    expect(screen.getByRole("option", { name: "Japan" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "USA" })).toBeInTheDocument();
  });
});
