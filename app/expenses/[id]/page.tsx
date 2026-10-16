import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getAllExpenses } from '@/lib/expenses'
import { getSettings } from '@/lib/settings'
import ExpenseForm from '@/components/ExpenseForm'
import Link from 'next/link'
import { ChevronLeftIcon } from '@/components/icons'

export const dynamic = 'force-dynamic'

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const rowIndex = Number(id)
  if (!Number.isInteger(rowIndex) || rowIndex < 2) notFound()

  const [all, settings] = await Promise.all([getAllExpenses(), getSettings()])
  const expense = all.find(e => e.rowIndex === rowIndex)
  if (!expense) notFound()

  return (
    <div className="min-h-screen pb-nav">
      <header className="page-header">
        <div className="page-header-row">
          <Link href="/expenses" className="icon-btn" aria-label="Back to history"><ChevronLeftIcon className="w-5 h-5" /></Link>
          <h1 className="text-[17px] font-semibold text-ink">Edit expense</h1>
        </div>
      </header>
      <div className="max-w-lg mx-auto px-4 py-5">
        <ExpenseForm settings={settings} existing={expense} />
      </div>
    </div>
  )
}
