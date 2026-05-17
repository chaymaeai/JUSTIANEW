import React from "react";
import { cn } from "@/lib/utils";

interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
}

const SectionTitle: React.FC<SectionTitleProps> = ({ children, className }) => (
  <h2 className={cn("font-display text-3xl font-bold tracking-tight md:text-5xl", className)}>
    {children}
  </h2>
);

export default SectionTitle;
