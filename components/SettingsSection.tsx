'use client'

import { useState, useTransition } from 'react'
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

  function add() {
    const v = input.trim()
    if (!v || values.map(x => x.toLowerCase()).includes(v.toLowerCase())) return
    startTransition(async () => {
      await addSettingAction(column, v)
      setValues(prev => [...prev, v])
      setInput('')
    })
  }

  function remove(value: string) {
    startTransition(async () => {
      await deleteSettingAction(column, value)
      setValues(prev => prev.filter(v => v !== value))
    })
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold text-sm text-gray-700">{label}</h2>
      <div className="flex flex-wrap gap-2">
        {values.map(v => (
          <span key={v} className="flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full px-3 py-1.5 text-sm">
            {v}
            <button
              onClick={() => remove(v)}
              disabled={pending}
              className="text-gray-400 hover:text-red-500 transition-colors leading-none ml-1"
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}
        {values.length === 0 && <p className="text-xs text-gray-400">No values yet</p>}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={`Add ${label.toLowerCase()}…`}
          className="input-field flex-1"
          disabled={pending}
        />
        <button
          onClick={add}
          disabled={pending || !input.trim()}
          className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium
                     disabled:opacity-40 active:bg-brand-700 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}
