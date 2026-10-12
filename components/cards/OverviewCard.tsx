'use client'

import { memo } from 'react'
import { formatINR } from '@/lib/format'
import PaidBySplit from './PaidBySplit'

type Props = {
  total: number
  /** Previous month, same filters — full month. */
  prevTotal: number
  /**
   * What `total` is compared against: for the current month, last month's
   * spend up to the same day (a full month vs 12 days always looks like a
   * saving); for past months, last month's full total.
   */
  compareTotal: number
  monthName: string
  prevMonthName: string
  forecast: number | null   // null when not applicable (past/future month)
  daysElapsed: number
  daysInMonth: number
  paidBy: { name: string; value: number }[]
}

function OverviewCardInner({
  total, prevTotal, compareTotal, monthName, prevMonthName, forecast, daysElapsed, daysInMonth, paidBy,
}: Props) {
  const isCurrent = forecast !== null
  const diff = compareTotal > 0 ? ((total - compareTotal) / compareTotal) * 100 : null
  const more = diff !== null && diff > 0
  const delta = Math.abs(total - compareTotal)

  // Pace bar (current month only): spent so far → forecast, against a tick
  // at last month's full total.
  const scale = Math.max(total, forecast ?? 0, prevTotal)
  const pct = (n: number) => (scale > 0 ? Math.min(100, (n / scale) * 100) : 0)

  return (
    <section className="card md:p-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(200px,240px)] md:gap-8">
      <div className="min-w-0">
        <h2 className="eyebrow">Spent in {monthName}</h2>
        <p className="mt-2 text-[44px] md:text-[56px] leading-none font-semibold tracking-[-0.03em] tabular-nums text-ink">
          <span className="text-[0.55em] font-medium text-muted align-[0.32em] mr-1">₹</span>
          {formatINR(total)}
        </p>

        {diff !== null && (
          <p className="mt-3 flex items-center gap-2 flex-wrap text-sm">
            <span
              className={`inline-flex items-center gap-1 h-6 px-2 rounded-md text-xs font-semibold tabular-nums
                ${more ? 'bg-down/15 text-down' : 'bg-up/15 text-up'}`}
            >
              {more ? '▲' : '▼'} {Math.abs(diff).toFixed(0)}%
            </span>
            <span className="text-muted">
              <span className="text-ink font-medium tabular-nums">₹{formatINR(delta)}</span>
              {' '}{more ? 'more' : 'less'} than {isCurrent ? `this point in ${prevMonthName}` : prevMonthName}
            </span>
          </p>
        )}

        {forecast !== null && scale > 0 && (
          <div className="mt-6">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted">
                On pace for{' '}
                <span className="text-ink font-semibold tabular-nums">₹{formatINR(Math.round(forecast))}</span>
              </span>
              <span className="text-xs text-mutedDim tabular-nums shrink-0">Day {daysElapsed} of {daysInMonth}</span>
            </div>
            <div className="relative mt-3 h-2 rounded-full bg-well ring-1 ring-inset ring-line">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-accent/25"
                style={{ width: `${pct(forecast)}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-300 ease-crisp"
                style={{ width: `${pct(total)}%` }}
              />
              {prevTotal > 0 && (
                <div
                  className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-ink/80"
                  style={{ left: `calc(${pct(prevTotal)}% - 1px)` }}
                  aria-hidden
                />
              )}
            </div>
            <div className="mt-2.5 flex items-center gap-4 text-xs text-mutedDim flex-wrap">
              <span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-accent" />Spent</span>
              <span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-accent/30" />Forecast</span>
              {prevTotal > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <i className="w-0.5 h-3 rounded-full bg-ink/80" />
                  {prevMonthName} <span className="tabular-nums">₹{formatINR(prevTotal)}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-line pt-5 md:border-t-0 md:pt-0 md:border-l md:pl-8">
        <PaidBySplit data={paidBy} />
      </div>
    </section>
  )
}

export default memo(OverviewCardInner)
