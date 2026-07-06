"use client";

export function ScaleInput({
  min,
  max,
  value,
  onChange,
  minLabel,
  maxLabel,
}: {
  min: number;
  max: number;
  value: number | null;
  onChange: (v: number) => void;
  minLabel?: string;
  maxLabel?: string;
}) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {steps.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-pressed={active}
              className={`h-10 flex-1 min-w-9 rounded-lg border text-sm tabular-nums transition-all duration-150 ${
                active
                  ? "border-accent bg-accent text-[#fbf7ee] shadow-sm dark:text-[#16130f]"
                  : "border-hairline bg-paper text-ink-soft hover:border-accent/50 hover:text-ink"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      {(minLabel || maxLabel) && (
        <div className="mt-1.5 flex justify-between text-[11px] text-muted">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}
