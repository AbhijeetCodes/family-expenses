'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import type { Expense } from '@/lib/expenses'
import type { SettingsData } from '@/lib/settings'
import { createExpenseAction, updateExpenseAction, deleteExpenseAction } from '@/app/actions'

type Props = {
  settings: SettingsData
  existing?: Expense
}

const emptyForm = (): Omit<Expense, 'rowIndex'> => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  expenseType: '',
  app: '',
  paymentMode: '',
  name: '',
  cost: 0,
  paidBy: '',
  oneTime: true,
  tags: [],
})

export default function ExpenseForm({ settings, existing }: Props) {
  const [form, setForm] = useState<Omit<Expense, 'rowIndex'>>(
    existing ? { ...existing } : emptyForm()
  )
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const router = useRouter()

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  function toggleTag(tag: string) {
    set('tags', form.tags.includes(tag) ? form.tags.filter(t => t !== tag) : [...form.tags, tag])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Name is required')
    if (!form.cost || form.cost <= 0) return setError('Enter a valid cost')
    if (!form.paidBy) return setError('Select who paid')
    setError('')
    startTransition(async () => {
      if (existing) {
        await updateExpenseAction(existing.rowIndex, form)
      } else {
        await createExpenseAction(form)
      }
      router.push('/')
    })
  }

  async function handleDelete() {
    if (!existing) return
    startTransition(async () => {
      await deleteExpenseAction(existing.rowIndex)
      router.push('/expenses')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Date */}
      <div>
        <label className="label">Date</label>
        <input
          type="date"
          value={form.date}
          onChange={e => set('date', e.target.value)}
          className="input-field"
          required
        />
      </div>

      {/* Name */}
      <div>
        <label className="label">What was purchased</label>
        <input
          type="text"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Dinner, Groceries, Electricity bill"
          className="input-field"
        />
      </div>

      {/* Cost */}
      <div>
        <label className="label">Cost (₹)</label>
        <input
          type="number"
          inputMode="decimal"
          value={form.cost || ''}
          onChange={e => set('cost', parseFloat(e.target.value) || 0)}
          placeholder="0"
          className="input-field text-lg font-semibold"
        />
      </div>

      {/* Expense Type */}
      <div>
        <label className="label">Expense Type</label>
        <select value={form.expenseType} onChange={e => set('expenseType', e.target.value)} className="input-field">
          <option value="">Select type</option>
          {settings.expenseTypes.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Paid By */}
      <div>
        <label className="label">Paid By</label>
        <select value={form.paidBy} onChange={e => set('paidBy', e.target.value)} className="input-field" required>
          <option value="">Select person</option>
          {settings.paidBy.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* App */}
      <div>
        <label className="label">App / Platform (optional)</label>
        <select value={form.app} onChange={e => set('app', e.target.value)} className="input-field">
          <option value="">None</option>
          {settings.apps.map(a => <option key={a}>{a}</option>)}
        </select>
      </div>

      {/* Payment Mode */}
      <div>
        <label className="label">Payment Mode (optional)</label>
        <select value={form.paymentMode} onChange={e => set('paymentMode', e.target.value)} className="input-field">
          <option value="">Select mode</option>
          {settings.paymentModes.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>

      {/* One-time toggle */}
      <div className="flex items-center justify-between bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3">
        <div>
          <p className="text-sm font-medium text-slate-200">One-time expense</p>
          <p className="text-xs text-slate-500">Not a recurring purchase</p>
        </div>
        <button
          type="button"
          onClick={() => set('oneTime', !form.oneTime)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${form.oneTime ? 'bg-brand-600' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform
            ${form.oneTime ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Tags */}
      {settings.tags.length > 0 && (
        <div>
          <label className="label">Tags (optional)</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {settings.tags.map(tag => (
              <button
                type="button"
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
                  ${form.tags.includes(tag)
                    ? 'bg-green-500 text-slate-900 border-green-500'
                    : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'}`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <button type="submit" disabled={pending} className="btn-primary mt-6">
        {pending ? 'Saving…' : existing ? 'Update Expense' : 'Add Expense'}
      </button>

      {existing && (
        <>
          {showDeleteConfirm ? (
            <div className="space-y-2">
              <p className="text-sm text-center text-slate-400">Delete this expense?</p>
              <button type="button" onClick={handleDelete} disabled={pending}
                className="w-full bg-red-500/20 text-red-400 border border-red-500/30 font-semibold py-3 px-4 rounded-xl hover:bg-red-500/30 transition-colors disabled:opacity-50">
                {pending ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowDeleteConfirm(true)}
              className="w-full text-slate-600 hover:text-red-400 text-sm font-medium py-2 transition-colors">
              Delete expense
            </button>
          )}
        </>
      )}
    </form>
  )
}
