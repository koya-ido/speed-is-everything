"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

export type DropdownProps = {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right" | "top";
  className?: string;
  fullWidth?: boolean;
};

export const Dropdown = ({
  trigger,
  children,
  align = "right",
  className = "",
  fullWidth = false,
}: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const alignmentClass =
    align === "top"
      ? "bottom-full mb-2 left-0"
      : align === "left"
        ? "top-full mt-2 left-0"
        : "top-full mt-2 right-0";

  return (
    <div className={`relative ${className}`} ref={ref}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>
      {isOpen && (
        <div
          className={`absolute ${alignmentClass} ${fullWidth ? "w-full" : "min-w-48"} bg-black/90 border border-white/20 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-md overflow-hidden flex flex-col z-50 animate-fade-in`}
          onClick={(e) => {
            // Only close if a button (DropdownItem) was clicked, allowing scrollbar dragging
            if ((e.target as HTMLElement).closest("button")) {
              setIsOpen(false);
            }
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export const DropdownItem = ({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3.5 hover:bg-white/10 text-white font-cyber text-sm md:text-base font-bold tracking-widest transition-colors text-left flex items-center gap-3 w-full border-b border-white/5 last:border-0 ${className}`}
    >
      {children}
    </button>
  );
};
