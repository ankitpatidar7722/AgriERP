"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartCard, ChartTooltip, SERIES } from "./chart-parts";
import { formatCurrency } from "@/lib/format";
import { useT } from "@/features/i18n/provider";
import type { DashboardItemSubGroupStock } from "./types";

/**
 * Five named slices plus "Other".
 *
 * The cap is the point: a ring with fourteen segments cannot be read, and past
 * the sixth slot there is no next hue to reach for - the palette is a fixed
 * order, not a generator. Everything beyond the top five folds into a single
 * grey-free "Other" that still carries its real total.
 */
const MAX_SLICES = 5;

interface ItemSubGroupDonutProps {
  data: DashboardItemSubGroupStock[];
}

export function ItemSubGroupDonut({ data }: ItemSubGroupDonutProps) {
  const t = useT();
  const slices = useMemo(() => {
    const withValue = data
      .filter((row) => row.stockValueAtCost > 0)
      .sort((a, b) => b.stockValueAtCost - a.stockValueAtCost);

    const top = withValue.slice(0, MAX_SLICES).map((row, index) => ({
      name: row.itemSubGroupName,
      value: row.stockValueAtCost,
      color: SERIES[index],
    }));

    const rest = withValue.slice(MAX_SLICES);
    if (rest.length > 0) {
      top.push({
        name: `${t("dash.other")} (${rest.length})`,
        value: rest.reduce((sum, row) => sum + row.stockValueAtCost, 0),
        color: SERIES[MAX_SLICES],
      });
    }

    return top;
  }, [data, t]);

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <ChartCard
      title={t("dash.donutTitle")}
      description={t("dash.atBatchCost")}
      table={
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-1.5 pr-3 font-medium">{t("dash.subGroup")}</th>
              <th className="py-1.5 pl-3 text-right font-medium">{t("dash.value")}</th>
              <th className="py-1.5 pl-3 text-right font-medium">{t("dash.share")}</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((slice) => (
              <tr key={slice.name} className="border-b last:border-0">
                <td className="py-1.5 pr-3">{slice.name}</td>
                <td className="py-1.5 pl-3 text-right tabular">{formatCurrency(slice.value)}</td>
                <td className="py-1.5 pl-3 text-right tabular text-muted-foreground">
                  {total > 0 ? `${((slice.value / total) * 100).toFixed(1)}%` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      {slices.length === 0 ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
          {t("dash.donutEmpty")}
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ResponsiveContainer width="100%" height={220} className="sm:max-w-[220px]">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                // A 2px gap of surface between segments, so adjacent fills read
                // as separate marks without needing a contrasting outline.
                paddingAngle={2}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              >
                {slices.map((slice) => (
                  <Cell key={slice.name} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/*
            Direct labels beside the ring, not just a colour key. Three of the
            light-mode steps sit below 3:1 on white, so the name and the figure
            carry the meaning and the swatch merely links them to a segment.
          */}
          <ul className="flex-1 space-y-1.5">
            {slices.map((slice) => (
              <li key={slice.name} className="flex items-center gap-3 text-sm">
                <span
                  className="size-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: slice.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{slice.name}</span>
                <span className="shrink-0 tabular font-medium">
                  {formatCurrency(slice.value)}
                </span>
                <span className="w-12 shrink-0 text-right tabular text-xs text-muted-foreground">
                  {total > 0 ? `${((slice.value / total) * 100).toFixed(0)}%` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}
