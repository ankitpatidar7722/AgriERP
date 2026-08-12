/* eslint-disable @typescript-eslint/no-explicit-any -- echarts option objects are dynamically built; typing them fully adds no safety here. */
'use client'

import ReactECharts from 'echarts-for-react'
import { cn } from '@/lib/utils'

// ─── helpers ───────────────────────────────────────────────────────────────
function hexToRgba(hex: string, a: number): string {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}
const vGrad = (top: string, bottom: string) => ({
  type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
  colorStops: [{ offset: 0, color: top }, { offset: 1, color: bottom }],
})
const hGrad = (left: string, right: string) => ({
  type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
  colorStops: [{ offset: 0, color: left }, { offset: 1, color: right }],
})

const TOOLTIP: any = {
  backgroundColor: 'rgba(15,23,42,0.92)',
  borderWidth: 0,
  padding: [8, 12],
  textStyle: { color: '#fff', fontSize: 12 },
  extraCssText: 'border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,0.25);backdrop-filter:blur(4px);',
}
const GRID = { top: 24, right: 20, bottom: 36, left: 12, containLabel: true }
const AX_LABEL = { color: '#94a3b8', fontSize: 11 }
const SPLIT = { lineStyle: { color: 'rgba(148,163,184,0.15)', type: 'dashed' as const } }
const LEGEND = (show: boolean) =>
  show ? { bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10, icon: 'roundRect',
           textStyle: { color: '#94a3b8', fontSize: 12 } } : undefined

const wrap = (option: any, height: number, className?: string) => (
  <div className={cn('w-full', className)}>
    <ReactECharts option={option} style={{ height, width: '100%' }} opts={{ renderer: 'canvas' }} notMerge />
  </div>
)

interface Row { [k: string]: string | number }
interface Series { key: string; name: string; color: string }

// ─── 1. MODERN AREA — glowing smooth line + rich gradient fill ────────────────
export function ModernArea({
  data, xKey, series, height = 300, showLegend = true, className,
}: { data: Row[]; xKey: string; series: Series[]; height?: number; showLegend?: boolean; className?: string }) {
  const option = {
    tooltip: { trigger: 'axis', ...TOOLTIP },
    legend: LEGEND(showLegend),
    grid: { ...GRID, bottom: showLegend ? 36 : 16 },
    xAxis: {
      type: 'category', boundaryGap: false, data: data.map((d) => d[xKey]),
      axisLine: { show: false }, axisTick: { show: false }, axisLabel: AX_LABEL,
    },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, axisLabel: AX_LABEL, splitLine: SPLIT },
    series: series.map((s) => ({
      name: s.name, type: 'line', smooth: true, showSymbol: false, symbolSize: 8,
      lineStyle: { width: 3, color: s.color, shadowColor: hexToRgba(s.color, 0.5), shadowBlur: 12, shadowOffsetY: 6 },
      itemStyle: { color: s.color, borderColor: '#fff', borderWidth: 2 },
      areaStyle: { color: vGrad(hexToRgba(s.color, 0.45), hexToRgba(s.color, 0.02)) },
      emphasis: { focus: 'series', scale: true },
      data: data.map((d) => d[s.key]),
    })),
  }
  return wrap(option, height, className)
}

// ─── 2. MODERN BARS — vertical gradient, rounded caps, soft shadow ────────────
export function ModernBars({
  data, xKey, series, height = 300, horizontal = false, showLegend = true, className,
}: { data: Row[]; xKey: string; series: Series[]; height?: number; horizontal?: boolean; showLegend?: boolean; className?: string }) {
  const cat = data.map((d) => d[xKey])
  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...TOOLTIP },
    legend: LEGEND(showLegend),
    grid: { ...GRID, bottom: showLegend ? 36 : 16 },
    xAxis: horizontal
      ? { type: 'value', axisLine: { show: false }, axisTick: { show: false }, axisLabel: AX_LABEL, splitLine: SPLIT }
      : { type: 'category', data: cat, axisLine: { show: false }, axisTick: { show: false }, axisLabel: AX_LABEL },
    yAxis: horizontal
      ? { type: 'category', data: cat, axisLine: { show: false }, axisTick: { show: false }, axisLabel: AX_LABEL }
      : { type: 'value', axisLine: { show: false }, axisTick: { show: false }, axisLabel: AX_LABEL, splitLine: SPLIT },
    series: series.map((s) => ({
      name: s.name, type: 'bar', barMaxWidth: 34, barGap: '20%',
      itemStyle: {
        borderRadius: horizontal ? [0, 8, 8, 0] : [8, 8, 0, 0],
        color: horizontal ? hGrad(hexToRgba(s.color, 0.55), s.color) : vGrad(s.color, hexToRgba(s.color, 0.35)),
        shadowColor: hexToRgba(s.color, 0.35), shadowBlur: 10, shadowOffsetY: 4,
      },
      emphasis: { itemStyle: { shadowBlur: 18, shadowColor: hexToRgba(s.color, 0.6) } },
      data: data.map((d) => d[s.key]),
    })),
  }
  return wrap(option, height, className)
}

