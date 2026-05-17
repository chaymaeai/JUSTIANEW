import { useState, useEffect, type Dispatch, type SetStateAction } from "react";

interface UseThemeResult {
  isDark: boolean;
  setIsDark: Dispatch<SetStateAction<boolean>>;
}

/**
 * Shared theme hook for dark/light mode
 * Manages theme state and applies it to the document root
 * Persists theme preference in localStorage
 */
export function useTheme(): UseThemeResult {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return { isDark, setIsDark };
}

