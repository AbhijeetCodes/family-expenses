import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getSettings } from '@/lib/settings'
import ExpenseForm from '@/components/ExpenseForm'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AddPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const settings = await getSettings()

  return (
    <div className="min-h-screen pb-24">
      <header className="page-header">
        <Link href="/" className="text-slate-400 hover:text-slate-200 text-lg w-8 h-8 flex items-center justify-center">←</Link>
        <h1 className="font-bold text-lg text-slate-100">Add Expense</h1>
      </header>
      <div className="max-w-lg mx-auto px-4 py-4">
        <ExpenseForm settings={settings} />
      </div>
      <BottomNav />
    </div>
  )
}
