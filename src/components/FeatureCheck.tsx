import React from "react";
import { Check } from "lucide-react";

interface FeatureCheckProps {
  label: string;
}

const FeatureCheck: React.FC<FeatureCheckProps> = ({ label }) => (
  <div className="flex items-start gap-2">
    <Check className="mt-0.5 h-4 w-4 text-teal" aria-hidden />
    <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
  </div>
);

export default FeatureCheck;
