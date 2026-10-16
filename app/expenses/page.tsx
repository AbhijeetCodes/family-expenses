import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getExpensesWithVersion } from '@/lib/expenses'
import LiveSync from '@/components/LiveSync'
import { format } from 'date-fns'
import HistoryView from '@/components/HistoryView'
import { filterByMonth, monthStart, resolveMonth } from '@/lib/date'

export const dynamic = 'force-dynamic'

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { month } = await searchParams
  const monthStr = resolveMonth(month)
  const monthDate = monthStart(monthStr)

  const { data: all, version } = await getExpensesWithVersion()
  const monthExpenses = filterByMonth(all, monthStr)

  return (
    <>
      <HistoryView
        monthExpenses={monthExpenses}
        monthLabel={format(monthDate, 'MMMM yyyy')}
        monthStr={monthStr}
      />
      <LiveSync version={version} />
    </>
  )
}