// ─── 3. MODERN STACKED — rounded stacked gradient bars ────────────────────────
export function ModernStacked({
  data, xKey, series, height = 300, showLegend = true, className,
}: { data: Row[]; xKey: string; series: Series[]; height?: number; showLegend?: boolean; className?: string }) {
  const last = series.length - 1
  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...TOOLTIP },
    legend: LEGEND(showLegend),
    grid: { ...GRID, bottom: showLegend ? 36 : 16 },
    xAxis: { type: 'category', data: data.map((d) => d[xKey]), axisLine: { show: false }, axisTick: { show: false }, axisLabel: AX_LABEL },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, axisLabel: AX_LABEL, splitLine: SPLIT },
    series: series.map((s, i) => ({
      name: s.name, type: 'bar', stack: 'total', barMaxWidth: 40,
      itemStyle: {
        borderRadius: i === last ? [8, 8, 0, 0] : 0,
        color: vGrad(s.color, hexToRgba(s.color, 0.6)),
      },
      emphasis: { focus: 'series' },
      data: data.map((d) => d[s.key]),
    })),
  }
  return wrap(option, height, className)
}

// ─── 4. MODERN LINE — multi glow lines with gradient stroke ───────────────────
export function ModernLine({
  data, xKey, series, height = 300, showLegend = true, className,
}: { data: Row[]; xKey: string; series: Series[]; height?: number; showLegend?: boolean; className?: string }) {
  const option = {
    tooltip: { trigger: 'axis', ...TOOLTIP },
    legend: LEGEND(showLegend),
    grid: { ...GRID, bottom: showLegend ? 36 : 16 },
    xAxis: { type: 'category', boundaryGap: false, data: data.map((d) => d[xKey]), axisLine: { show: false }, axisTick: { show: false }, axisLabel: AX_LABEL },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, axisLabel: AX_LABEL, splitLine: SPLIT },
    series: series.map((s) => ({
      name: s.name, type: 'line', smooth: true, symbol: 'circle', symbolSize: 7, showSymbol: false,
      lineStyle: { width: 3.5, shadowColor: hexToRgba(s.color, 0.45), shadowBlur: 14, shadowOffsetY: 8, color: s.color },
      itemStyle: { color: s.color, borderColor: '#fff', borderWidth: 2 },
      emphasis: { focus: 'series', scale: 1.4 },
      data: data.map((d) => d[s.key]),
    })),
  }
  return wrap(option, height, className)
}

