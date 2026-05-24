'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'

type Props = { data: { name: string; current: number; prev: number }[] }

const tooltipStyle = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }
const labelStyle = { color: '#94a3b8' }

export default function CategoryCompare({ data }: Props) {
  if (!data.length) return <p className="text-center text-sm text-slate-500 py-8">No data</p>
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 40 + 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
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
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          width={72}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(v: number) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          contentStyle={tooltipStyle}
          labelStyle={labelStyle}
          itemStyle={{ color: '#f1f5f9' }}
          cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
        />
        <Bar dataKey="current" fill="#4ade80" name="This month" radius={[0, 4, 4, 0]} maxBarSize={14} />
        <Bar dataKey="prev" fill="#475569" name="Last month" radius={[0, 4, 4, 0]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  )
}
