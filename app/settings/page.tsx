import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getSettings, type SettingsData } from '@/lib/settings'
import BottomNav from '@/components/BottomNav'
import SettingsSection from '@/components/SettingsSection'

export const dynamic = 'force-dynamic'

const SECTIONS: { key: keyof SettingsData; label: string }[] = [
  { key: 'expenseTypes', label: 'Expense Types' },
  { key: 'paidBy',       label: 'Paid By (Family Members)' },
  { key: 'apps',         label: 'Apps / Platforms' },
  { key: 'paymentModes', label: 'Payment Modes' },
  { key: 'tags',         label: 'Tags' },
]

export default async function SettingsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const settings = await getSettings()

  return (
    <div className="min-h-screen pb-24">
      <header className="page-header">
        <h1 className="font-bold text-lg text-slate-100">Settings</h1>
      </header>
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {SECTIONS.map(s => (
          <SettingsSection key={s.key} column={s.key} label={s.label} values={settings[s.key]} />
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
