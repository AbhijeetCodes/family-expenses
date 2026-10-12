'use client'

import { memo, useMemo } from 'react'
import { CategoryGlyph, colorForString } from '../icons'
import { formatINR } from '@/lib/format'

const OTHER_THRESHOLD = 0.04 // 4% — bucket tiny slices into "Other" for clarity
const OTHER_COLOR = '#64748B'

type Row = { name: string; current: number; prev: number }
type Props = { data: Row[]; showComparison: boolean }

function bucketSmall(rows: Row[]): Row[] {
  const total = rows.reduce((s, r) => s + r.current, 0)
  if (total === 0) return rows
  const main: Row[] = []
  let otherCurr = 0
  let otherPrev = 0
  for (const r of rows) {
    // A real "Other" category (or blank types, which the dashboard labels
    // "Other") joins the bucket — two "Other" rows would share a React key.
    if (r.name === 'Other' || r.current / total < OTHER_THRESHOLD) {
      otherCurr += r.current
      otherPrev += r.prev
    } else {
      main.push(r)
    }
  }
  if (otherCurr > 0 || otherPrev > 0) main.push({ name: 'Other', current: otherCurr, prev: otherPrev })
  return main
}

function CategoryBarsInner({ data, showComparison }: Props) {
  // Single pass — bucket tiny slices, accumulate total + max — avoids two
  // dependent useMemo recomputes when rows changes.
  const { rows, total, max } = useMemo(() => {
    const rows = bucketSmall(data)
    let total = 0
    let max = 1
    for (const r of rows) {
      total += r.current
      if (r.current > max) max = r.current
    }
    return { rows, total, max }
  }, [data])

  if (!rows.length || total === 0) {
    return <p className="text-sm text-mutedDim py-6">No spending matches these filters.</p>
  }

  return (
    <ul className="space-y-3.5">
      {rows.map(r => {
        const color = r.name === 'Other' ? OTHER_COLOR : colorForString(r.name)
        const width = (r.current / max) * 100
        const proportion = total > 0 ? (r.current / total) * 100 : 0
        const delta = r.prev > 0 ? ((r.current - r.prev) / r.prev) * 100 : null
        return (
          <li key={r.name} className="grid grid-cols-[36px_minmax(0,1fr)] gap-x-3 items-center">
            <span
              className="row-span-2 w-9 h-9 rounded-[10px] flex items-center justify-center"
              style={{ backgroundColor: `${color}1f`, color }}
              aria-hidden
            >
              <CategoryGlyph category={r.name} className="w-[18px] h-[18px]" />
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-ink truncate flex-1 min-w-0">{r.name}</span>
              <span className="text-sm font-semibold text-ink tabular-nums">₹{formatINR(Math.round(r.current))}</span>
              {showComparison ? (
                delta === null ? (
                  <span className="w-11 text-right text-[11px] text-mutedDim">new</span>
                ) : (
                  <span
                    className={`w-11 text-right text-[11px] font-semibold tabular-nums ${
                      delta > 0 ? 'text-down' : delta < 0 ? 'text-up' : 'text-mutedDim'
                    }`}
                  >
                    {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
                  </span>
                )
              ) : (
                <span className="w-11 text-right text-[11px] text-mutedDim tabular-nums">
                  {proportion.toFixed(0)}%
                </span>
              )}
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-well overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-300 ease-crisp"
                style={{ width: `${width}%`, backgroundColor: color }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default memo(CategoryBarsInner)
