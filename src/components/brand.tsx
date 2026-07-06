import Link from "next/link";

/** A quiet dawn mark: a sun cresting a horizon — the "reset" at daybreak. */
export function Mark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 22a10 10 0 0 1 20 0" className="text-accent" />
      <line x1="3" y1="22" x2="29" y2="22" />
      <line x1="16" y1="4" x2="16" y2="8" className="text-accent" />
      <line x1="7.5" y1="7.5" x2="10" y2="10" className="text-accent" />
      <line x1="24.5" y1="7.5" x2="22" y2="10" className="text-accent" />
    </svg>
  );
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5">
      <span className="text-ink transition-colors group-hover:text-accent">
        <Mark />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-serif text-[17px] font-medium tracking-tight text-ink">
          導航日
        </span>
        <span className="mt-0.5 text-[11px] tracking-wide text-muted">
          Navigation Day
        </span>
      </span>
    </Link>
  );
}
