import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAllExpenses } from '@/lib/expenses'
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns'
import Dashboard from '@/components/Dashboard'
import BottomNav from '@/components/BottomNav'

export const dynamic = 'force-dynamic'

function filterByMonth(expenses: Awaited<ReturnType<typeof getAllExpenses>>, monthStart: Date) {
  const interval = { start: startOfMonth(monthStart), end: endOfMonth(monthStart) }
  return expenses.filter(e => {
    if (!e.date) return false
    try { return isWithinInterval(parseISO(e.date), interval) } catch { return false }
  })
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

  const all = await getAllExpenses()
  const thisMonthExpenses = filterByMonth(all, monthDate)
  const prevMonthExpenses = filterByMonth(all, subMonths(monthDate, 1))

  return (
    <>
      <Dashboard
        thisMonthExpenses={thisMonthExpenses}
        prevMonthExpenses={prevMonthExpenses}
        monthLabel={format(monthDate, 'MMMM yyyy')}
        monthStr={monthStr}
        userName={session.user?.name?.split(' ')[0] ?? ''}
      />
      <BottomNav />
    </>
  )
}
