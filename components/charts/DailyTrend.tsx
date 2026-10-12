'use client'

import { memo, useMemo, useState } from 'react'
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Bar, BarChart, Cell, ReferenceLine } from 'recharts'
import { format, parseISO } from 'date-fns'
import { formatINR } from '@/lib/format'

// Recharts takes literal colors — these mirror tailwind.config.ts tokens.
const C = {
  accent: '#00D689',
  surface2: '#252836',
  line: 'rgba(255,255,255,0.06)',
  ink: '#FFFFFF',
  muted: '#94A3B8',
  mutedDim: '#64748B',
}

type TooltipProps = {
  active?: boolean
  payload?: { payload: { day: string }; value: number }[]
  label?: string
  clickable?: boolean
}

function CustomTooltip({ active, payload, label, clickable }: TooltipProps) {
  if (!active || !payload?.length || !label) return null
  const amount = payload[0].value
  return (
    <div style={{ background: C.surface2, borderRadius: 10, padding: '8px 12px', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 12px 32px -8px rgba(0,0,0,0.6)' }}>
      <p style={{ color: C.muted, fontSize: 12 }}>{format(parseISO(label), 'EEE, d MMM')}</p>
      <p style={{ color: C.ink, fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
        ₹{formatINR(amount)}
      </p>
      {clickable && amount > 0 && (
        <p style={{ color: C.mutedDim, fontSize: 11, marginTop: 4 }}>Click to see that day</p>
      )}
    </div>
  )
}

type Props = {
  /** One entry per day of the month, zero-filled. */
  data: { day: string; amount: number }[]
  average: number
  selectedDate?: string | null
  onSelectDay?: (day: string) => void
}

/**
 * One huge day (rent on the 1st) flattens every other bar into the axis. When
 * the biggest day is > 2.5× the next, cap the axis just above the runner-up
 * and label the clipped bar with its real value instead.
 */
function outlierCap(data: { amount: number }[]): number | null {
  const vals = data.map(d => d.amount).filter(v => v > 0).sort((a, b) => b - a)
  if (vals.length < 4) return null
  return vals[0] > vals[1] * 2.5 ? Math.ceil(vals[1] * 1.3) : null
}

const PLOT_TOP = 14

type ClipLabelProps = { x?: number; y?: number; width?: number; value?: number }

function DailyTrendInner({ data, average, selectedDate, onSelectDay }: Props) {
  const [hover, setHover] = useState<string | null>(null)
  const cap = useMemo(() => outlierCap(data), [data])

  const clipLabel = ({ x = 0, width = 0, value = 0 }: ClipLabelProps) => {
    if (cap === null || value <= cap) return <g />
    const text = value >= 1000 ? `₹${Math.round(value / 1000)}k` : `₹${value}`
    return (
      <g>
        {/* break marks across the bar top: "this keeps going" */}
        <path d={`M${x - 2} ${PLOT_TOP + 7}l${width + 4} -4M${x - 2} ${PLOT_TOP + 11}l${width + 4} -4`} stroke="#1A1D2D" strokeWidth={2} />
        <text x={x + width + 4} y={PLOT_TOP + 8} fill={C.muted} fontSize={11} fontWeight={600}>{text}</text>
      </g>
    )
  }
  if (!data.some(d => d.amount > 0)) {
    return <p className="text-sm text-mutedDim py-6">No spending matches these filters.</p>
  }
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
      <BarChart
        data={data}
        margin={{ left: 0, right: 0, top: PLOT_TOP, bottom: 0 }}
        barCategoryGap="22%"
        // Click is wired to the chart, not the tooltip — Recharts moves the
        // tooltip away from the cursor, so it can't be clicked in practice.
        onClick={onSelectDay ? (chart) => {
          const day = chart?.activeLabel
          if (day && data.find(d => d.day === day)?.amount) onSelectDay(day)
        } : undefined}
        onMouseMove={(s) => setHover(s?.activeLabel ?? null)}
        onMouseLeave={() => setHover(null)}
        style={onSelectDay ? { cursor: 'pointer' } : undefined}
      >
        <CartesianGrid vertical={false} stroke={C.line} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: C.mutedDim }}
          tickFormatter={d => String(Number(d.slice(8)))}
          interval="preserveStartEnd"
          minTickGap={12}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: C.mutedDim }}
          tickFormatter={v => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)}
          width={44}
          axisLine={false}
          tickLine={false}
          domain={cap !== null ? [0, cap] : [0, 'auto']}
          allowDataOverflow={cap !== null}
        />
        <Tooltip content={<CustomTooltip clickable={!!onSelectDay} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        {average > 0 && (
          <ReferenceLine y={average} stroke={C.muted} strokeOpacity={0.5} strokeDasharray="3 4" ifOverflow="hidden" />
        )}
        <Bar dataKey="amount" radius={[3, 3, 0, 0]} isAnimationActive={false} label={clipLabel}>
          {data.map(d => {
            const focused = d.day === selectedDate || d.day === hover
            const dimmed = !!selectedDate && d.day !== selectedDate
            return (
              <Cell
                key={d.day}
                fill={C.accent}
                fillOpacity={focused ? 1 : dimmed ? 0.25 : 0.6}
              />
            )
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default memo(DailyTrendInner)
