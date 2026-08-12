'use client'

import React from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react'
import { Sparkline } from './sparkline'
import { cn } from '@/lib/utils'

// ─── Animated count-up value ───────────────────────────────────────────────────
// Accepts an already-formatted string ("50,232", "₹1.2 Cr", "94%") or a number.
// Detects the numeric core, counts up from 0 → target on mount, and preserves the
// prefix (₹), suffix (%, Cr, L, …), thousands separators and decimal places.
export function AnimatedNumber({ value, duration = 1 }: { value: string | number; duration?: number }) {
  const raw = String(value)
  const m = raw.match(/^(\D*)([\d,]*\.?\d+)(.*)$/)
  const prefix = m ? m[1] : ''
  const numStr = m ? m[2] : ''
  const suffix = m ? m[3] : ''
  const target = m ? parseFloat(numStr.replace(/,/g, '')) : NaN
  const hadComma = numStr.includes(',')
  const decimals = numStr.includes('.') ? (numStr.split('.')[1]?.length ?? 0) : 0

  const mv = useMotionValue(0)
  const text = useTransform(mv, (latest) => {
    const n = decimals ? Number(latest.toFixed(decimals)) : Math.round(latest)
    const s = hadComma || decimals ? n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : String(n)
    return `${prefix}${s}${suffix}`
  })

  React.useEffect(() => {
    if (isNaN(target)) return
    const controls = animate(mv, target, { duration, ease: 'easeOut' })
    return () => controls.stop()
  }, [target, duration, mv])

  if (isNaN(target)) return <>{raw}</>
  return <motion.span>{text}</motion.span>
}

// ─────────────────────────────────────────────────────────────────────────────
// Gorgeous chart color palettes (vibrant, modern)
// ─────────────────────────────────────────────────────────────────────────────
export const PALETTES = {
  vibrant: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'],
  ocean:   ['#0ea5e9', '#06b6d4', '#14b8a6', '#3b82f6', '#6366f1', '#22d3ee'],
  sunset:  ['#f43f5e', '#fb7185', '#f59e0b', '#fbbf24', '#ef4444', '#ec4899'],
  forest:  ['#10b981', '#22c55e', '#84cc16', '#14b8a6', '#059669', '#a3e635'],
  candy:   ['#ec4899', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#f472b6'],
  royal:   ['#7c3aed', '#6366f1', '#3b82f6', '#0ea5e9', '#8b5cf6', '#a78bfa'],
}

// Named gradient presets (135deg) using vivid hex — theme-independent, always pops
export const GRADIENTS: Record<string, string> = {
  indigo:  'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  violet:  'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
  ocean:   'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
  teal:    'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)',
  sunset:  'linear-gradient(135deg, #f97316 0%, #f43f5e 100%)',
  rose:    'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
  emerald: 'linear-gradient(135deg, #10b981 0%, #22c55e 100%)',
  amber:   'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
  sky:     'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
  midnight:'linear-gradient(135deg, #1e293b 0%, #4338ca 100%)',
  aurora:  'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f59e0b 100%)',
  deepsea: 'linear-gradient(135deg, #0f172a 0%, #0e7490 100%)',
}

type GradientKey = keyof typeof GRADIENTS

// ─────────────────────────────────────────────────────────────────────────────
// Section header with gradient accent
// ─────────────────────────────────────────────────────────────────────────────
export function SectionHead({
  eyebrow, title, subtitle,
}: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-baseline gap-2 min-w-0">
        {eyebrow && (
          <span className="text-[10px] font-semibold uppercase tracking-widest shrink-0
                           bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
            {eyebrow}
          </span>
        )}
        <h2 className="text-base md:text-lg font-extrabold tracking-tight leading-tight
                       bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">{title}</h2>
        {subtitle && <span className="text-xs text-[rgb(var(--fg-muted))] truncate">· {subtitle}</span>}
      </div>
      <div className="h-1 flex-1 min-w-[60px] rounded-full bg-gradient-to-r from-indigo-500/60 via-fuchsia-500/40 to-transparent" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Chip / trend delta
// ─────────────────────────────────────────────────────────────────────────────
function Delta({ change, light }: { change?: number; light?: boolean }) {
  if (change === undefined) return null
  const up = change >= 0
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-semibold',
      light
        ? 'bg-white/20 text-white'
        : up ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'
    )}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(change)}%
    </span>
  )
}

