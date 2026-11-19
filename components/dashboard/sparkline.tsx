/**
 * 30-day balance line. Server-rendered SVG (no JS). Single series, so no legend;
 * 2px line with an end dot (≥8px, surface ring). Decorative: the balance and
 * week P&L next to it carry the numbers.
 */
export function Sparkline({ points, className }: { points: number[]; className?: string }) {
  const w = 120;
  const h = 32;
  const pad = 4;
  if (points.length < 2) return <div className={className} />;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (w - pad * 2);
  // Flat line sits in the middle rather than on the floor.
  const y = (v: number) => (max === min ? h / 2 : h - pad - ((v - min) / range) * (h - pad * 2));
  const d = points.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = points.length - 1;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        d={d}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={x(last)}
        cy={y(points[last])}
        r="4"
        fill="var(--primary)"
        stroke="var(--card)"
        strokeWidth="2"
      />
    </svg>
  );
}
