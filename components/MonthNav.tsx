'use client'

import Link from 'next/link'
import { format, subMonths, addMonths } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'
import { currentMonthStr, monthStart } from '@/lib/date'
import { useCarriedHref } from '@/lib/useFilterParams'

type Props = {
  /** Route the arrows link to, e.g. '/' or '/expenses'. `?month=` is set. */
  basePath: string
  monthStr: string
  monthLabel: string
}

/**
 * ‹ Month Year › — shared by the Dashboard and History headers. The next
 * arrow is inert on the current month (no future months to look at).
 * Filters / sort / search carry over; a selected day doesn't (it belongs
 * to the month being left).
 */
export default function MonthNav({ basePath, monthStr, monthLabel }: Props) {
  const carry          = useCarriedHref()
  const monthDate      = monthStart(monthStr)
  const prevMonthStr   = format(subMonths(monthDate, 1), 'yyyy-MM')
  const nextMonthStr   = format(addMonths(monthDate, 1), 'yyyy-MM')
  const isCurrentMonth = monthStr >= currentMonthStr()

  return (
    <nav className="flex items-center gap-1" aria-label="Month">
      <Link href={carry(basePath, { month: prevMonthStr, date: null })} prefetch className="icon-btn" aria-label="Previous month">
        <ChevronLeftIcon className="w-4 h-4" />
      </Link>
      <h1 className="text-[15px] font-semibold text-ink min-w-[8.5rem] text-center tabular-nums" aria-live="polite">
        {monthLabel}
      </h1>
      {isCurrentMonth ? (
        <span className="icon-btn text-faint hover:text-faint hover:bg-transparent pointer-events-none" aria-hidden>
          <ChevronRightIcon className="w-4 h-4" />
        </span>
      ) : (
        <Link href={carry(basePath, { month: nextMonthStr, date: null })} prefetch className="icon-btn" aria-label="Next month">
          <ChevronRightIcon className="w-4 h-4" />
        </Link>
      )}
    </nav>
  )
}
