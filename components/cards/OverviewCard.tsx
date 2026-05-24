'use client'

import { memo } from 'react'

type Props = {
  total: number
  prevTotal: number
  monthLabel: string
}

function OverviewCardInner({ total, prevTotal, monthLabel }: Props) {
  const diff = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null
  const up = diff !== null && diff > 0

  return (
    <div className="card flex flex-col gap-2">
      <p className="label mb-0">Overview</p>
      <p className="text-4xl md:text-5xl font-bold text-ink leading-none tracking-tight">
        ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </p>
      <div className="flex items-center gap-2 mt-1">
        {diff !== null ? (
          <>
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full
                ${up ? 'bg-down/15 text-down' : 'bg-up/15 text-up'}`}
            >
              {up ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}%
            </span>
            <span className="text-xs text-muted">vs last month</span>
          </>
        ) : (
          <span className="text-xs text-mutedDim">{monthLabel}</span>
        )}
      </div>
    </div>
  )
}

export default memo(OverviewCardInner)
