"use client";

import { motion } from "framer-motion";
import type { Tone } from "@/lib/prompts";

const OPTIONS: { value: Tone; label: string }[] = [
  { value: "gentle", label: "溫柔" },
  { value: "sharp", label: "犀利" },
];

export function ToneSwitch({
  tone,
  onChange,
  size = "md",
}: {
  tone: Tone;
  onChange: (t: Tone) => void;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm";
  return (
    <div className="inline-flex rounded-full border border-hairline bg-surface-2/60 p-0.5">
      {OPTIONS.map((o) => {
        const active = tone === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`relative rounded-full font-medium transition-colors ${pad} ${
              active ? "text-[#fbf7ee] dark:text-[#16130f]" : "text-ink-soft hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId="tone-pill"
                className="absolute inset-0 rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
