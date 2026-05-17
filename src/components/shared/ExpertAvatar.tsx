import { cn } from "@/lib/utils";

function initials(firstName: string, lastName: string) {
  const a = firstName.trim().charAt(0);
  const b = lastName.trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}

export interface ExpertAvatarProps {
  firstName: string;
  lastName: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClass = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function ExpertAvatar({ firstName, lastName, src, size = "md", className }: ExpertAvatarProps) {
  const label = initials(firstName, lastName);
  if (src) {
    return (
      <img
        src={src}
        alt={`${firstName} ${lastName}`}
        className={cn("rounded-full object-cover ring-2 ring-white", sizeClass[size], className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#001A33] to-cyan-600 font-semibold text-white ring-2 ring-white",
        sizeClass[size],
        className
      )}
      aria-hidden
    >
      {label}
    </div>
  );
}
