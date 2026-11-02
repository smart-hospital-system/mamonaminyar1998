"use client";

import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggle() {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("slotly-theme", next);
    } catch {
      /* ignore */
    }
    setTheme(next);
  }

  return { theme, toggle };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle colour theme"
      className={cn(
        "relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:bg-surface-3 hover:text-ink",
        className
      )}
    >
      <Sun size={15} className={cn("absolute transition-all", theme === "dark" ? "scale-0 rotate-90 opacity-0" : "scale-100 opacity-100")} />
      <Moon size={15} className={cn("absolute transition-all", theme === "dark" ? "scale-100 opacity-100" : "scale-0 -rotate-90 opacity-0")} />
    </button>
  );
}
