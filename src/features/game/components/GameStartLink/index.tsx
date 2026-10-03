"use client";

import { clearPendingScore } from "@/features/game/utils/pendingScore";
import { Link } from "@/i18n/routing";
import { ReactNode } from "react";

export const GameStartLink = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  const handleClick = () => {
    clearPendingScore();
  };

  return (
    <Link href="/game" onClick={handleClick} className={className}>
      {children}
    </Link>
  );
};
