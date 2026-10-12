'use client'

import { memo, useMemo } from 'react'
import { AvatarBadge, colorForString } from '../icons'
import { formatINR } from '@/lib/format'

type Datum = { name: string; value: number }
type Props = { data: Datum[] }

/**
 * Who paid how much — one stacked bar plus a row per person. Lives inside
 * the Overview hero: with 2–3 family members it's a supporting fact about
 * the total, not a destination of its own.
 */
function PaidBySplitInner({ data }: Props) {
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data])

  return (
    <div>
      <h2 className="eyebrow">Paid by</h2>

      {data.length === 0 || total === 0 ? (
        <p className="mt-3 text-sm text-mutedDim">Nothing spent yet.</p>
      ) : (
        <>
          <div className="mt-3 flex h-2 gap-0.5 rounded-full overflow-hidden" aria-hidden>
            {data.map(d => (
              <div
                key={d.name}
                className="h-full transition-[flex-grow] duration-300 ease-crisp"
                style={{ flexGrow: d.value, flexBasis: 0, backgroundColor: colorForString(d.name) }}
              />
            ))}
          </div>
          <ul className="mt-4 space-y-3">
            {data.map(d => (
              <li key={d.name} className="flex items-center gap-3">
                <AvatarBadge initial={d.name} />
                <span className="text-sm text-muted truncate flex-1 min-w-0">{d.name}</span>
                <span className="text-right">
                  <span className="block text-sm font-semibold text-ink tabular-nums">₹{formatINR(d.value)}</span>
                  <span className="block text-[11px] text-mutedDim tabular-nums">{((d.value / total) * 100).toFixed(0)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default memo(PaidBySplitInner)
