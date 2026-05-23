'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

type Props = { data: { day: string; amount: number }[] }

export default function DailyTrend({ data }: Props) {
  if (!data.length) return <p className="text-center text-sm text-gray-400 py-8">No data</p>
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={d => d.replace(/^\d{4}-\d{2}-/, '')} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
          width={42}
        />
        <Tooltip
          formatter={(v: number) => [`₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 'Spent']}
          labelFormatter={l => l.replace(/^\d{4}-\d{2}-/, 'Day ')}
        />
        <Line type="monotone" dataKey="amount" stroke="#16a34a" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
