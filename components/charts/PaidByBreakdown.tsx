'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#4ade80','#60a5fa','#fbbf24','#f87171','#a78bfa']
const tooltipStyle = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }

type Props = { data: { name: string; value: number }[] }

export default function PaidByBreakdown({ data }: Props) {
  if (!data.length) return <p className="text-center text-sm text-slate-500 py-8">No data</p>
  return (
    <ResponsiveContainer width="100%" height={Math.max(100, data.length * 52)}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 0 }}>
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 14, fontWeight: 600, fill: '#94a3b8' }}
          width={24}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(v: number) => [`₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 'Spent']}
          contentStyle={tooltipStyle}
          labelStyle={{ color: '#94a3b8' }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={18}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
