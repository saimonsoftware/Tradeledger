import { cn } from "@/lib/utils";

/** The TradeLedger mark: three rising candlesticks inside a rounded tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-7 shrink-0", className)}
      fill="none"
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <g className="stroke-primary-foreground" strokeLinecap="round">
        <path d="M9 17v6" strokeWidth="1.5" />
        <rect
          x="7.5"
          y="18.5"
          width="3"
          height="3.5"
          rx="0.75"
          className="fill-primary-foreground"
          strokeWidth="0"
        />
        <path d="M16 11v12" strokeWidth="1.5" />
        <rect
          x="14.5"
          y="13"
          width="3"
          height="6.5"
          rx="0.75"
          className="fill-primary-foreground"
          strokeWidth="0"
        />
        <path d="M23 7v11" strokeWidth="1.5" />
        <rect
          x="21.5"
          y="8.5"
          width="3"
          height="6.5"
          rx="0.75"
          className="fill-primary-foreground"
          strokeWidth="0"
        />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span>TradeLedger</span>
    </span>
  );
}
