import { ParticleCanvas, ParticleCanvasHandle } from "@/features/game/components/ParticleCanvas";
import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

describe("ParticleCanvas", () => {
  it("renders without crashing", () => {
    const { container } = render(<ParticleCanvas />);
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("burst method can be called without errors", () => {
    const ref = createRef<ParticleCanvasHandle>();
    render(<ParticleCanvas ref={ref} />);
    expect(ref.current).toBeDefined();

    expect(() => {
      ref.current?.burst("GODLIKE", 100, 100);
      ref.current?.burst("EXCELLENT");
      ref.current?.clear();
    }).not.toThrow();
  });
});
