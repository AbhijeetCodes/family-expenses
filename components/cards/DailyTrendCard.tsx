'use client'

import { memo } from 'react'
import dynamic from 'next/dynamic'

const DailyTrend = dynamic(() => import('../charts/DailyTrend'), {
  loading: () => <div className="h-[190px] animate-pulse rounded-xl bg-surface2" />,
  ssr: false,
})

type Props = { data: { day: string; amount: number }[] }

function DailyTrendCardInner({ data }: Props) {
  return (
    <div className="card flex flex-col">
      <p className="label mb-2">Daily Spending</p>
      <DailyTrend data={data} />
    </div>
  )
}

export default memo(DailyTrendCardInner)
