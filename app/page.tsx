import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAllExpenses } from '@/lib/expenses'
import { format, subMonths } from 'date-fns'
import Dashboard from '@/components/Dashboard'
import BottomNav from '@/components/BottomNav'
import { filterByMonth } from '@/lib/date'

export const dynamic = 'force-dynamic'

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
        userName={session.user?.name?.split(' ')[0] ?? ''}
      />
      <BottomNav />
    </>
  )
}
