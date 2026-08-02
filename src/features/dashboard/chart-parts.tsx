"use client";

import { useState } from "react";
import { Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

/**
 * Categorical series slots, in fixed order. Never cycled: a chart that runs out
 * of slots folds the remainder into "Other" rather than reusing a hue, because
 * a repeated colour means "same thing" to a reader.
 *
 * The hexes live in globals.css so light and dark each get their own validated
 * step; this array only names the slots.
 */
export const SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

/**
 * Shared tooltip. Values wear text tokens; the series colour appears only as a
 * swatch beside the label, so identity is never carried by text colour alone.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter = formatCurrency,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  valueFormatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      {label && <p className="mb-1.5 text-xs font-medium">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-medium tabular">
              {valueFormatter(Number(entry.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Legend row. Always present for two or more series. */
export function ChartLegend({
  items,
}: {
  items: { label: string; color: string }[];
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="size-2.5 rounded-[2px]"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

interface ChartCardProps {
  title: string;
  description?: string;
  legend?: React.ReactNode;
  /** Rendered when "Show data" is on. */
  table: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Chart shell with a data-table toggle.
 *
 * The table is not optional polish. Three of the light-mode series steps sit
 * below 3:1 against a white surface, and the documented relief for that is a
 * visible-label or table alternative - so every chart here ships one, which
 * also covers the plain accessibility requirement that the numbers be readable
 * without seeing the plot.
 */
export function ChartCard({ title, description, legend, table, children }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 p-5 pb-4">
        <div className="min-w-0">
          <CardTitle className="text-[17px] font-semibold">{title}</CardTitle>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
          {legend && <div className="mt-3">{legend}</div>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="no-print h-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
          onClick={() => setShowTable((value) => !value)}
          aria-pressed={showTable}
        >
          <Table2 className="mr-1.5 size-4" />
          {showTable ? "Chart" : "Data"}
        </Button>
      </CardHeader>

      <CardContent className="flex-1 p-5 pt-0">
        {showTable ? (
          <div className="max-h-[280px] overflow-auto scrollbar-thin">{table}</div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
