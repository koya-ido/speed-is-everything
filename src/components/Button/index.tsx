import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost"
  | "icon"
  | "success"
  | "success-solid";
type ButtonSize = "sm" | "md" | "lg" | "none";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export const Button = ({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) => {
  const baseStyles =
    "font-cyber font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3";

  const variants = {
    primary:
      "bg-[#00f3ff]/10 hover:bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]/50 hover:border-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.3)] hover:shadow-[0_0_25px_rgba(0,243,255,0.5)] rounded-xl",
    secondary:
      "bg-[#bc13fe]/20 hover:bg-[#bc13fe]/30 text-[#bc13fe] border border-[#bc13fe]/50 hover:border-[#bc13fe] shadow-[0_0_15px_rgba(188,19,254,0.4)] hover:shadow-[0_0_25px_rgba(188,19,254,0.6)] rounded-xl",
    success:
      "bg-[#00ff66]/20 hover:bg-[#00ff66]/30 text-[#00ff66] border border-[#00ff66]/50 hover:border-[#00ff66] shadow-[0_0_15px_rgba(0,255,102,0.2)] hover:shadow-[0_0_25px_rgba(0,255,102,0.5)] rounded-xl",
    "success-solid":
      "bg-[#00ff66] hover:bg-[#33ff88] text-black border border-[#00ff66] shadow-[0_0_20px_rgba(0,255,102,0.4)] hover:shadow-[0_0_30px_rgba(0,255,102,0.7)] rounded-xl transform hover:scale-[1.02] active:scale-95",
    ghost:
      "bg-black/40 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 hover:border-white/30 rounded-xl",
    danger:
      "bg-white/5 hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-white/10 hover:border-red-500/50 rounded-xl",
    icon: "bg-transparent border-none shadow-none text-current hover:scale-110 active:scale-95",
  };

  const sizes = {
    sm: "px-4 py-2 text-xs md:text-sm",
    md: "px-8 py-3 text-sm md:text-base",
    lg: "px-10 py-5 text-xl md:text-3xl",
    none: "",
  };

  const finalClassName = [baseStyles, variants[variant], sizes[size], className]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={finalClassName} {...props}>
      {children}
    </button>
  );
};
