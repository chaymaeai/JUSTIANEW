import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeInUp } from "@/lib/animations";

interface SectionWrapperProps {
  id?: string;
  className?: string;
  dark?: boolean;
  children: React.ReactNode;
}

const SectionWrapper: React.FC<SectionWrapperProps> = ({ id, className, dark = false, children }) => (
  <motion.section
    id={id}
    variants={fadeInUp}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.55, ease: "easeOut" }}
    className={cn(
      "py-20 md:py-28",
      dark ? "bg-gradient-hero" : "bg-[var(--color-surface)]",
      className
    )}
  >
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
  </motion.section>
);

export default SectionWrapper;
