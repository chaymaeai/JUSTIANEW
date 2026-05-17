import React from "react";
import { cn } from "@/lib/utils";

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const GradientButton: React.FC<GradientButtonProps> = ({ children, className, ...props }) => (
  <button
    type="button"
    className={cn(
      "inline-flex items-center justify-center rounded-full bg-gradient-cta px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90",
      className
    )}
    {...props}
  >
    {children}
  </button>
);

export default GradientButton;
