"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

type ThemeToggleProps = {
  className?: string;
};

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const isDark = theme === "dark";

  const label = !mounted
    ? "Alternar tema"
    : isDark
      ? "Ativar tema claro"
      : "Ativar tema escuro";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium shadow-[0_14px_36px_rgba(15,23,42,0.10)] transition hover:-translate-y-0.5 ${className ?? ""} ${
        isDark
          ? "border-white/10 bg-white/[0.05] text-slate-100 hover:bg-white/[0.09]"
          : "border-slate-200 bg-white/95 text-slate-700 hover:border-sky-200 hover:bg-white"
      }`}
      aria-label={label}
      title={label}
      suppressHydrationWarning
    >
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
          isDark
            ? "bg-white/[0.08] text-slate-100"
            : "bg-sky-50 text-sky-700"
        }`}
      >
        {!mounted ? <Moon size={16} /> : isDark ? <Sun size={16} /> : <Moon size={16} />}
      </span>
      <span>{!mounted ? "Tema" : isDark ? "Tema claro" : "Tema escuro"}</span>
    </button>
  );
}
