'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#4ade80','#60a5fa','#fbbf24','#f87171','#a78bfa','#fb7185','#34d399','#fb923c']
const tooltipStyle = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }

type Props = { data: { name: string; value: number }[] }

export default function CategoryPie({ data }: Props) {
  if (!data.length) return <p className="text-center text-sm text-slate-500 py-8">No data</p>
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          contentStyle={tooltipStyle}
          labelStyle={{ color: '#94a3b8' }}
          itemStyle={{ color: '#f1f5f9' }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
