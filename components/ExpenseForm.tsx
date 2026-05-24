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
    router.push('/')
    startTransition(async () => {
      try {
        if (existing) {
          await updateExpenseAction(existing.rowIndex, form)
        } else {
          await createExpenseAction(form)
        }
      } catch (err) {
        console.error('Save failed', err)
      }
      router.refresh()
    })
  }

  async function handleDelete() {
    if (!existing) return
    router.push('/expenses')
    startTransition(async () => {
      try {
        await deleteExpenseAction(existing.rowIndex)
      } catch (err) {
        console.error('Delete failed', err)
      }
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-down/10 border border-down/20 rounded-xl px-4 py-2 text-sm text-down">
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
        <input
          type="text"
          list="dl-expense-types"
          value={form.expenseType}
          onChange={e => set('expenseType', e.target.value)}
          className="input-field"
          placeholder="Grocery, Food, Health…"
          autoComplete="off"
        />
        <datalist id="dl-expense-types">
          {settings.expenseTypes.map(t => <option key={t} value={t} />)}
        </datalist>
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
        <input
          type="text"
          list="dl-apps"
          value={form.app}
          onChange={e => set('app', e.target.value)}
          className="input-field"
          placeholder="Amazon, Zomato, BB…"
          autoComplete="off"
        />
        <datalist id="dl-apps">
          {settings.apps.map(a => <option key={a} value={a} />)}
        </datalist>
      </div>

      {/* Payment Mode */}
      <div>
        <label className="label">Payment Mode (optional)</label>
        <input
          type="text"
          list="dl-payment-modes"
          value={form.paymentMode}
          onChange={e => set('paymentMode', e.target.value)}
          className="input-field"
          placeholder="UPI, Card, Cash…"
          autoComplete="off"
        />
        <datalist id="dl-payment-modes">
          {settings.paymentModes.map(m => <option key={m} value={m} />)}
        </datalist>
      </div>

      {/* One-time toggle */}
      <div className="flex items-center justify-between bg-surface2/50 border border-divider rounded-xl px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink">One-time expense</p>
          <p className="text-xs text-mutedDim">Not a recurring purchase</p>
        </div>
        <button
          type="button"
          onClick={() => set('oneTime', !form.oneTime)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${form.oneTime ? 'bg-accent' : 'bg-divider'}`}
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
                    ? 'bg-accent text-base border-accent'
                    : 'bg-surface2 text-muted border-divider hover:bg-surface2/80'}`}
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
              <p className="text-sm text-center text-muted">Delete this expense?</p>
              <button type="button" onClick={handleDelete} disabled={pending}
                className="w-full bg-down/20 text-down border border-down/30 font-semibold py-3 px-4 rounded-xl hover:bg-down/30 transition-colors disabled:opacity-50">
                {pending ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowDeleteConfirm(true)}
              className="w-full text-mutedDim hover:text-down text-sm font-medium py-2 transition-colors">
              Delete expense
            </button>
          )}
        </>
      )}
    </form>
  )
}