// ─── 5. MODERN DONUT — gradient segments, rounded, glow, center text ──────────
export function ModernDonut({
  data, height = 300, centerLabel, centerValue, className,
}: { data: { name: string; value: number; color: string }[]; height?: number; centerLabel?: string; centerValue?: string; className?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const option = {
    tooltip: { ...TOOLTIP, trigger: 'item', formatter: (p: any) => `${p.name}<br/><b>${p.value}</b> (${p.percent}%)` },
    legend: { bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10, icon: 'circle', textStyle: { color: '#94a3b8', fontSize: 12 } },
    graphic: (centerLabel || centerValue) ? [{
      type: 'group', left: 'center', top: '42%', children: [
        { type: 'text', style: { text: centerValue ?? String(total), fontSize: 24, fontWeight: 700, fill: '#94a3b8', textAlign: 'center' }, top: -12 },
        { type: 'text', style: { text: centerLabel ?? '', fontSize: 11, fill: '#94a3b8', textAlign: 'center' }, top: 16 },
      ],
    }] : undefined,
    series: [{
      type: 'pie', radius: ['58%', '80%'], center: ['50%', '45%'], avoidLabelOverlap: true,
      padAngle: 3, itemStyle: { borderRadius: 8, borderColor: 'transparent', borderWidth: 0 },
      label: { show: false },
      emphasis: { scale: true, scaleSize: 8, itemStyle: { shadowBlur: 18, shadowColor: 'rgba(0,0,0,0.25)' } },
      data: data.map((d) => ({
        name: d.name, value: d.value,
        itemStyle: { color: vGrad(d.color, hexToRgba(d.color, 0.55)), shadowColor: hexToRgba(d.color, 0.4), shadowBlur: 10 },
      })),
    }],
  }
  return wrap(option, height, className)
}

// ─── 5b. LABELED DONUT — leader-line labels (bold value + name), gap, rounded ──
// Inspired by "Order Status Overview" style: outside labels around a thick ring.
export function ModernDonutLabeled({
  data, height = 340, centerLabel, centerValue, className, showLegend = true,
}: { data: { name: string; value: number; color: string }[]; height?: number; centerLabel?: string; centerValue?: string; className?: string; showLegend?: boolean }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const option = {
    tooltip: {
      ...TOOLTIP, trigger: 'item', confine: true,
      formatter: (p: any) => `${p.marker} ${p.name}<br/><b style="font-size:13px">${typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}</b>&nbsp;&nbsp;(${p.percent}%)`,
    },
    legend: showLegend ? {
      bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10, icon: 'circle',
      textStyle: { color: '#475569', fontSize: 11 }, itemGap: 14,
    } : undefined,
    graphic: (centerLabel || centerValue) ? [{
      type: 'group', left: 'center', top: '42%', children: [
        { type: 'text', style: { text: centerValue ?? String(total), fontSize: 24, fontWeight: 800, fill: '#475569', textAlign: 'center' }, top: -14 },
        { type: 'text', style: { text: centerLabel ?? '', fontSize: 11, fill: '#94a3b8', textAlign: 'center' }, top: 16 },
      ],
    }] : undefined,
    series: [{
      type: 'pie', radius: ['46%', '66%'], center: ['50%', '50%'], avoidLabelOverlap: true,
      // minAngle guarantees near-zero slices still get a visible arc, so their leader
      // anchors fan out instead of bunching at one point (fixes lopsided data overlap).
      minAngle: 12,
      padAngle: 4, itemStyle: { borderRadius: 8 },
      label: {
        show: true, position: 'outside', lineHeight: 15, alignTo: 'labelLine', bleedMargin: 4,
        // Leader-line name is truncated so callouts never overlap; the FULL name stays in the tooltip.
        formatter: (p: any) => {
          const nm = p.name && p.name.length > 12 ? p.name.slice(0, 11).trimEnd() + '…' : p.name
          return `{val|${typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}}\n{name|${nm}}`
        },
        rich: {
          val: { fontSize: 15, fontWeight: 800 },                 // inherits segment color (per-item label color)
          name: { fontSize: 10.5, color: '#475569', fontWeight: 600, padding: [3, 0, 0, 0] },
        },
      },
      // Push any still-colliding callouts apart vertically instead of stacking them.
      labelLayout: { hideOverlap: false, moveOverlap: 'shiftY' },
      labelLine: { show: true, length: 14, length2: 16, smooth: true, lineStyle: { color: '#94a3b8', width: 1.5 } },
      emphasis: { scale: true, scaleSize: 6, itemStyle: { shadowBlur: 16, shadowColor: 'rgba(0,0,0,0.2)' } },
      data: data.map((d) => ({
        name: d.name, value: d.value,
        itemStyle: { color: d.color, shadowColor: hexToRgba(d.color, 0.35), shadowBlur: 8 },
        label: { color: d.color },   // makes the bold {val} number match the segment color
      })),
    }],
  }
  return wrap(option, height, className)
}

// ─── 5c. INFOGRAPHIC PIE — rose/petal segments + gradient + center badge ──────
// Inspired by the colourful "PIE INFOGRAPHIC" flower style.
export function InfographicPie({
  data, height = 360, centerTop = 'PIE', centerBottom = 'INFOGRAPHIC', className,
  showLegend = true, center = ['50%', '46%'], showSliceLabel = true, radius = ['30%', '80%'], rose = true,
}: {
  data: { name: string; value: number; color: string; color2?: string }[]
  height?: number; centerTop?: string; centerBottom?: string; className?: string
  showLegend?: boolean; center?: [string, string]; showSliceLabel?: boolean; radius?: [string, string]; rose?: boolean
}) {
  const option = {
    tooltip: { ...TOOLTIP, trigger: 'item', confine: true, formatter: (p: any) => `${p.name}<br/><b>${p.value}</b> (${p.percent}%)` },
    legend: showLegend ? { bottom: 0, left: 'center', icon: 'circle', itemWidth: 10, itemHeight: 10, itemGap: 14, textStyle: { color: '#94a3b8', fontSize: 11 } } : undefined,
    series: [{
      type: 'pie', roseType: rose ? 'radius' : false, radius, center, minAngle: 6,
      padAngle: 3, itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: {
        show: showSliceLabel, position: 'inside', formatter: '{d}%',
        color: '#fff', fontSize: 15, fontWeight: 800, textShadowColor: 'rgba(0,0,0,0.25)', textShadowBlur: 4,
      },
      labelLine: { show: false },
      emphasis: { scale: true, scaleSize: 10, itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.3)' } },
      data: data.map((d) => ({
        name: d.name, value: d.value,
        itemStyle: { color: vGrad(d.color, d.color2 || hexToRgba(d.color, 0.7)) },
      })),
    }],
  }
  return (
    <div className={cn('relative w-full', className)}>
      <ReactECharts option={option} style={{ height, width: '100%' }} opts={{ renderer: 'canvas' }} notMerge />
      {/* center white badge overlay (aligned to the pie center prop) */}
      <div className="absolute flex flex-col items-center justify-center pointer-events-none"
           style={{ left: center[0], top: center[1], transform: 'translate(-50%,-50%)' }}>
        <div className="rounded-full bg-[rgb(var(--bg-surface))] shadow-lg flex flex-col items-center justify-center
                        border-4 border-white"
             style={{ width: height * 0.26, height: height * 0.26, boxShadow: '0 10px 30px -8px rgba(0,0,0,0.25)' }}>
          <span className="font-extrabold text-[rgb(var(--fg-default))] leading-none"
                style={{ fontSize: height * 0.05 }}>{centerTop}</span>
          <span className="font-semibold text-[rgb(var(--fg-muted))] tracking-wide leading-tight mt-0.5"
                style={{ fontSize: height * 0.028 }}>{centerBottom}</span>
        </div>
      </div>
    </div>
  )
}

// ─── 6. MODERN RADIAL BARS — circular progress rings (polar) ──────────────────
export function ModernRadial({
  data, height = 300, className,
}: { data: { name: string; value: number; color: string }[]; height?: number; className?: string }) {
  const option = {
    tooltip: { ...TOOLTIP, formatter: (p: any) => `${p.name}: <b>${p.value}%</b>` },
    angleAxis: { max: 100, startAngle: 90, show: false },
    radiusAxis: { type: 'category', data: data.map((d) => d.name), show: false },
    polar: { radius: [28, '78%'], center: ['50%', '50%'] },
    series: [
      // track
      { type: 'bar', coordinateSystem: 'polar', roundCap: true, barGap: '-100%', z: 1,
        itemStyle: { color: 'rgba(148,163,184,0.12)' }, data: data.map(() => 100), silent: true },
      // value
      { type: 'bar', coordinateSystem: 'polar', roundCap: true, z: 2,
        data: data.map((d) => ({ value: d.value, itemStyle: { color: hGrad(hexToRgba(d.color, 0.6), d.color), shadowColor: hexToRgba(d.color, 0.5), shadowBlur: 10 } })) },
    ],
    legend: { show: true, bottom: 0, left: 'center', data: data.map((d) => d.name), textStyle: { color: '#94a3b8', fontSize: 11 }, icon: 'circle', itemWidth: 9, itemHeight: 9 },
  }
  return wrap(option, height, className)
}

// ─── 7. MODERN GAUGE — gradient arc with glow + big value ─────────────────────
export function ModernGauge({
  value, height = 240, label, from = '#6366f1', to = '#ec4899', unit = '%', className,
}: { value: number; height?: number; label?: string; from?: string; to?: string; unit?: string; className?: string }) {
  const option = {
    series: [{
      type: 'gauge', startAngle: 210, endAngle: -30, min: 0, max: 100, radius: '92%', center: ['50%', '58%'],
      progress: { show: true, width: 16, roundCap: true, itemStyle: { color: hGrad(from, to), shadowColor: hexToRgba(to, 0.5), shadowBlur: 14 } },
      pointer: { show: false },
      axisLine: { lineStyle: { width: 16, color: [[1, 'rgba(148,163,184,0.14)']] } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, anchor: { show: false },
      title: { show: !!label, offsetCenter: [0, '32%'], fontSize: 12, color: '#94a3b8', fontWeight: 500 },
      detail: { valueAnimation: true, offsetCenter: [0, '-8%'], fontSize: 30, fontWeight: 800, color: to, formatter: `{value}${unit}` },
      data: [{ value, name: label || '' }],
    }],
  }
  return wrap(option, height, className)
}
