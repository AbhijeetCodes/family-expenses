'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6']

type Props = { data: { name: string; value: number }[] }

export default function PaidByBreakdown({ data }: Props) {
  if (!data.length) return <p className="text-center text-sm text-gray-400 py-8">No data</p>
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8, top: 4, bottom: 0 }}>
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
        />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fontWeight: 600 }} width={24} />
        <Tooltip
          formatter={(v: number) => [`₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 'Spent']}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
