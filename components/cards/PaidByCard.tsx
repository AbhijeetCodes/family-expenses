'use client'

import { memo } from 'react'
import { AvatarBadge, colorForString } from '../icons'

type Datum = { name: string; value: number }
type Props = { data: Datum[] }

function PaidByCardInner({ data }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const max = data.reduce((m, d) => Math.max(m, d.value), 0)

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="label mb-0">Paid By</p>
        <div className="flex -space-x-2">
          {data.slice(0, 3).map(d => (
            <AvatarBadge key={d.name} initial={d.name} size="sm" />
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-center text-sm text-mutedDim py-6">No data</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {data.map(d => {
            const pct = max > 0 ? (d.value / max) * 100 : 0
            const totalPct = total > 0 ? (d.value / total) * 100 : 0
            const color = colorForString(d.name)
            return (
              <li key={d.name} className="flex items-center gap-3">
                <span className="w-6 text-sm font-bold tabular-nums" style={{ color }}>
                  {d.name}
                </span>
                <div className="flex-1 h-2 bg-surface2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-200 ease-out"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-ink tabular-nums">
                    ₹{d.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[10px] text-mutedDim tabular-nums">{totalPct.toFixed(0)}%</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default memo(PaidByCardInner)