const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
}

// ─── Dashboard loading skeleton — shown until live data arrives (no dummy values) ───
export function DashboardSkeleton({ error }: { error?: string }) {
  const Box = ({ className = '' }: { className?: string }) => (
    <div className={cn('animate-pulse rounded-xl bg-[rgb(var(--bg-subtle))] border border-[rgb(var(--bd-default))]', className)} />
  )
  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-[rgb(var(--color-error))]/40 bg-[rgb(var(--color-error))]/10 text-[rgb(var(--color-error))] text-xs px-3 py-2">
          {error}
        </div>
      )}
      {/* hero */}
      <Box className="h-24" />
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => <Box key={i} className="h-20" />)}
      </div>
      {/* chart rows */}
      {Array.from({ length: 2 }).map((_, r) => (
        <div key={r} className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Box key={i} className="h-52" />)}
        </div>
      ))}
    </div>
  )
}

// ─── 1. GRADIENT GLOW KPI — vivid full-bleed gradient, white text, mini spark ──
export function GradientKpi({
  title, value, unit, change, icon: Icon, gradient = 'indigo', spark,
}: {
  title: string; value: string | number; unit?: string; change?: number
  icon?: LucideIcon; gradient?: GradientKey; spark?: number[]
}) {
  return (
    <motion.div {...fade}
      className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
      style={{ background: GRADIENTS[gradient] }}>
      {/* glossy blobs */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/15 blur-2xl" />
      <div className="absolute -bottom-10 -left-6 w-28 h-28 rounded-full bg-black/10 blur-2xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-white/80 uppercase tracking-wide">{title}</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-extrabold tabular-nums drop-shadow">{value}</span>
            {unit && <span className="text-sm font-semibold text-white/80">{unit}</span>}
          </div>
        </div>
        {Icon && (
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
      <div className="relative flex items-center justify-between mt-3">
        <Delta change={change} light />
        {spark && (
          <div className="w-24 opacity-90">
            <Sparkline data={spark} type="area" height={34} color="rgba(255,255,255,0.9)" showEndDot smooth />
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── 2. GLASS KPI — frosted card, colored icon badge, soft ring ────────────────
export function GlassKpi({
  title, value, unit, change, icon: Icon, accent = '#6366f1', subtitle,
}: {
  title: string; value: string | number; unit?: string; change?: number
  icon?: LucideIcon; accent?: string; subtitle?: string
}) {
  return (
    <motion.div {...fade}
      className="relative overflow-hidden rounded-lg p-3 border border-[rgb(var(--bd-default))]
                 bg-[rgb(var(--bg-surface))] shadow-sm hover:border-[rgb(var(--bd-strong))] transition-colors">
      {/* thin accent bar (top) — restrained, professional */}
      <span className="absolute top-0 left-0 h-0.5 w-full" style={{ background: accent, opacity: 0.9 }} />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-[rgb(var(--fg-muted))] uppercase tracking-wide truncate">{title}</p>
          <div className="flex items-baseline gap-1 mt-1.5">
            <span className="text-xl font-bold text-[rgb(var(--fg-default))] tabular-nums">{value}</span>
            {unit && <span className="text-xs font-semibold text-[rgb(var(--fg-muted))]">{unit}</span>}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <Delta change={change} />
            {subtitle && <span className="text-[11px] text-[rgb(var(--fg-subtle))] truncate">{subtitle}</span>}
          </div>
        </div>
        {Icon && (
          <div className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center"
               style={{ background: `${accent}1a` }}>
            <Icon className="w-4 h-4" style={{ color: accent }} />
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── 3. RING KPI — SVG circular progress + centered value ──────────────────────
export function RingKpi({
  title, percent, label, color = '#6366f1', track,
}: { title: string; percent: number; label?: string; color?: string; track?: string }) {
  const r = 42, c = 2 * Math.PI * r
  const off = c - (Math.min(100, Math.max(0, percent)) / 100) * c
  return (
    <motion.div {...fade}
      className="rounded-2xl p-5 border border-[rgb(var(--bd-default))] bg-[rgb(var(--bg-surface))] shadow-sm
                 flex flex-col items-center text-center hover:shadow-lg transition-shadow">
      <p className="text-xs font-medium text-[rgb(var(--fg-muted))] uppercase tracking-wide mb-3">{title}</p>
      <div className="relative w-[110px] h-[110px]">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <defs>
            <linearGradient id={`ring-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={color} stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9"
                  stroke={track || 'rgb(var(--bg-subtle))'} />
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" strokeLinecap="round"
                  stroke={`url(#ring-${title.replace(/\s/g, '')})`}
                  strokeDasharray={c} strokeDashoffset={off}
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-[rgb(var(--fg-default))] tabular-nums">{percent}%</span>
          {label && <span className="text-[10px] text-[rgb(var(--fg-muted))] mt-0.5">{label}</span>}
        </div>
      </div>
    </motion.div>
  )
}

// ─── 4. SPARK-FILL KPI — big value + full-width area sparkline hugging bottom ───
export function SparkFillKpi({
  title, value, unit, change, color = '#6366f1', data, icon: Icon,
}: {
  title: string; value: string | number; unit?: string; change?: number
  color?: string; data: number[]; icon?: LucideIcon
}) {
  return (
    <motion.div {...fade}
      className="relative overflow-hidden rounded-2xl border border-[rgb(var(--bd-default))]
                 bg-[rgb(var(--bg-surface))] shadow-sm hover:shadow-lg transition-shadow pt-5 px-5">
      <div className="flex items-center gap-2 mb-1">
        {Icon && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}1f` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
        )}
        <p className="text-xs font-medium text-[rgb(var(--fg-muted))] uppercase tracking-wide">{title}</p>
      </div>
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1 pb-1">
          <span className="text-3xl font-bold text-[rgb(var(--fg-default))] tabular-nums">{value}</span>
          {unit && <span className="text-sm font-medium text-[rgb(var(--fg-muted))]">{unit}</span>}
        </div>
        <div className="pb-1"><Delta change={change} /></div>
      </div>
      <div className="-mx-5 -mb-px mt-2">
        <Sparkline data={data} type="area" height={54} color={color} smooth />
      </div>
    </motion.div>
  )
}

// ─── 4b. SPARK-AREA KPI — colored value + top-right icon + bottom area wave ────
// Clean stat tile: small gray label, big COLORED value, subtle icon circle,
// and a full-width gradient area sparkline hugging the bottom edge.
export function SparkAreaKpi({
  title, value, unit, color = '#6366f1', data, icon: Icon, onClick, stats = [],
}: {
  title: string; value: string | number; unit?: string
  color?: string; data: number[]; icon?: LucideIcon; onClick?: () => void
  stats?: { k: string; v: string }[]
}) {
  return (
    <motion.div {...fade}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      style={{ background: `${color}4d` }}
      className={cn(
        // outer = the border ring (3px). Its background is a light tint of the
        // card's colour (the rotating arc rides over it).
        'group relative overflow-hidden rounded-2xl p-[3px]',
        'shadow-[0_6px_14px_-6px_rgba(15,23,42,0.30)] transition-all duration-200',
        'hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_18px_34px_-12px_rgba(15,23,42,0.42)]',
        onClick && 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[rgb(var(--color-primary))]/50',
      )}>
      {/* the pulse itself, travelling around the card border (a bright comet head + fading tail) */}
      <span aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[240%] kpi-spin"
        style={{ background: `conic-gradient(from 0deg, ${color} 0deg, ${color} 12deg, transparent 70deg, transparent 360deg)` }} />

      {/* inner surface — covers the centre so only the ring shows */}
      <div className="relative overflow-hidden rounded-[13px] bg-[rgb(var(--bg-surface))]">
        {/* subtle colored wash + top sheen */}
        <div className="pointer-events-none absolute inset-0" aria-hidden
             style={{ background: `linear-gradient(150deg, ${color}0d 0%, ${color}04 45%, transparent 100%)` }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" aria-hidden />

        <div className="relative flex items-center justify-between gap-2 px-3 pt-2.5">
          <p className="truncate text-[10px] font-bold uppercase tracking-wide text-[rgb(var(--fg-muted))]">{title}</p>
          {Icon && (
            <div className="flex size-7 shrink-0 items-center justify-center rounded-xl"
                 style={{ background: `${color}20`, color }}>
              <Icon className="size-3.5" />
            </div>
          )}
        </div>

        <div className="relative flex items-end justify-between gap-2 px-3 pb-1 pt-1">
          <span className="text-xl font-extrabold leading-none tabular-nums" style={{ color }}>
            {value}{unit && <span className="ml-0.5 text-[11px] font-bold">{unit}</span>}
          </span>
          {stats.length > 0 && (
            <div className="flex flex-col items-end gap-0.5 text-[10px] leading-tight text-[rgb(var(--fg-muted))]">
              {stats.slice(0, 2).map((s) => (
                <span key={s.k} className="whitespace-nowrap">{s.k} <strong className="text-[rgb(var(--fg-default))]">{s.v}</strong></span>
              ))}
            </div>
          )}
        </div>

        <Sparkline data={data} type="area" height={26} color={color} smooth showEndDot fullWidth className="relative block w-full" />
      </div>
    </motion.div>
  )
}

// ─── 4c. STOCK KPI CARD — title + icon chip, colored value + side metrics,
//         full-bleed gradient sparkline at the bottom (matches Stock Report analytics). ──
export function StockKpiCard({
  title, value, color = '#6366f1', icon: Icon, side = [], spark = [], delay = 0, onClick,
}: {
  title: string; value: string | number; color?: string; icon?: LucideIcon
  side?: { k: string; v: string }[]; spark?: number[]; delay?: number; onClick?: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      whileHover={{ y: -4, scale: 1.025 }}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      transition={{ type: 'spring', stiffness: 320, damping: 22, delay }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      className={cn(
        'group relative rounded-lg border border-[rgb(var(--bd-strong))] bg-[rgb(var(--bg-surface))] shadow-sm overflow-hidden hover:shadow-md',
        onClick && 'cursor-pointer'
      )}>
      {/* continuously-running gradient border — a colored highlight sweeps around the edge */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-lg"
        style={{
          padding: '1.5px',
          background: `linear-gradient(115deg, transparent 25%, ${color} 50%, transparent 75%)`,
          backgroundSize: '250% 100%',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
        animate={{ backgroundPosition: ['150% 0%', '-150% 0%'] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'linear', delay }}
      />
      {/* animated top accent bar — grows on hover */}
      <span className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 z-[1]"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}55)` }} />
      <div className="p-2.5 pb-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-[rgb(var(--fg-default))] uppercase tracking-wide truncate pr-1">{title}</span>
          {Icon && (
            <motion.span
              whileHover={{ rotate: -8, scale: 1.15 }}
              transition={{ type: 'spring', stiffness: 400, damping: 12 }}
              className="flex items-center justify-center w-6 h-6 rounded-md shrink-0" style={{ background: `${color}14`, color }}>
              <Icon className="w-3.5 h-3.5" />
            </motion.span>
          )}
        </div>
        <div className="flex items-end justify-between gap-1.5">
          <div className="text-lg font-extrabold tracking-tight leading-none transition-transform duration-300 group-hover:scale-105 origin-left tabular-nums" style={{ color }}><AnimatedNumber value={value} /></div>
          {side.length > 0 && (
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              {side.map((s, i) => (
                <div key={i} className="flex items-center gap-0.5 text-[8px] text-[rgb(var(--fg-muted))] leading-none">
                  <span>{s.k}</span>
                  <span className="font-bold text-[rgb(var(--fg-default))] tabular-nums">{s.v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {spark.length > 0 && (
        <div className="-mb-px"><Sparkline data={spark} type="area" height={26} color={color} smooth /></div>
      )}
    </motion.div>
  )
}

// ─── 5. ACCENT-TOP KPI — gradient top bar, clean minimal body ──────────────────
export function AccentKpi({
  title, value, unit, change, icon: Icon, gradient = 'ocean',
}: {
  title: string; value: string | number; unit?: string; change?: number
  icon?: LucideIcon; gradient?: GradientKey
}) {
  return (
    <motion.div {...fade}
      className="relative overflow-hidden rounded-2xl border border-[rgb(var(--bd-default))]
                 bg-[rgb(var(--bg-surface))] shadow-sm hover:shadow-lg transition-shadow">
      <div className="h-1.5 w-full" style={{ background: GRADIENTS[gradient] }} />
      <div className="p-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[rgb(var(--fg-muted))] uppercase tracking-wide">{title}</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-bold text-[rgb(var(--fg-default))] tabular-nums">{value}</span>
            {unit && <span className="text-sm font-medium text-[rgb(var(--fg-muted))]">{unit}</span>}
          </div>
          <div className="mt-3"><Delta change={change} /></div>
        </div>
        {Icon && (
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md"
               style={{ background: GRADIENTS[gradient] }}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── 6. HERO KPI — wide dark-gradient banner with big number + mini stat row ────
export function HeroKpi({
  title, value, unit, change, gradient = 'midnight', icon: Icon, stats,
}: {
  title: string; value: string | number; unit?: string; change?: number
  gradient?: GradientKey; icon?: LucideIcon
  stats: { label: string; value: string }[]
}) {
  return (
    <motion.div {...fade}
      className="relative overflow-hidden rounded-xl px-4 py-3.5 text-white shadow-lg"
      style={{ background: GRADIENTS[gradient] }}>
      <div className="absolute -top-12 -right-8 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="w-6 h-6 rounded-md bg-white/15 backdrop-blur flex items-center justify-center">
                <Icon className="w-3.5 h-3.5" />
              </div>
            )}
            <p className="text-[11px] font-medium text-white/80 uppercase tracking-wide">{title}</p>
          </div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl md:text-3xl font-extrabold tracking-tight drop-shadow tabular-nums">{value}</span>
            {unit && <span className="text-sm font-semibold text-white/70">{unit}</span>}
            <Delta change={change} light />
          </div>
        </div>
        <div className="flex items-center gap-5 md:gap-7 border-t md:border-t-0 md:border-l border-white/15 pt-2.5 md:pt-0 md:pl-6">
          {stats.map((s) => (
            <div key={s.label} className="text-left md:text-right">
              <p className="text-sm font-bold tabular-nums">{s.value}</p>
              <p className="text-[10px] text-white/70 uppercase tracking-wide mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── 7. NEON KPI — dark card with glowing neon border + big value ─────────────
export function NeonKpi({
  title, value, unit, change, icon: Icon, color = '#8b5cf6', spark,
}: {
  title: string; value: string | number; unit?: string; change?: number
  icon?: LucideIcon; color?: string; spark?: number[]
}) {
  return (
    <motion.div {...fade}
      className="relative overflow-hidden rounded-2xl p-5 text-white"
      style={{
        background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
        border: `1px solid ${color}66`,
        boxShadow: `0 0 0 1px ${color}22, 0 12px 40px -12px ${color}88, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}>
      <div className="absolute -top-10 -right-8 w-28 h-28 rounded-full blur-3xl opacity-40" style={{ background: color }} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: `${color}` }}>{title}</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-extrabold tabular-nums" style={{ textShadow: `0 0 18px ${color}88` }}>{value}</span>
            {unit && <span className="text-sm font-medium text-white/60">{unit}</span>}
          </div>
        </div>
        {Icon && (
          <div className="w-11 h-11 rounded-xl flex items-center justify-center"
               style={{ background: `${color}22`, border: `1px solid ${color}55`, boxShadow: `0 0 20px ${color}55` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        )}
      </div>
      <div className="relative flex items-center justify-between mt-3">
        <Delta change={change} light />
        {spark && <div className="w-24"><Sparkline data={spark} type="line" height={30} color={color} smooth showEndDot /></div>}
      </div>
    </motion.div>
  )
}

// ─── 8. SPLIT KPI — gradient icon panel (left) + value (right) ─────────────────
export function SplitKpi({
  title, value, unit, change, icon: Icon, gradient = 'indigo', subtitle,
}: {
  title: string; value: string | number; unit?: string; change?: number
  icon?: LucideIcon; gradient?: GradientKey; subtitle?: string
}) {
  return (
    <motion.div {...fade}
      className="relative overflow-hidden rounded-2xl border border-[rgb(var(--bd-default))]
                 bg-[rgb(var(--bg-surface))] shadow-sm hover:shadow-lg transition-shadow flex">
      <div className="w-20 shrink-0 flex items-center justify-center text-white relative overflow-hidden"
           style={{ background: GRADIENTS[gradient] }}>
        <div className="absolute -top-4 -left-4 w-16 h-16 rounded-full bg-white/15 blur-xl" />
        {Icon && <Icon className="w-7 h-7 relative" />}
      </div>
      <div className="flex-1 p-4">
        <p className="text-xs font-medium text-[rgb(var(--fg-muted))] uppercase tracking-wide">{title}</p>
        <div className="flex items-baseline gap-1 mt-1.5">
          <span className="text-2xl font-bold text-[rgb(var(--fg-default))] tabular-nums">{value}</span>
          {unit && <span className="text-sm font-medium text-[rgb(var(--fg-muted))]">{unit}</span>}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Delta change={change} />
          {subtitle && <span className="text-xs text-[rgb(var(--fg-subtle))]">{subtitle}</span>}
        </div>
      </div>
    </motion.div>
  )
}

// ─── 9. STAT BADGE KPI — centered, big gradient icon badge on top ─────────────
export function StatBadgeKpi({
  title, value, unit, change, icon: Icon, gradient = 'violet',
}: {
  title: string; value: string | number; unit?: string; change?: number
  icon?: LucideIcon; gradient?: GradientKey
}) {
  return (
    <motion.div {...fade}
      className="relative rounded-2xl border border-[rgb(var(--bd-default))] bg-[rgb(var(--bg-surface))]
                 shadow-sm hover:shadow-lg transition-shadow p-5 pt-8 text-center">
      {Icon && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
             style={{ background: GRADIENTS[gradient], boxShadow: '0 12px 26px -8px rgba(0,0,0,0.3)' }}>
          <Icon className="w-6 h-6" />
        </div>
      )}
      <p className="text-xs font-medium text-[rgb(var(--fg-muted))] uppercase tracking-wide">{title}</p>
      <div className="flex items-baseline justify-center gap-1 mt-1.5">
        <span className="text-3xl font-extrabold text-[rgb(var(--fg-default))] tabular-nums">{value}</span>
        {unit && <span className="text-sm font-medium text-[rgb(var(--fg-muted))]">{unit}</span>}
      </div>
      <div className="flex justify-center mt-2"><Delta change={change} /></div>
    </motion.div>
  )
}

// ─── 10. PROGRESS-PILL KPI — value vs target with gradient pill bar ───────────
export function ProgressPillKpi({
  title, value, target, percent, icon: Icon, gradient = 'sky',
}: {
  title: string; value: string; target: string; percent: number
  icon?: LucideIcon; gradient?: GradientKey
}) {
  return (
    <motion.div {...fade}
      className="rounded-2xl border border-[rgb(var(--bd-default))] bg-[rgb(var(--bg-surface))] shadow-sm hover:shadow-lg transition-shadow p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: GRADIENTS[gradient] }}>
              <Icon className="w-4 h-4" />
            </div>
          )}
          <p className="text-xs font-medium text-[rgb(var(--fg-muted))] uppercase tracking-wide">{title}</p>
        </div>
        <span className="text-xs font-bold" style={{ color: '#6366f1' }}>{percent}%</span>
      </div>
      <div className="flex items-baseline gap-1 mt-3">
        <span className="text-2xl font-bold text-[rgb(var(--fg-default))] tabular-nums">{value}</span>
        <span className="text-xs text-[rgb(var(--fg-subtle))]">/ {target}</span>
      </div>
      <div className="h-2.5 rounded-full bg-[rgb(var(--bg-subtle))] overflow-hidden mt-3">
        <div className="h-full rounded-full transition-all duration-700"
             style={{ width: `${Math.min(100, percent)}%`, background: GRADIENTS[gradient] }} />
      </div>
    </motion.div>
  )
}

// ─── 11. MINI-BAR KPI — value + inline mini bar chart ─────────────────────────
export function MiniBarKpi({
  title, value, unit, change, bars, color = '#6366f1',
}: {
  title: string; value: string | number; unit?: string; change?: number
  bars: number[]; color?: string
}) {
  const max = Math.max(...bars) || 1
  return (
    <motion.div {...fade}
      className="rounded-2xl border border-[rgb(var(--bd-default))] bg-[rgb(var(--bg-surface))] shadow-sm hover:shadow-lg transition-shadow p-5">
      <p className="text-xs font-medium text-[rgb(var(--fg-muted))] uppercase tracking-wide">{title}</p>
      <div className="flex items-end justify-between mt-2">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-[rgb(var(--fg-default))] tabular-nums">{value}</span>
            {unit && <span className="text-sm font-medium text-[rgb(var(--fg-muted))]">{unit}</span>}
          </div>
          <div className="mt-2"><Delta change={change} /></div>
        </div>
        <div className="flex items-end gap-1 h-12">
          {bars.map((b, i) => (
            <div key={i} className="w-1.5 rounded-full"
                 style={{ height: `${(b / max) * 100}%`, background: `linear-gradient(180deg, ${color}, ${color}70)` }} />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── 12. GAUGE-MINI KPI — value with small semicircle gauge ───────────────────
export function GaugeMiniKpi({
  title, percent, value, color = '#10b981',
}: { title: string; percent: number; value?: string; color?: string }) {
  const p = Math.min(100, Math.max(0, percent))
  return (
    <motion.div {...fade}
      className="rounded-2xl border border-[rgb(var(--bd-default))] bg-[rgb(var(--bg-surface))] shadow-sm hover:shadow-lg transition-shadow p-5
                 flex items-center gap-4">
      <div className="relative w-[92px] h-[52px] shrink-0">
        <svg viewBox="0 0 100 56" className="w-full h-full">
          <path d="M6 52 A44 44 0 0 1 94 52" fill="none" stroke="rgb(var(--bg-subtle))" strokeWidth="9" strokeLinecap="round" />
          <path d="M6 52 A44 44 0 0 1 94 52" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
                strokeDasharray={Math.PI * 44} strokeDashoffset={(1 - p / 100) * Math.PI * 44}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        </svg>
        <span className="absolute inset-x-0 bottom-0 text-center text-lg font-extrabold tabular-nums" style={{ color }}>{p}%</span>
      </div>
      <div>
        <p className="text-xs font-medium text-[rgb(var(--fg-muted))] uppercase tracking-wide">{title}</p>
        {value && <p className="text-xl font-bold text-[rgb(var(--fg-default))] mt-1 tabular-nums">{value}</p>}
      </div>
    </motion.div>
  )
}

// ─── Modern chart shell — gradient header dot + optional palette legend ─────────
export function GlowCard({
  title, subtitle, accent = '#6366f1', children, className, right,
}: {
  title?: string; subtitle?: string; accent?: string
  children: React.ReactNode; className?: string; right?: React.ReactNode
}) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl border-2 border-[rgb(var(--bd-strong))]',
      'bg-[rgb(var(--bg-surface))] shadow-sm hover:shadow-lg transition-shadow p-3',
      className
    )}>
      <div className="absolute top-0 left-0 h-full w-1 rounded-r" style={{ background: accent }} />
      {(title || right) && (
        <div className="flex items-start justify-between mb-2 pl-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shadow" style={{ background: accent, boxShadow: `0 0 10px ${accent}` }} />
            <div>
              {title && <h3 className="text-[13px] font-bold text-[rgb(var(--fg-default))] leading-tight">{title}</h3>}
              {subtitle && <p className="text-[11px] text-[rgb(var(--fg-muted))]">{subtitle}</p>}
            </div>
          </div>
          {right}
        </div>
      )}
      <div className="w-full">{children}</div>
    </div>
  )
}
