'use client'

import { memo } from 'react'
import dynamic from 'next/dynamic'
import { formatINR } from '@/lib/format'

const DailyTrend = dynamic(() => import('../charts/DailyTrend'), {
  loading: () => <div className="h-full min-h-[200px] animate-pulse rounded-xl bg-surface2" />,
  ssr: false,
})

type Props = {
  data: { day: string; amount: number }[]
  /** Mean spend per elapsed day — drawn as a dashed reference line. */
  average: number
  selectedDate?: string | null
  onSelectDay?: (day: string) => void
}

function DailyTrendCardInner({ data, average, selectedDate, onSelectDay }: Props) {
  return (
    <section className="card flex flex-col">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="eyebrow">Daily spending</h2>
        {average > 0 && (
          <span className="text-xs text-mutedDim">
            avg <span className="text-muted font-medium tabular-nums">₹{formatINR(Math.round(average))}</span>/day
          </span>
        )}
      </div>
      {/* Grows to match the Category card beside it (grid rows stretch). */}
      <div className="flex-1 min-h-[200px]">
        <DailyTrend data={data} average={average} selectedDate={selectedDate} onSelectDay={onSelectDay} />
      </div>
    </section>
  )
}

export default memo(DailyTrendCardInner)
