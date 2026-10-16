import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getSettings, type SettingsData } from '@/lib/settings'
import SettingsSection from '@/components/SettingsSection'
import SignOutButton from '@/components/SignOutButton'
import Link from 'next/link'
import { ChevronLeftIcon } from '@/components/icons'

export const dynamic = 'force-dynamic'

const SECTIONS: { key: keyof SettingsData; label: string; hint: string }[] = [
  { key: 'paidBy',       label: 'Family members',  hint: 'Who can be picked under “Paid by”.' },
  { key: 'expenseTypes', label: 'Expense types',   hint: 'New types typed in the add form land here too.' },
  { key: 'apps',         label: 'Apps / platforms', hint: 'Suggestions for the App field.' },
  { key: 'paymentModes', label: 'Payment modes',   hint: 'Suggestions for the Payment mode field.' },
  { key: 'tags',         label: 'Tags',            hint: 'Optional labels you can toggle on an expense.' },
]

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const settings = await getSettings()

  return (
    <div className="min-h-screen pb-nav">
      <header className="page-header">
        <div className="page-header-row px-4 lg:px-2">
          <Link href="/" className="icon-btn hidden lg:inline-flex" aria-label="Back to dashboard"><ChevronLeftIcon className="w-5 h-5" /></Link>
          <h1 className="text-[17px] font-semibold text-ink">Settings</h1>
        </div>
      </header>
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {SECTIONS.map(s => (
          <SettingsSection key={s.key} column={s.key} label={s.label} hint={s.hint} values={settings[s.key]} />
        ))}
        <div className="card flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">Account</h2>
            <p className="text-xs text-mutedDim mt-0.5 truncate">{session.user?.email}</p>
          </div>
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
