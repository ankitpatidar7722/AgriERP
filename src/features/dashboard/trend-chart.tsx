"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard, ChartLegend, ChartTooltip, SERIES } from "./chart-parts";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { useT } from "@/features/i18n/provider";
import type { DashboardMonthPoint } from "./types";

interface TrendChartProps {
  data: DashboardMonthPoint[];
  /** Profit is dropped for users without Dashboard.ViewProfit. */
  showProfit: boolean;
}

/**
 * Sales, purchase and profit over twelve months.
 *
 * A line chart because the job is change-over-time, and ONE y-axis because all
 * three series are rupees. A second axis for profit would let two different
 * scales share a picture and invite the reader to compare their heights - the
 * single most common way a chart lies.
 */
export function TrendChart({ data, showProfit }: TrendChartProps) {
  const t = useT();
  const series = [
    { key: "salesAmount", label: t("dash.sales"), color: SERIES[0] },
    { key: "purchaseAmount", label: t("dash.purchase"), color: SERIES[1] },
    ...(showProfit ? [{ key: "profitAmount", label: t("dash.profit"), color: SERIES[2] }] : []),
  ];

  // With nothing traded yet the axis auto-scales to an arbitrary 0-4 and the
  // chart shows three flat lines against invented rupee ticks, which reads as
  // broken rather than empty.
  const hasData = data.some(
    (point) => point.salesAmount !== 0 || point.purchaseAmount !== 0 || point.profitAmount !== 0,
  );

  return (
    <ChartCard
      title={t("dash.trendTitle")}
      description={t("dash.last12")}
      legend={<ChartLegend items={series.map((s) => ({ label: s.label, color: s.color }))} />}
      table={
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-1.5 pr-3 font-medium">{t("dash.month")}</th>
              {series.map((s) => (
                <th key={s.key} className="py-1.5 pl-3 text-right font-medium">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.monthStart} className="border-b last:border-0">
                <td className="py-1.5 pr-3 whitespace-nowrap">{point.monthLabel}</td>
                {series.map((s) => (
                  <td key={s.key} className="py-1.5 pl-3 text-right tabular">
                    {formatCurrency(point[s.key as keyof DashboardMonthPoint] as number)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      {!hasData ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
          {t("dash.trendEmpty")}
        </div>
      ) : (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          {/* Horizontal rules only: vertical ones add ink without adding
              information when the x-axis is already labelled. */}
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="monthLabel"
            tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--chart-grid)" }}
            // Every other label on narrow screens, so ticks never collide.
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value: number) => formatCurrencyCompact(value)}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              // Markers appear on hover only: twelve points times three series
              // is thirty-six dots, which reads as noise rather than data.
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
