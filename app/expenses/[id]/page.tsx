import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getAllExpenses } from '@/lib/expenses'
import { getSettings } from '@/lib/settings'
import ExpenseForm from '@/components/ExpenseForm'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params
  const rowIndex = parseInt(id)
  if (isNaN(rowIndex)) notFound()

  const [all, settings] = await Promise.all([getAllExpenses(), getSettings()])
  const expense = all.find(e => e.rowIndex === rowIndex)
  if (!expense) notFound()

  return (
    <div className="min-h-screen pb-24">
      <header className="page-header">
        <Link href="/expenses" className="text-slate-400 hover:text-slate-200 text-lg w-8 h-8 flex items-center justify-center">←</Link>
        <h1 className="font-bold text-lg text-slate-100">Edit Expense</h1>
      </header>
      <div className="max-w-lg mx-auto px-4 py-4">
        <ExpenseForm settings={settings} existing={expense} />
      </div>
      <BottomNav />
    </div>
  )
}
