import { cn } from "@/lib/utils";

/** The TradeLedger mark: three rising white candlesticks on a black tile. The thin light edge keeps it visible on black backgrounds. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-7 shrink-0", className)}
      fill="none"
    >
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="7.5"
        className="fill-black stroke-white/20"
        strokeWidth="1"
      />
      <g className="stroke-white" strokeLinecap="round">
        <path d="M9 17v6" strokeWidth="1.5" />
        <rect
          x="7.5"
          y="18.5"
          width="3"
          height="3.5"
          rx="0.75"
          className="fill-white"
          strokeWidth="0"
        />
        <path d="M16 11v12" strokeWidth="1.5" />
        <rect
          x="14.5"
          y="13"
          width="3"
          height="6.5"
          rx="0.75"
          className="fill-white"
          strokeWidth="0"
        />
        <path d="M23 7v11" strokeWidth="1.5" />
        <rect
          x="21.5"
          y="8.5"
          width="3"
          height="6.5"
          rx="0.75"
          className="fill-white"
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
