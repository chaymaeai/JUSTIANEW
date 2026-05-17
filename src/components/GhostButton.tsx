import React from "react";
import { cn } from "@/lib/utils";

interface GhostButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  dark?: boolean;
}

const GhostButton: React.FC<GhostButtonProps> = ({ children, className, dark = false, ...props }) => (
  <button
    type="button"
    className={cn(
      "inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold transition",
      dark ? "border-white/20 text-white hover:bg-white/10" : "border-primary text-primary hover:bg-primary/5",
      className
    )}
    {...props}
  >
    {children}
  </button>
);

export default GhostButton;
