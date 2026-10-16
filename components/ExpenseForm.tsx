'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Expense } from '@/lib/expenses'
import type { SettingsData } from '@/lib/settings'
import { createExpenseAction, updateExpenseAction, deleteExpenseAction } from '@/app/actions'
import { format, parseISO, isValid } from 'date-fns'
import { CheckIcon, ChevronDownIcon } from './icons'
import { todayISO, yesterdayISO } from '@/lib/date'

type Props = {
  settings: SettingsData
  existing?: Expense
}

const emptyForm = (): Omit<Expense, 'rowIndex'> => ({
  date: todayISO(),
  expenseType: '',
  app: '',
  paymentMode: '',
  name: '',
  cost: 0,
  paidBy: '',
  oneTime: false,
  tags: [],
})

/** Settings list plus anything the expense already has (e.g. typed in the sheet), so it stays visible and removable. */
function withExtras(list: string[], extras: string[]): string[] {
  const missing = extras.filter(x => x && !list.includes(x))
  return missing.length ? [...list, ...missing] : list
}

export default function ExpenseForm({ settings, existing }: Props) {
  const [form, setForm] = useState<Omit<Expense, 'rowIndex'>>(() => {
    if (!existing) return emptyForm()
    const { rowIndex: _, ...rest } = existing
    return rest
  })
  // The amount field keeps its own text: deriving it from the number turned
  // "0" / "0." back into "" and made amounts below ₹1 impossible to type.
  const [costText, setCostText] = useState(existing?.cost ? String(existing.cost) : '')
  const paidByOptions = withExtras(settings.paidBy, existing ? [existing.paidBy] : [])
  const tagOptions = withExtras(settings.tags, existing?.tags ?? [])
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  // Set when an add failed with no answer: it may have landed anyway, so the
  // retry asks the server to check for it first instead of adding a duplicate.
  const addMayHaveLanded = useRef(false)
  const router = useRouter()

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  function toggleTag(tag: string) {
    set('tags', form.tags.includes(tag) ? form.tags.filter(t => t !== tag) : [...form.tags, tag])
  }

  // Compute which freeform lookup values are NEW (not already in settings) —
  // case-insensitive. Only the new ones get sent to promoteLookupValues, so
  // datalist picks (the common case) skip the Settings read+write entirely.
  function computeNewLookups() {
    const has = (list: string[], v: string) =>
      !v || list.some(x => x.toLowerCase() === v.toLowerCase())
    return {
      expenseType: has(settings.expenseTypes, form.expenseType) ? undefined : form.expenseType,
      app:         has(settings.apps,         form.app)         ? undefined : form.app,
      paymentMode: has(settings.paymentModes, form.paymentMode) ? undefined : form.paymentMode,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.cost || form.cost <= 0) return setError('Enter an amount above ₹0')
    if (!form.name.trim()) return setError('Add what it was for')
    if (!form.paidBy) return setError('Choose who paid')
    setError('')
    const newLookups = computeNewLookups()
    // Await the action BEFORE navigating: yes, costs ~300ms of "Saving…"
    // perceived latency, but eliminates the "land on stale dashboard then it
    // pops" flash the old fire-and-navigate flow created.
    startTransition(async () => {
      try {
        if (existing) {
          const { rowIndex, ...original } = existing
          const res = await updateExpenseAction(rowIndex, original, form, newLookups)
          if (res.error) return setError(res.error)
        } else {
          await createExpenseAction(form, newLookups, addMayHaveLanded.current)
        }
        // refresh() first: it clears the client router cache, so the push
        // below can't land on a cached (pre-save) dashboard.
        router.refresh()
        router.push('/')
      } catch (err) {
        if (!existing) addMayHaveLanded.current = true
        console.error('Save failed', err)
        setError('Couldn’t save. Check your connection and try again.')
      }
    })
  }

  async function handleDelete() {
    if (!existing) return
    startTransition(async () => {
      try {
        const { rowIndex, ...original } = existing
        const res = await deleteExpenseAction(rowIndex, original)
        if (res.error) {
          setError(res.error)
          setShowDeleteConfirm(false)
          return
        }
        router.refresh()
        router.push('/expenses')
      } catch (err) {
        console.error('Delete failed', err)
        setError('Couldn’t delete. Try again.')
        setShowDeleteConfirm(false)
      }
    })
  }

  const today     = todayISO()
  const yesterday = yesterdayISO()

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Amount leads: it's the one thing every entry must get right. */}
      <div className="card !p-0 overflow-hidden">
        <label htmlFor="cost" className="label px-4 pt-4 !mb-0">Amount</label>
        <div className="flex items-baseline gap-1 px-4 pb-3 pt-1">
          <span className="text-3xl font-medium text-muted" aria-hidden>₹</span>
          <input
            id="cost"
            type="number"
            inputMode="decimal"
            value={costText}
            onChange={e => {
              setCostText(e.target.value)
              const n = parseFloat(e.target.value)
              set('cost', Number.isFinite(n) ? n : 0)
            }}
            placeholder="0"
            autoFocus={!existing}
            className="w-full bg-transparent border-0 p-0 text-[44px] leading-tight font-semibold tracking-[-0.02em] text-ink tabular-nums
                       placeholder:text-faint focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        <div className="border-t border-line">
          <label htmlFor="name" className="sr-only">What was it for</label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="What was it for? Dinner, groceries, electricity bill…"
            className="w-full h-12 bg-transparent border-0 px-4 text-[16px] text-ink placeholder:text-faint focus:ring-0"
          />
        </div>
      </div>

      {/* Paid By — curated list, one tap. */}
      <fieldset>
        <legend className="label">Paid by</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {paidByOptions.map(p => {
            const on = form.paidBy === p
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => set('paidBy', p)}
                className={`pill !h-10 !px-4 !text-sm ${on ? 'pill-selected' : 'pill-default'}`}
              >
                {p}
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Expense Type */}
      <div>
        <label htmlFor="type" className="label">Expense type</label>
        <input
          id="type"
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

      {/* Date */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="date" className="label !mb-0">Date</label>
          <div className="flex gap-1">
            {[{ v: today, l: 'Today' }, { v: yesterday, l: 'Yesterday' }].map(d => (
              <button
                key={d.l}
                type="button"
                onClick={() => set('date', d.v)}
                aria-pressed={form.date === d.v}
                className={`pill !h-7 ${form.date === d.v ? 'pill-selected' : 'pill-default'}`}
              >
                {d.l}
              </button>
            ))}
          </div>
        </div>
        {/* Native date inputs render in the device locale (MM/DD/YYYY on en-US), so show our own
            unambiguous DD-MMM-YY label and lay the invisible native picker over it. */}
        <div className="input-field relative flex items-center justify-between focus-within:ring-2 focus-within:ring-accent/70">
          <span className={`tabular-nums ${form.date ? '' : 'text-faint'}`}>
            {form.date && isValid(parseISO(form.date)) ? format(parseISO(form.date), 'dd-MMM-yy') : 'Pick a date'}
          </span>
          <ChevronDownIcon className="w-4 h-4 text-muted" />
          <input
            id="date"
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            onClick={e => { try { e.currentTarget.showPicker() } catch {} }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            required
          />
        </div>
      </div>

      {/* Optional details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="app" className="label">App / platform <span className="normal-case tracking-normal text-mutedDim">· optional</span></label>
          <input
            id="app"
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
        <div>
          <label htmlFor="mode" className="label">Payment mode <span className="normal-case tracking-normal text-mutedDim">· optional</span></label>
          <input
            id="mode"
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
      </div>

      {/* One-time toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={form.oneTime}
        aria-label="One-time expense"
        onClick={() => set('oneTime', !form.oneTime)}
        className="w-full flex items-center justify-between gap-4 text-left rounded-xl bg-surface ring-1 ring-inset ring-line px-4 py-3
                   transition-colors hover:bg-surface2"
      >
        <span>
          <span className="block text-sm font-medium text-ink">One-time expense</span>
          <span className="block text-xs text-mutedDim mt-0.5">A big, rare buy — hidden from dashboard totals by default</span>
        </span>
        <span
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150
            ${form.oneTime ? 'bg-accent' : 'bg-surface3'}`}
          aria-hidden
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-crisp
            ${form.oneTime ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
        </span>
      </button>

      {/* Tags */}
      {tagOptions.length > 0 && (
        <fieldset>
          <legend className="label">Tags <span className="normal-case tracking-normal text-mutedDim">· optional</span></legend>
          <div className="flex flex-wrap gap-2">
            {tagOptions.map(tag => {
              const on = form.tags.includes(tag)
              return (
                <button
                  type="button"
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  aria-pressed={on}
                  className={`pill !h-9 !text-sm ${on ? 'pill-selected' : 'pill-default'}`}
                >
                  {on && <CheckIcon className="w-3.5 h-3.5 -ml-0.5" />}
                  {tag}
                </button>
              )
            })}
          </div>
        </fieldset>
      )}

      <div className="pt-2 space-y-3">
        {/* Next to the button you just tapped — not scrolled away at the top. */}
        {error && (
          <p role="alert" className="rounded-xl bg-down/10 ring-1 ring-inset ring-down/25 px-4 py-2.5 text-sm text-down">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn-primary">
          {pending && <span className="w-4 h-4 rounded-full border-2 border-base/30 border-t-base animate-spin" aria-hidden />}
          {pending ? 'Saving…' : existing ? 'Save changes' : 'Add expense'}
        </button>

        {existing && (
          showDeleteConfirm ? (
            <div className="rounded-xl ring-1 ring-inset ring-down/25 bg-down/5 p-3 space-y-3">
              <p className="text-sm text-center text-muted">Delete “{existing.name}”? This removes the row from the sheet.</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setShowDeleteConfirm(false)} className="btn-secondary !h-11">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={pending}
                  className="h-11 rounded-xl bg-down text-ink font-semibold transition-[opacity,transform] duration-150 ease-crisp
                             hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                >
                  {pending ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full h-11 rounded-xl text-sm font-medium text-mutedDim hover:text-down hover:bg-down/5 transition-colors"
            >
              Delete expense
            </button>
          )
        )}
      </div>
    </form>
  )
}
