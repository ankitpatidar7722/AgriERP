/* eslint-disable @typescript-eslint/no-explicit-any -- echarts option objects are dynamically built; typing them fully adds no safety here. */
'use client'

import ReactECharts from 'echarts-for-react'
import { cn } from '@/lib/utils'

// ─── local helpers ───────────────────────────────────────────────────────────
function shade(hex: string, amt: number): string {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  let r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt)
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b)
  return `rgb(${r},${g},${b})`
}
const vGrad = (top: string, bottom: string) => ({
  type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
  colorStops: [{ offset: 0, color: top }, { offset: 1, color: bottom }],
})
const TOOLTIP: any = {
  backgroundColor: 'rgba(15,23,42,0.92)', borderWidth: 0, padding: [8, 12],
  textStyle: { color: '#fff', fontSize: 12 },
  extraCssText: 'border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,0.25);',
}
const AX_LABEL = { color: '#94a3b8', fontSize: 11 }
const SPLIT = { lineStyle: { color: 'rgba(148,163,184,0.15)', type: 'dashed' as const } }

interface Row { [k: string]: string | number }

// ─── 1. 3D CYLINDER BARS — glossy cylinder columns (echarts pictorialBar) ─────
export function CylinderBars({
  data, xKey, valueKey, color = '#6366f1', height = 300, className,
}: { data: Row[]; xKey: string; valueKey: string; color?: string; height?: number; className?: string }) {
  const barWidth = 32
  const cats = data.map((d) => d[xKey])
  const vals = data.map((d) => d[valueKey])
  const capW: [number, number] = [barWidth, barWidth * 0.42]
  const option = {
    tooltip: { ...TOOLTIP, trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 30, right: 20, bottom: 24, left: 10, containLabel: true },
    xAxis: { type: 'category', data: cats, axisTick: { show: false }, axisLine: { show: false }, axisLabel: AX_LABEL },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, axisLabel: AX_LABEL, splitLine: SPLIT },
    series: [
      // body
      { type: 'bar', barWidth, z: 10, silent: false,
        itemStyle: { color: vGrad(shade(color, 0.22), shade(color, -0.12)) },
        label: { show: true, position: 'top', color: '#64748b', fontWeight: 700, fontSize: 12 },
        data: vals },
      // top cap (lighter ellipse)
      { type: 'pictorialBar', symbol: 'circle', symbolSize: capW, symbolOffset: [0, '-50%'],
        symbolPosition: 'end', z: 12, itemStyle: { color: shade(color, 0.32) }, data: vals },
      // bottom cap (darker ellipse)
      { type: 'pictorialBar', symbol: 'circle', symbolSize: capW, symbolOffset: [0, '50%'],
        z: 11, itemStyle: { color: shade(color, -0.18) }, data: vals },
    ],
  }
  return (
    <div className={cn('w-full', className)}>
      <ReactECharts option={option} style={{ height, width: '100%' }} opts={{ renderer: 'canvas' }} notMerge />
    </div>
  )
}

// ─── 2. 3D CYLINDER BARS (multi-color per bar) ────────────────────────────────
export function CylinderBarsMulti({
  data, xKey, valueKey, height = 300, className,
}: { data: (Row & { color: string })[]; xKey: string; valueKey: string; height?: number; className?: string }) {
  const barWidth = 30
  const cats = data.map((d) => d[xKey])
  const capW: [number, number] = [barWidth, barWidth * 0.42]
  const body = data.map((d) => ({ value: d[valueKey], itemStyle: { color: vGrad(shade(d.color, 0.22), shade(d.color, -0.12)) } }))
  const top = data.map((d) => ({ value: d[valueKey], itemStyle: { color: shade(d.color, 0.32) } }))
  const bot = data.map((d) => ({ value: d[valueKey], itemStyle: { color: shade(d.color, -0.18) } }))
  const option = {
    tooltip: { ...TOOLTIP, trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 30, right: 20, bottom: 24, left: 10, containLabel: true },
    xAxis: { type: 'category', data: cats, axisTick: { show: false }, axisLine: { show: false }, axisLabel: AX_LABEL },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, axisLabel: AX_LABEL, splitLine: SPLIT },
    series: [
      { type: 'bar', barWidth, z: 10, data: body,
        label: { show: true, position: 'top', color: '#64748b', fontWeight: 700, fontSize: 12 } },
      { type: 'pictorialBar', symbol: 'circle', symbolSize: capW, symbolOffset: [0, '-50%'], symbolPosition: 'end', z: 12, data: top },
      { type: 'pictorialBar', symbol: 'circle', symbolSize: capW, symbolOffset: [0, '50%'], z: 11, data: bot },
    ],
  }
  return (
    <div className={cn('w-full', className)}>
      <ReactECharts option={option} style={{ height, width: '100%' }} opts={{ renderer: 'canvas' }} notMerge />
    </div>
  )
}

// ─── 3. 3D PIE / DONUT — tilted conic disc with extruded depth (pure CSS) ─────
export function Pie3D({
  data, height = 320, donut = false, className,
}: { data: { name: string; value: number; color: string }[]; height?: number; donut?: boolean; className?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  let acc = 0
  const stops = data.map((d) => {
    const start = (acc / total) * 360; acc += d.value
    const end = (acc / total) * 360
    return `${d.color} ${start}deg ${end}deg`
  }).join(', ')

  const disc = Math.round(height * 0.56)
  const depth = Math.max(10, Math.round(disc * 0.13))
  const rim = Array.from({ length: depth }, (_, i) => `0 ${i + 1}px 0 rgba(15,23,42,0.28)`).join(',')

  return (
    <div className={cn('w-full flex flex-col items-center justify-center', className)} style={{ minHeight: height }}>
      <div style={{ perspective: 900 }} className="flex items-center justify-center py-3">
        <div className="relative rounded-full"
             style={{ width: disc, height: disc, transform: 'rotateX(56deg)', transformStyle: 'preserve-3d' }}>
          {/* extruded disc */}
          <div className="absolute inset-0 rounded-full"
               style={{ background: `conic-gradient(${stops})`, boxShadow: rim }} />
          {/* glossy highlight */}
          <div className="absolute inset-0 rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.35), rgba(255,255,255,0) 55%)' }} />
          {/* donut hole */}
          {donut && (
            <div className="absolute rounded-full"
                 style={{ inset: '28%', background: 'rgb(var(--bg-surface))', boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.18)' }} />
          )}
        </div>
      </div>
      {/* legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 pt-2">
        {data.map((d) => (
          <span key={d.name} className="inline-flex items-center gap-1.5 text-xs text-[rgb(var(--fg-muted))]">
            <i className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
            {d.name} <b className="text-[rgb(var(--fg-default))]">{Math.round((d.value / total) * 100)}%</b>
          </span>
        ))}
      </div>
    </div>
  )
}
