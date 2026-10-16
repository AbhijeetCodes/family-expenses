import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getExpensesWithVersion } from '@/lib/expenses'
import LiveSync from '@/components/LiveSync'
import { format, subMonths } from 'date-fns'
import Dashboard from '@/components/Dashboard'
import { currentMonthStr, filterByMonth, monthStart, resolveMonth } from '@/lib/date'

export const dynamic = 'force-dynamic'

/**
 * First whitespace-separated chunk of a display name, trimmed. Safe against
 * single-word, empty, and null values — falls back to '' so the header just
 * omits the greeting rather than rendering "undefined".
 */
function firstName(fullName?: string | null): string {
  if (!fullName) return ''
  const trimmed = fullName.trim()
  if (!trimmed) return ''
  return trimmed.split(/\s+/)[0]
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { month } = await searchParams
  const monthStr = resolveMonth(month)
  const monthDate = monthStart(monthStr)
  const prevMonthStr = format(subMonths(monthDate, 1), 'yyyy-MM')

  const { data: all, version } = await getExpensesWithVersion()
  const thisMonthExpenses = filterByMonth(all, monthStr)
  const prevMonthExpenses = filterByMonth(all, prevMonthStr)
  // Two more months of history feed the month-end forecast (current month only).
  const isCurrentMonth = monthStr === currentMonthStr()
  const olderMonthExpenses = isCurrentMonth
    ? [2, 3].map(n => filterByMonth(all, format(subMonths(monthDate, n), 'yyyy-MM')))
    : []

  return (
    <>
      <Dashboard
        thisMonthExpenses={thisMonthExpenses}
        prevMonthExpenses={prevMonthExpenses}
        olderMonthExpenses={olderMonthExpenses}
        monthLabel={format(monthDate, 'MMMM yyyy')}
        monthStr={monthStr}
        userName={firstName(session.user?.name)}
      />
      <LiveSync version={version} />
    </>
  )
}
