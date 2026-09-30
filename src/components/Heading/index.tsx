import { ReactNode } from "react";

type HeadingLevel = "h1" | "h2" | "h3" | "h4";
type HeadingVariant = "gradient" | "cyan" | "purple" | "white" | "none";

export interface HeadingProps {
  as?: HeadingLevel;
  variant?: HeadingVariant;
  className?: string;
  children: ReactNode;
}

export const Heading = ({
  as: Component = "h1",
  variant = "gradient",
  className = "",
  children,
}: HeadingProps) => {
  const baseStyles = "font-cyber font-black tracking-widest uppercase";

  const variants = {
    gradient:
      "text-transparent bg-clip-text bg-gradient-to-r from-[#00f3ff] to-[#bc13fe] drop-shadow-[0_0_15px_rgba(0,243,255,0.4)]",
    cyan: "text-[#00f3ff] drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]",
    purple: "text-[#bc13fe] drop-shadow-[0_0_10px_rgba(188,19,254,0.5)]",
    white: "text-white",
    none: "",
  };

  const sizes = {
    h1: "text-4xl md:text-5xl mb-4",
    h2: "text-2xl md:text-3xl mb-3",
    h3: "text-xl md:text-2xl mb-2",
    h4: "text-lg md:text-xl mb-2",
  };

  const finalClassName = [
    variant !== "none" ? baseStyles : "",
    variants[variant],
    sizes[Component],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <Component className={finalClassName}>{children}</Component>;
};
