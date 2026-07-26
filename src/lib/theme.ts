import { useEffect, useState } from "react";

export type Theme = "dark" | "light" | "system";

function resolveSystem(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function apply(theme: Theme) {
  const effective = theme === "system" ? resolveSystem() : theme;
  document.documentElement.classList.toggle("light", effective === "light");
  document.documentElement.classList.toggle("dark", effective === "dark");
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = (localStorage.getItem("eb-theme") as Theme | null) ?? "dark";
    setThemeState(stored);
    apply(stored);
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    localStorage.setItem("eb-theme", next);
    apply(next);
  };

  return {
    theme,
    setTheme,
    toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
  };
}
