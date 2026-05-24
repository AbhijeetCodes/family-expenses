'use client'

import { memo, useMemo } from 'react'
import { CategoryGlyph, colorForString } from '../icons'

const OTHER_THRESHOLD = 0.04 // 4% — bucket tiny slices into "Other" for clarity

type Row = { name: string; current: number; prev: number }
type Props = { data: Row[]; showComparison: boolean }

function bucketSmall(rows: Row[]): Row[] {
  const total = rows.reduce((s, r) => s + r.current, 0)
  if (total === 0) return rows
  const main: Row[] = []
  let otherCurr = 0
  let otherPrev = 0
  for (const r of rows) {
    if (r.current / total < OTHER_THRESHOLD) {
      otherCurr += r.current
      otherPrev += r.prev
    } else {
      main.push(r)
    }
  }
  if (otherCurr > 0 || otherPrev > 0) main.push({ name: 'Other', current: otherCurr, prev: otherPrev })
  return main
}

function fmt(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function CategoryBarsInner({ data, showComparison }: Props) {
  const rows = useMemo(() => bucketSmall(data), [data])
  const total = useMemo(() => rows.reduce((s, r) => s + r.current, 0), [rows])
  const max = useMemo(() => Math.max(1, ...rows.map(r => r.current)), [rows])

  if (!rows.length || total === 0) {
    return <p className="text-center text-sm text-mutedDim py-8">No data</p>
  }

  return (
    <ul className="space-y-2.5">
      {rows.map(r => {
        const color = r.name === 'Other' ? '#64748B' : colorForString(r.name)
        const width = (r.current / max) * 100
        const proportion = total > 0 ? (r.current / total) * 100 : 0
        const hasPrev = r.prev > 0
        const delta = hasPrev ? ((r.current - r.prev) / r.prev) * 100 : null
        return (
          <li key={r.name} className="flex items-center gap-2.5">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${color}26`, color }}
            >
              <CategoryGlyph category={r.name} className="w-4 h-4" />
            </span>
            <span className="text-sm text-ink w-20 truncate shrink-0">{r.name}</span>
            <div className="flex-1 h-2 rounded-full bg-surface2 overflow-hidden min-w-[24px]">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{ width: `${width}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-xs text-ink tabular-nums shrink-0 w-16 text-right">{fmt(r.current)}</span>
            {showComparison ? (
              delta === null ? (
                <span className="text-[10px] text-mutedDim w-12 text-right shrink-0">new</span>
              ) : (
                <span
                  className={`text-[10px] tabular-nums font-medium px-1.5 py-0.5 rounded-md shrink-0 w-12 text-center ${
                    delta > 0
                      ? 'bg-down/15 text-down'
                      : delta < 0
                      ? 'bg-up/15 text-up'
                      : 'bg-surface2 text-mutedDim'
                  }`}
                >
                  {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
                </span>
              )
            ) : (
              <span className="text-[10px] text-mutedDim tabular-nums w-10 text-right shrink-0">
                {proportion.toFixed(0)}%
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default memo(CategoryBarsInner)
