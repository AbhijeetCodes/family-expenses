'use client'

import { memo } from 'react'
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts'

const tooltipStyle = { backgroundColor: '#1A1D2D', border: '1px solid #262A3D', borderRadius: 8 }

type TooltipProps = {
  active?: boolean
  payload?: { payload: { day: string }; value: number }[]
  label?: string
  onSelectDay?: (day: string) => void
}

function CustomTooltip({ active, payload, label, onSelectDay }: TooltipProps) {
  if (!active || !payload?.length) return null
  const amount = payload[0].value
  const dayNum = label?.replace(/^\d{4}-\d{2}-/, 'Day ') ?? label
  return (
    <div style={{ ...tooltipStyle, padding: '10px 14px' }}>
      <p style={{ color: '#94A3B8', fontSize: 13, marginBottom: 4 }}>{dayNum}</p>
      <p style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 600 }}>
        Spent : ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </p>
      {onSelectDay && (
        <p style={{ color: '#00D689', fontSize: 11, marginTop: 6 }}>Click to filter →</p>
      )}
    </div>
  )
}

type Props = { data: { day: string; amount: number }[]; onSelectDay?: (day: string) => void }

function DailyTrendInner({ data, onSelectDay }: Props) {
  if (!data.length) return <p className="text-center text-sm text-mutedDim py-8">No data</p>
  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart
        data={data}
        margin={{ left: 0, right: 8, top: 4, bottom: 0 }}
        onClick={onSelectDay ? (chart) => { if (chart?.activeLabel) onSelectDay(chart.activeLabel) } : undefined}
        style={onSelectDay ? { cursor: 'pointer' } : undefined}
      >
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#00D689" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#00D689" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1A1D2D" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: '#64748B' }}
          tickFormatter={d => d.replace(/^\d{4}-\d{2}-/, '')}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748B' }}
          tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
          width={42}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<CustomTooltip onSelectDay={onSelectDay} />}
          cursor={{ stroke: '#262A3D' }}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#00D689"
          strokeWidth={2}
          fill="url(#trendGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#00D689' }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default memo(DailyTrendInner)
