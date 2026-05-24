'use client'

import { memo, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { colorForString } from '../icons'

const tooltipStyle = { backgroundColor: '#1A1D2D', border: '1px solid #262A3D', borderRadius: 8 }
const OTHER_THRESHOLD = 0.04 // 4%

type Props = { data: { name: string; value: number }[] }

function bucketSmallSlices(data: { name: string; value: number }[]) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return data
  const main: typeof data = []
  let otherSum = 0
  for (const d of data) {
    if (d.value / total < OTHER_THRESHOLD) otherSum += d.value
    else main.push(d)
  }
  if (otherSum > 0) main.push({ name: 'Other', value: otherSum })
  return main
}

function CategoryPieInner({ data }: Props) {
  const bucketed = useMemo(() => bucketSmallSlices(data), [data])
  if (!bucketed.length) return <p className="text-center text-sm text-mutedDim py-8">No data</p>

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={bucketed}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
          isAnimationActive={false}
        >
          {bucketed.map((d, i) => (
            <Cell key={d.name} fill={d.name === 'Other' ? '#64748B' : colorForString(d.name)} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          contentStyle={tooltipStyle}
          labelStyle={{ color: '#94A3B8' }}
          itemStyle={{ color: '#FFFFFF' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: '#94A3B8' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default memo(CategoryPieInner)
