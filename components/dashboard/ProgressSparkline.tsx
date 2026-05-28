type Point = { date: Date; pct: number };

type Props = {
  points: Point[];
  width?: number;
  height?: number;
};

export function ProgressSparkline({ points, width = 140, height = 36 }: Props) {
  if (points.length === 0) {
    return (
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase tracking-[0.18em] text-muted-foreground">Trend</span>
        <span className="text-muted-foreground/60">no movement</span>
      </div>
    );
  }

  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const xStep = points.length > 1 ? innerW / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = padding + i * xStep;
    const y = padding + (1 - p.pct / 100) * innerH;
    return { x, y };
  });

  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    coords.length > 1
      ? `${path} L ${(padding + innerW).toFixed(1)} ${(padding + innerH).toFixed(1)} L ${padding.toFixed(1)} ${(padding + innerH).toFixed(1)} Z`
      : null;

  const last = points[points.length - 1].pct;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="uppercase tracking-[0.18em] text-muted-foreground">Trend</span>
        <span data-numeric className="priv font-mono text-foreground/90">
          {Math.round(last)}%
        </span>
      </div>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="priv w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="progress-spark-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {areaPath && <path d={areaPath} fill="url(#progress-spark-fill)" />}
        <path
          d={path}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.length === 1 && (
          <circle cx={coords[0].x} cy={coords[0].y} r="2.5" fill="var(--primary)" />
        )}
      </svg>
    </div>
  );
}
