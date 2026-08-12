'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

function grad(color: string) {
  return `linear-gradient(135deg, ${color}, ${color}b0)`
}

// ─── 1. PILL RANK BARS — horizontal rounded leaderboard bars ──────────────────
export function PillRankBars({
  data, className,
}: { data: { label: string; value: number; color: string }[]; className?: string }) {
  const max = Math.max(...data.map((d) => d.value)) || 1
  return (
    <div className={cn('space-y-3.5', className)}>
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow"
                style={{ background: grad(d.color) }}>{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[rgb(var(--fg-default))] truncate">{d.label}</span>
              <span className="text-xs font-bold text-[rgb(var(--fg-default))] tabular-nums ml-2">{d.value.toLocaleString()}</span>
            </div>
            <div className="h-3 rounded-full bg-[rgb(var(--bg-subtle))] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                   style={{ width: `${(d.value / max) * 100}%`, background: grad(d.color), boxShadow: `0 2px 8px ${d.color}66` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── 2. BADGE-TOP BARS — vertical gradient bars with floating value badge ─────
export function BadgeTopBars({
  data, height = 260, suffix = '', className,
}: { data: { label: string; value: number; color: string }[]; height?: number; suffix?: string; className?: string }) {
  const max = Math.max(...data.map((d) => d.value)) || 1
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end justify-around gap-3 pt-8 pb-7 relative" style={{ height }}>
        {data.map((d) => {
          const pct = (d.value / max) * 100
          return (
            <div key={d.label} className="relative flex-1 h-full flex flex-col justify-end items-center">
              <div className="relative w-full max-w-[48px] rounded-t-xl rounded-b-sm"
                   style={{ height: `${pct}%`, background: `linear-gradient(180deg, ${d.color}, ${d.color}99)`,
                            boxShadow: `0 -2px 12px ${d.color}55` }}>
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md text-[11px] font-bold text-white whitespace-nowrap shadow"
                      style={{ background: d.color }}>{d.value}{suffix}</span>
              </div>
              <span className="absolute -bottom-6 text-[11px] font-medium text-[rgb(var(--fg-muted))] text-center w-full truncate px-0.5">{d.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 3. STEPPED BARS — ascending colourful bars with % on top ─────────────────
export function SteppedBars({
  data, height = 260, className,
}: { data: { label: string; value: number; color: string }[]; height?: number; className?: string }) {
  const max = Math.max(...data.map((d) => d.value)) || 1
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end justify-around gap-2.5 pt-6 pb-7 relative" style={{ height }}>
        {data.map((d) => {
          const pct = (d.value / max) * 100
          return (
            <div key={d.label} className="relative flex-1 h-full flex flex-col justify-end items-center">
              <span className="text-xs font-extrabold mb-1.5 tabular-nums" style={{ color: d.color }}>{d.value}%</span>
              <div className="w-full max-w-[52px] rounded-t-lg relative overflow-hidden"
                   style={{ height: `${pct}%`, background: `linear-gradient(180deg, ${d.color}, ${d.color}80)` }}>
                <div className="absolute inset-x-0 top-0 h-1/3"
                     style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.35), transparent)' }} />
              </div>
              <span className="absolute -bottom-6 text-[11px] font-medium text-[rgb(var(--fg-muted))] text-center w-full truncate px-0.5">{d.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 4. ICON PROGRESS LIST — horizontal progress with icon + % ────────────────
export function IconProgressList({
  data, className,
}: { data: { label: string; value: number; color: string; icon: LucideIcon }[]; className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {data.map((d) => {
        const Icon = d.icon
        return (
          <div key={d.label} className="flex items-center gap-3">
            <div className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center"
                 style={{ background: `${d.color}1f`, boxShadow: `0 6px 16px -6px ${d.color}88` }}>
              <Icon className="w-4.5 h-4.5" style={{ color: d.color, width: 18, height: 18 }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[rgb(var(--fg-default))] truncate">{d.label}</span>
                <span className="text-xs font-bold text-[rgb(var(--fg-default))] tabular-nums ml-2">{d.value}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-[rgb(var(--bg-subtle))] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width: `${d.value}%`, background: grad(d.color) }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── 5. COMPARISON BARS — two-sided diverging bars (this vs last) ─────────────
export function ComparisonBars({
  data, leftLabel = 'This Year', rightLabel = 'Last Year', leftColor = '#6366f1', rightColor = '#cbd5e1', className,
}: {
  data: { label: string; left: number; right: number }[]
  leftLabel?: string; rightLabel?: string; leftColor?: string; rightColor?: string; className?: string
}) {
  const max = Math.max(...data.flatMap((d) => [d.left, d.right])) || 1
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-center gap-5 text-[11px] text-[rgb(var(--fg-muted))] mb-1">
        <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{ background: leftColor }} />{leftLabel}</span>
        <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{ background: rightColor }} />{rightLabel}</span>
      </div>
      {data.map((d) => (
        <div key={d.label}>
          <div className="text-[11px] text-center text-[rgb(var(--fg-muted))] mb-1">{d.label}</div>
          <div className="flex items-center gap-1">
            <div className="flex-1 flex justify-end">
              <div className="h-4 rounded-l-full flex items-center justify-start pl-2" style={{ width: `${(d.left / max) * 100}%`, background: grad(leftColor) }}>
                <span className="text-[10px] font-bold text-white tabular-nums">{d.left}</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="h-4 rounded-r-full flex items-center justify-end pr-2" style={{ width: `${(d.right / max) * 100}%`, background: rightColor }}>
                <span className="text-[10px] font-bold text-[rgb(var(--fg-default))] tabular-nums">{d.right}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
