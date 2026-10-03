"use client";

import { TITLES } from "@/features/title/constants";
import { TitleId } from "@/features/title/types";
import React from "react";

type TitleBadgeProps = {
  titleId?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
  showConditionOnHover?: boolean;
};

export const TitleBadge: React.FC<TitleBadgeProps> = ({
  titleId,
  className = "",
  size = "md",
  showConditionOnHover = true,
}) => {
  if (!titleId || !(titleId in TITLES)) {
    return null;
  }

  const title = TITLES[titleId as TitleId];
  const { bg, border, text, glow } = title.badgeColor;

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5 border tracking-wider",
    md: "text-xs px-2.5 py-1 border tracking-widest",
    lg: "text-sm px-3.5 py-1.5 border-2 tracking-widest font-bold",
  }[size];

  return (
    <span
      title={showConditionOnHover ? `${title.name}: ${title.condition}` : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full font-cyber font-bold uppercase transition-all whitespace-nowrap select-none backdrop-blur-sm ${bg} ${border} ${text} ${glow} ${sizeClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {title.name}
    </span>
  );
};
