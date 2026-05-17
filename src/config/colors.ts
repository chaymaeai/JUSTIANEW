// JUSTIA Design Tokens — inspired by deep-navy glassmorphism UI
export const colors = {
  primary: "#001A33",
  primaryLight: "#0A2540",
  primaryDark: "#020B2D",
  accentCyan: "#00B2FF",
  accentTeal: "#00D4AA",
  accentBlue: "#2979FF",
  accentPurple: "#8B5CF6",
  accentAmber: "#F59E0B",
  gradientCTA: "linear-gradient(135deg, #2979FF 0%, #00B2FF 100%)",
  gradientBg: "radial-gradient(ellipse at 30% 20%, #041454 0%, #020B2D 70%)",
  gradientCard: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
  glassBorder: "rgba(255, 255, 255, 0.10)",
  glassSurface: "rgba(10, 22, 40, 0.85)",
  glassHighlight: "rgba(41, 121, 255, 0.15)",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255, 255, 255, 0.55)",
  textMuted: "rgba(255, 255, 255, 0.30)",
  textDark: "#0A1628",
  lightBg: "#FFFFFF",
  lightSurface: "#F4F7FF",
  lightBorder: "rgba(0, 26, 51, 0.10)",
  lightText: "#001A33",
  lightMuted: "rgba(0, 26, 51, 0.50)",
  success: "#00D4AA",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#00B2FF",
} as const;

export function withOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export type ColorKey = keyof typeof colors;

