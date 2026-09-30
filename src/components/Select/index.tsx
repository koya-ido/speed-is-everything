import { ReactNode, SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
}

export const Select = ({ className = "", children, ...props }: SelectProps) => {
  return (
    <div className="relative">
      <select
        className={`w-full bg-black/50 border border-[#bc13fe]/30 rounded-xl p-4 text-white font-mono text-lg focus:outline-none focus:border-[#bc13fe] focus:shadow-[0_0_15px_rgba(188,19,254,0.3)] transition-all appearance-none cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
        <svg
          className="w-5 h-5 text-[#bc13fe]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          ></path>
        </svg>
      </div>
    </div>
  );
};
