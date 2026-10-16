import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getSettings } from '@/lib/settings'
import ExpenseForm from '@/components/ExpenseForm'
import Link from 'next/link'
import { ChevronLeftIcon } from '@/components/icons'

export const dynamic = 'force-dynamic'

export default async function AddPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const settings = await getSettings()

  return (
    <div className="min-h-screen pb-nav">
      <header className="page-header">
        <div className="page-header-row">
          <Link href="/" className="icon-btn" aria-label="Back to dashboard"><ChevronLeftIcon className="w-5 h-5" /></Link>
          <h1 className="text-[17px] font-semibold text-ink">Add expense</h1>
        </div>
      </header>
      <div className="max-w-lg mx-auto px-4 py-5">
        <ExpenseForm settings={settings} />
      </div>
    </div>
  )
}
