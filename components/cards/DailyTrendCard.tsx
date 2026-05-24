'use client'

import { memo } from 'react'
import DailyTrend from '../charts/DailyTrend'

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
