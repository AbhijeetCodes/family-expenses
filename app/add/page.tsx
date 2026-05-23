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
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
        <Link href="/" className="text-gray-500 text-lg">←</Link>
        <h1 className="font-bold text-lg">Add Expense</h1>
      </header>
      <div className="max-w-lg mx-auto px-4 py-4">
        <ExpenseForm settings={settings} />
      </div>
      <BottomNav />
    </div>
  )
}
