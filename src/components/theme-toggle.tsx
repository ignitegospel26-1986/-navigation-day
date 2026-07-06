"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

// Cycle: 晨間紙感 (light) → 深夜書寫 (dark) → 深藍 (navy) → …
const ORDER = ["light", "dark", "navy"] as const;
type ThemeName = (typeof ORDER)[number];

const NEXT: Record<ThemeName, ThemeName> = {
  light: "dark",
  dark: "navy",
  navy: "light",
};
const LABEL: Record<ThemeName, string> = {
  light: "晨間紙感",
  dark: "深夜書寫",
  navy: "深藍",
};

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // What's actually showing right now (theme may be "system").
  const current: ThemeName =
    theme === "navy" || resolvedTheme === "navy"
      ? "navy"
      : resolvedTheme === "dark"
        ? "dark"
        : "light";

  return (
    <button
      type="button"
      aria-label={`切換佈景（目前：${LABEL[current]}）`}
      title={`佈景：${LABEL[current]}`}
      onClick={() => setTheme(NEXT[current])}
      className="btn btn-ghost h-9 w-9 !p-0 text-ink-soft"
    >
      {mounted && (
        <motion.span
          key={current}
          initial={{ rotate: -30, opacity: 0, scale: 0.8 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
          className="inline-flex"
        >
          {current === "light" ? (
            <SunIcon />
          ) : current === "dark" ? (
            <MoonIcon />
          ) : (
            <HalfSunIcon />
          )}
        </motion.span>
      )}
    </button>
  );
}

function SunIcon() {
  return <span className="text-base leading-none">☀</span>;
}
function MoonIcon() {
  return <span className="text-base leading-none">☾</span>;
}

/** 小太陽亮一半 — the navy (深藍) mode marker. */
function HalfSunIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden
    >
      <g>
        <line x1="12" y1="2.5" x2="12" y2="4.5" />
        <line x1="12" y1="19.5" x2="12" y2="21.5" />
        <line x1="2.5" y1="12" x2="4.5" y2="12" />
        <line x1="19.5" y1="12" x2="21.5" y2="12" />
        <line x1="5.2" y1="5.2" x2="6.6" y2="6.6" />
        <line x1="17.4" y1="17.4" x2="18.8" y2="18.8" />
        <line x1="18.8" y1="5.2" x2="17.4" y2="6.6" />
        <line x1="6.6" y1="17.4" x2="5.2" y2="18.8" />
      </g>
      <circle cx="12" cy="12" r="4.3" />
      {/* left half filled */}
      <path d="M12 7.7 A4.3 4.3 0 0 0 12 16.3 Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
