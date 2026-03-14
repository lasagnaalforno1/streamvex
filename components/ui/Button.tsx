"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, children, disabled, ...props },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      primary:
        "bg-violet-600 hover:bg-violet-500 text-white focus-visible:ring-violet-500",
      secondary:
        "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 hover:border-zinc-600 focus-visible:ring-zinc-500",
      outline:
        "bg-transparent hover:bg-violet-600/10 text-violet-400 hover:text-violet-300 border border-violet-600/50 hover:border-violet-500 focus-visible:ring-violet-500",
      ghost:
        "bg-transparent hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 focus-visible:ring-zinc-500",
      danger:
        "bg-red-600 hover:bg-red-500 text-white focus-visible:ring-red-500",
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5",
      md: "text-sm px-5 py-2.5",
      lg: "text-base px-6 py-3",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
