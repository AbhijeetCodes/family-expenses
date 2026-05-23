import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getAllExpenses } from '@/lib/expenses'
import { getSettings } from '@/lib/settings'
import ExpenseForm from '@/components/ExpenseForm'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function EditExpensePage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) redirect('/login')

  const rowIndex = parseInt((await params).id)
  if (isNaN(rowIndex)) notFound()

  const [all, settings] = await Promise.all([getAllExpenses(), getSettings()])
  const expense = all.find(e => e.rowIndex === rowIndex)
  if (!expense) notFound()

  return (
    <div className="min-h-screen pb-24">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
        <Link href="/expenses" className="text-gray-500 text-lg">←</Link>
        <h1 className="font-bold text-lg">Edit Expense</h1>
      </header>
      <div className="max-w-lg mx-auto px-4 py-4">
        <ExpenseForm settings={settings} existing={expense} />
      </div>
      <BottomNav />
    </div>
  )
}
