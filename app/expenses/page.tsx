import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAllExpenses } from '@/lib/expenses'
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'
import BottomNav from '@/components/BottomNav'
import HistoryView from '@/components/HistoryView'

export const dynamic = 'force-dynamic'

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { month } = await searchParams
  const monthStr = month ?? format(new Date(), 'yyyy-MM')
  const monthDate = new Date(`${monthStr}-01`)
  const interval = { start: startOfMonth(monthDate), end: endOfMonth(monthDate) }

  const all = await getAllExpenses()
  const monthExpenses = all.filter(e => {
    if (!e.date) return false
    try { return isWithinInterval(parseISO(e.date), interval) } catch { return false }
  })

  return (
    <>
      <HistoryView
        monthExpenses={monthExpenses}
        monthLabel={format(monthDate, 'MMMM yyyy')}
        monthStr={monthStr}
      />
      <BottomNav />
    </>
  )
}
