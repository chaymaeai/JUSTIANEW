import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeInUp } from "@/lib/animations";

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({ children, className }) => (
  <motion.article
    variants={fadeInUp}
    className={cn(
      "rounded-2xl border border-[var(--color-card-border)] bg-[var(--color-card-bg)] p-6 shadow-card backdrop-blur-md",
      className
    )}
  >
    {children}
  </motion.article>
);

export default AnimatedCard;
