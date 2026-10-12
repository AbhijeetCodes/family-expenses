'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addSettingAction, deleteSettingAction } from '@/app/actions'
import type { SettingsData } from '@/lib/settings'
import { XIcon } from './icons'

type Props = {
  column: keyof SettingsData
  label: string
  hint?: string
  values: string[]
}

export default function SettingsSection({ column, label, hint, values: initial }: Props) {
  const [values, setValues] = useState(initial)
  const [input, setInput] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()

  // Optimistic: the list changes on tap; the Sheets write runs in the
  // background and is rolled back if it fails. refresh() afterwards drops the
  // client router cache so the Add form's suggestions pick up the change.
  function mutate(next: string[], action: () => Promise<void>) {
    const prev = values
    setValues(next)
    setError('')
    startTransition(async () => {
      try {
        await action()
        router.refresh()
      } catch (err) {
        console.error('Settings update failed', err)
        setValues(prev)
        setError('Couldn’t save — please try again.')
      }
    })
  }

  function add() {
    const v = input.trim()
    if (pending || !v || values.some(x => x.toLowerCase() === v.toLowerCase())) return
    setInput('')
    mutate([...values, v], () => addSettingAction(column, v))
  }

  function remove(value: string) {
    mutate(values.filter(v => v !== value), () => deleteSettingAction(column, value))
  }

  return (
    <section className="card">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">
          {label} <span className="ml-1 text-xs font-normal text-mutedDim tabular-nums">{values.length}</span>
        </h2>
        {pending && <span className="text-[11px] text-mutedDim" aria-live="polite">Saving…</span>}
      </div>
      {hint && <p className="text-xs text-mutedDim mt-1">{hint}</p>}
      {error && <p role="alert" className="text-xs text-down mt-2">{error}</p>}

      <ul className="flex flex-wrap gap-1.5 mt-4">
        {values.map(v => (
          <li key={v} className="inline-flex items-center h-8 pl-3 pr-1 rounded-full bg-surface2 text-sm text-ink">
            {v}
            <button
              type="button"
              onClick={() => remove(v)}
              disabled={pending}
              className="ml-1 w-6 h-6 rounded-full inline-flex items-center justify-center text-mutedDim
                         hover:text-down hover:bg-down/10 transition-colors disabled:opacity-40"
              aria-label={`Remove ${v}`}
            >
              <XIcon className="w-3 h-3" />
            </button>
          </li>
        ))}
        {values.length === 0 && <li className="text-xs text-mutedDim">Nothing added yet.</li>}
      </ul>

      <form
        className="flex gap-2 mt-4"
        onSubmit={e => { e.preventDefault(); add() }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Add to ${label.toLowerCase()}`}
          aria-label={`Add to ${label.toLowerCase()}`}
          className="input-field !h-10 flex-1"
        />
        <button
          type="submit"
          // One write at a time: a second change made while the first is
          // saving would be rolled back to the wrong list if either failed.
          disabled={!input.trim() || pending}
          className="h-10 px-4 rounded-xl bg-surface2 text-ink text-sm font-semibold
                     transition-[background-color,transform] duration-150 ease-crisp
                     hover:bg-surface3 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
        >
          Add
        </button>
      </form>
    </section>
  )
}
