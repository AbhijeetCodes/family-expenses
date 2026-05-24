'use client'

import { memo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'

const tooltipStyle = { backgroundColor: '#1A1D2D', border: '1px solid #262A3D', borderRadius: 8 }
const labelStyle = { color: '#94A3B8' }

type Props = { data: { name: string; current: number; prev: number }[] }

function CategoryCompareInner({ data }: Props) {
  if (!data.length) return <p className="text-center text-sm text-mutedDim py-8">No data</p>
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 40 + 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262A3D" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#64748B' }}
          tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12, fill: '#94A3B8' }}
          width={72}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(v: number) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          contentStyle={tooltipStyle}
          labelStyle={labelStyle}
          itemStyle={{ color: '#FFFFFF' }}
          cursor={{ fill: 'rgba(148, 163, 184, 0.06)' }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
        <Bar dataKey="current" fill="#00D689" name="This month" radius={[0, 4, 4, 0]} maxBarSize={14} isAnimationActive={false} />
        <Bar dataKey="prev"    fill="#475569" name="Last month" radius={[0, 4, 4, 0]} maxBarSize={14} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default memo(CategoryCompareInner)
