"use client";

import { User } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
};

export const Avatar = ({ src, alt = "Avatar", className = "" }: Props) => {
  const [error, setError] = useState(!src);

  if (error || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-black/50 overflow-hidden shrink-0 ${className}`}
      >
        <User className="w-1/2 h-1/2 text-gray-400" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={48}
      height={48}
      unoptimized
      className={`shrink-0 ${className}`}
      onError={() => setError(true)}
    />
  );
};
