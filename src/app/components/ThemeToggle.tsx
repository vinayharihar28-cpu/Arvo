"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={`p-2 rounded-xl border transition-all cursor-pointer
        ${theme === "dark"
          ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-amber-400"
          : "bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-amber-500"
        } ${className}`}
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
