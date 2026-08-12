"use client";

import { useMemo, useState } from "react";
import { ListFilter, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toIsoDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Dashboard date-range filter: a segmented Day/Week/Month/Quarter/Year control
 * plus a searchable preset dropdown (Today, Last 7 Days, This Quarter, 2025 …).
 * Each preset resolves to a concrete { from, to } ISO window that the caller
 * feeds to useDashboard / the report hooks. Quarters follow the Indian fiscal
 * year (Q1 = Apr-Jun … Q4 = Jan-Mar); years are calendar years.
 */

export type Gran = "day" | "week" | "month" | "quarter" | "year";

export interface DashRange {
  from: string;
  to: string;
  label: string;
  gran: Gran;
}

interface Preset {
  key: string;
  label: string;
  from: string;
  to: string;
}

const GRANS: { key: Gran; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ---- date helpers (all local time, anchored to midnight) --------------------
function atMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  const x = atMidnight(d);
  x.setDate(x.getDate() + n);
  return x;
}
function startOfWeek(d: Date): Date {
  // Monday-first weeks.
  const x = atMidnight(d);
  const dow = (x.getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(x, -dow);
}
const mStart = (y: number, m: number) => new Date(y, m, 1);
const mEnd = (y: number, m: number) => new Date(y, m + 1, 0);

// Which Indian fiscal quarter (0..3 = Apr-Jun, Jul-Sep, Oct-Dec, Jan-Mar) a month sits in.
function fiscalQuarter(month: number): number {
  if (month >= 3 && month <= 5) return 0;
  if (month >= 6 && month <= 8) return 1;
  if (month >= 9 && month <= 11) return 2;
  return 3;
}

function buildPresets(gran: Gran, now: Date): Preset[] {
  const today = atMidnight(now);
  const iso = toIsoDate;
  const mk = (key: string, label: string, from: Date, to: Date): Preset => ({
    key,
    label,
    from: iso(from),
    to: iso(to),
  });

  if (gran === "day") {
    const yest = addDays(today, -1);
    return [
      mk("today", "Today", today, today),
      mk("yesterday", "Yesterday", yest, yest),
      mk("last7", "Last 7 Days", addDays(today, -6), today),
      mk("last14", "Last 14 Days", addDays(today, -13), today),
      mk("last30", "Last 30 Days", addDays(today, -29), today),
    ];
  }

  if (gran === "week") {
    const ws = startOfWeek(today);
    const out: Preset[] = [
      mk("thisWeek", "This Week", ws, today),
      mk("lastWeek", "Last Week", addDays(ws, -7), addDays(ws, -1)),
    ];
    for (const n of [2, 3, 4, 6, 8, 12, 26]) {
      out.push(mk(`last${n}w`, `Last ${n} Weeks`, addDays(today, -(n * 7 - 1)), today));
    }
    return out;
  }

  if (gran === "month") {
    const y = today.getFullYear();
    const m = today.getMonth();
    const ly = m === 0 ? y - 1 : y;
    const lm = m === 0 ? 11 : m - 1;
    const out: Preset[] = [
      mk("thisMonth", "This Month", mStart(y, m), today),
      mk("lastMonth", "Last Month", mStart(ly, lm), mEnd(ly, lm)),
    ];
    for (let i = 0; i < 12; i++) {
      out.push(mk(`m${i}`, `${MONTHS[i]} ${y}`, mStart(y, i), mEnd(y, i)));
    }
    return out;
  }

  if (gran === "quarter") {
    // The fiscal year (Apr-Mar) that contains today.
    const fyStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    // Each fiscal quarter's concrete window within that FY.
    const q = [
      { key: "Q1", label: "Q1 (Apr-Jun)", y: fyStart, sm: 3 },
      { key: "Q2", label: "Q2 (Jul-Sep)", y: fyStart, sm: 6 },
      { key: "Q3", label: "Q3 (Oct-Dec)", y: fyStart, sm: 9 },
      { key: "Q4", label: "Q4 (Jan-Mar)", y: fyStart + 1, sm: 0 },
    ];
    const qi = fiscalQuarter(today.getMonth());
    const cur = q[qi];
    const prev = qi === 0
      ? { y: fyStart, sm: 0 } // the quarter before Q1 is Jan-Mar of the same calendar year (prev FY's Q4)
      : { y: q[qi - 1].y, sm: q[qi - 1].sm };
    const out: Preset[] = [
      mk("thisQuarter", "This Quarter", mStart(cur.y, cur.sm), today),
      mk("lastQuarter", "Last Quarter", mStart(prev.y, prev.sm), mEnd(prev.y, prev.sm + 2)),
    ];
    for (const item of q) {
      out.push(mk(item.key, item.label, mStart(item.y, item.sm), mEnd(item.y, item.sm + 2)));
    }
    return out;
  }

  // year
  const y = today.getFullYear();
  const out: Preset[] = [
    mk("thisYear", "This Year", mStart(y, 0), today),
    mk("lastYear", "Last Year", mStart(y - 1, 0), mEnd(y - 1, 11)),
  ];
  for (let i = 0; i < 4; i++) {
    const yr = y - i;
    out.push(mk(`y${yr}`, String(yr), mStart(yr, 0), mEnd(yr, 11)));
  }
  return out;
}

/** The dashboard's initial window: current month to date. */
export function defaultRange(): DashRange {
  const p = buildPresets("month", new Date())[0];
  return { from: p.from, to: p.to, label: p.label, gran: "month" };
}

export function DashboardFilter({
  value,
  onChange,
  className,
}: {
  value: DashRange;
  onChange: (r: DashRange) => void;
  className?: string;
}) {
  const [gran, setGran] = useState<Gran>(value.gran);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const presets = useMemo(() => buildPresets(gran, new Date()), [gran]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? presets.filter((p) => p.label.toLowerCase().includes(needle)) : presets;
  }, [presets, q]);

  const pick = (p: Preset) => {
    onChange({ from: p.from, to: p.to, label: p.label, gran });
    setOpen(false);
    setQ("");
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* segmented granularity control — a white pill card, active pill navy blue */}
      <div className="flex items-center rounded-full border bg-card p-1 shadow-sm">
        {GRANS.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => {
              setGran(g.key);
              setQ("");
              setOpen(true);
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
              gran === g.key
                ? "bg-blue-900 text-white shadow-sm dark:bg-blue-600"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* preset dropdown — icon-only square button (the selected period shows in the header) */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 w-9 rounded-lg p-0" aria-label="Filter period">
            <ListFilter className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-0">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type to search…"
                className="h-8 pl-7 text-xs"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto scrollbar-thin p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">No results</p>
            ) : (
              filtered.map((p) => {
                const active = p.from === value.from && p.to === value.to;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => pick(p)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent",
                      active && "bg-accent font-semibold",
                    )}
                  >
                    <span className="truncate">{p.label}</span>
                    {active && <Check className="size-3.5 shrink-0 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
