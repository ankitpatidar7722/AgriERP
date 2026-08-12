"use client";

import { useId } from "react";

/**
 * A tiny dependency-free inline sparkline (line / area / bar). Matches the API
 * the ported design-kit cards expect: data, type, height, width, color,
 * showEndDot, smooth. Rendered as plain SVG so it stays crisp at any size and
 * costs nothing.
 */
export interface SparklineProps {
  data: number[];
  type?: "line" | "area" | "bar";
  height?: number;
  width?: number;
  /** Stretch to the parent's width (via viewBox) instead of a fixed pixel width. */
  fullWidth?: boolean;
  color?: string;
  showEndDot?: boolean;
  smooth?: boolean;
  /** Overlay a bright dash that travels along the line (a "pulse" running through it). */
  pulse?: boolean;
  className?: string;
}

/** Catmull-Rom spline → cubic bezier, for a soft line without extra libraries. */
function smoothPath(pts: readonly (readonly [number, number])[]): string {
  const n = pts.length;
  if (n < 2) return "";
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export function Sparkline({
  data,
  type = "line",
  height = 40,
  width = 120,
  fullWidth = false,
  color = "#6366f1",
  showEndDot = false,
  smooth = false,
  pulse = false,
  className,
}: SparklineProps) {
  const gid = useId();
  // When fullWidth, the SVG scales to its container via a viewBox; coordinates
  // are still computed against `width`/`height` and stretched to fit.
  const svgSize = (w: number, h: number) =>
    fullWidth
      ? ({ width: "100%", height: h, viewBox: `0 0 ${w} ${h}` } as const)
      : ({ width: w, height: h } as const);

  if (!data || data.length === 0) {
    return <svg {...svgSize(width, height)} className={className} aria-hidden />;
  }

  const w = width;
  const h = height;
  const pad = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const n = data.length;
  const px = (i: number) => (n === 1 ? w / 2 : pad + (i * (w - pad * 2)) / (n - 1));
  const py = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2);
  const pts = data.map((v, i) => [px(i), py(v)] as const);

  if (type === "bar") {
    const slot = (w - pad * 2) / n;
    const bw = Math.max(1.5, slot - 1.5);
    return (
      <svg {...svgSize(w, h)} className={className} aria-hidden preserveAspectRatio="none">
        {data.map((v, i) => {
          const bh = Math.max(1, ((v - min) / span) * (h - pad * 2));
          return (
            <rect
              key={i}
              x={pad + i * slot + (slot - bw) / 2}
              y={h - pad - bh}
              width={bw}
              height={bh}
              rx={1}
              fill={color}
              opacity={0.85}
            />
          );
        })}
      </svg>
    );
  }

  const linePath = smooth
    ? smoothPath(pts)
    : pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[n - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;

  return (
    <svg {...svgSize(w, h)} className={className} aria-hidden preserveAspectRatio="none">
      {type === "area" && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gid})`} stroke="none" />
        </>
      )}
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={pulse ? 0.28 : 1} />
      {/* the pulse: a bright stroke that draws the whole line on, then wipes, then repeats */}
      {pulse && (
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="spark-pulse"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {showEndDot && <circle cx={pts[n - 1][0]} cy={pts[n - 1][1]} r={2.5} fill={color} />}
    </svg>
  );
}
