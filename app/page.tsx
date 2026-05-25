import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAllExpenses } from '@/lib/expenses'
import { format, subMonths } from 'date-fns'
import Dashboard from '@/components/Dashboard'
import BottomNav from '@/components/BottomNav'
import { filterByMonth } from '@/lib/date'

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
  if (!session) redirect('/login')

  const { month } = await searchParams
  const monthStr = month ?? format(new Date(), 'yyyy-MM')
  const monthDate = new Date(`${monthStr}-01`)
  const prevMonthStr = format(subMonths(monthDate, 1), 'yyyy-MM')

  const all = await getAllExpenses()
  const thisMonthExpenses = filterByMonth(all, monthStr)
  const prevMonthExpenses = filterByMonth(all, prevMonthStr)

  return (
    <>
      <Dashboard
        thisMonthExpenses={thisMonthExpenses}
        prevMonthExpenses={prevMonthExpenses}
        monthLabel={format(monthDate, 'MMMM yyyy')}
        monthStr={monthStr}
        userName={firstName(session.user?.name)}
      />
      <BottomNav />
    </>
  )
}
