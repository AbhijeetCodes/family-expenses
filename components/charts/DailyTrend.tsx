'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const tooltipStyle = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }

type Props = { data: { day: string; amount: number }[] }

export default function DailyTrend({ data }: Props) {
  if (!data.length) return <p className="text-center text-sm text-slate-500 py-8">No data</p>
  return (
    <ResponsiveContainer width="100%" height={190}>
      <LineChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={d => d.replace(/^\d{4}-\d{2}-/, '')}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
          width={42}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(v: number) => [`₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 'Spent']}
          labelFormatter={l => l.replace(/^\d{4}-\d{2}-/, 'Day ')}
          contentStyle={tooltipStyle}
          labelStyle={{ color: '#94a3b8' }}
          itemStyle={{ color: '#f1f5f9' }}
          cursor={{ stroke: '#334155' }}
        />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="#4ade80"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#4ade80' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
