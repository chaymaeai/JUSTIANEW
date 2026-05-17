import { colors } from "./src/config/colors.js";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        "primary-light": colors.primaryLight,
        "primary-dark": colors.primaryDark,
        cyan: { DEFAULT: colors.accentCyan },
        teal: { DEFAULT: colors.accentTeal },
        blue: { DEFAULT: colors.accentBlue },
        purple: { DEFAULT: colors.accentPurple },
        amber: { DEFAULT: colors.accentAmber },
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        body: ["DM Sans", "sans-serif"],
      },
      backgroundImage: {
        "gradient-cta": colors.gradientCTA,
        "gradient-hero": colors.gradientBg,
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
        glow: "0 0 80px rgba(0, 178, 255, 0.20)",
        card: "0 4px 24px rgba(0, 26, 51, 0.10)",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
