'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addSettingAction, deleteSettingAction } from '@/app/actions'
import type { SettingsData } from '@/lib/settings'

type Props = {
  column: keyof SettingsData
  label: string
  values: string[]
}

export default function SettingsSection({ column, label, values: initial }: Props) {
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
    if (!v || values.some(x => x.toLowerCase() === v.toLowerCase())) return
    setInput('')
    mutate([...values, v], () => addSettingAction(column, v))
  }

  function remove(value: string) {
    mutate(values.filter(v => v !== value), () => deleteSettingAction(column, value))
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-sm text-ink">{label}</h2>
        {pending && <span className="text-[11px] text-mutedDim">Saving…</span>}
      </div>
      {error && <p className="text-xs text-down">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {values.map(v => (
          <span key={v} className="flex items-center gap-1 bg-surface2 text-muted rounded-full px-3 py-1.5 text-sm border border-divider">
            {v}
            <button
              onClick={() => remove(v)}
              disabled={pending}
              className="text-mutedDim hover:text-down transition-colors leading-none ml-1"
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}
        {values.length === 0 && <p className="text-xs text-mutedDim">No values yet</p>}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={`Add ${label.toLowerCase()}…`}
          className="input-field flex-1"
        />
        <button
          onClick={add}
          disabled={!input.trim()}
          className="px-4 py-2 bg-accent text-base rounded-xl text-sm font-medium
                     disabled:opacity-40 hover:bg-accent-2 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}
