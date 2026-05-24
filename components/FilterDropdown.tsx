'use client'

import { useRef, useEffect, useState } from 'react'

type Props = {
  label: string
  options: string[]
  excluded: Set<string>          // values that are turned OFF (hidden)
  onChange: (next: Set<string>) => void
}

export default function FilterDropdown({ label, options, excluded, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (value: string) => {
    const next = new Set(excluded)
    next.has(value) ? next.delete(value) : next.add(value)
    onChange(next)
  }

  const allOff = () => onChange(new Set(options))
  const allOn  = () => onChange(new Set())

  const excludedCount = excluded.size
  const active = excludedCount > 0

  if (!options.length) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap
          ${active
            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            : 'bg-slate-700 text-slate-400 border-slate-600 hover:text-slate-200 hover:bg-slate-600'}`}
      >
        {label}
        {active && (
          <span className="bg-amber-500 text-slate-900 font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] leading-none">
            ✕{excludedCount}
          </span>
        )}
        <span className={`transition-transform duration-150 text-[10px] ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 min-w-[180px] py-1 overflow-hidden">
          {/* Quick toggles */}
          <div className="flex gap-1 px-2 pt-1 pb-1.5 border-b border-slate-700/70">
            <button
              onClick={allOn}
              className="flex-1 text-xs py-1 rounded-md bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              All
            </button>
            <button
              onClick={allOff}
              className="flex-1 text-xs py-1 rounded-md bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              None
            </button>
          </div>

          <div className="max-h-[280px] overflow-y-auto py-1">
            {options.map(opt => {
              const checked = !excluded.has(opt)
              return (
                <label
                  key={opt}
                  className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-700/60 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt)}
                    className="rounded border-slate-600 bg-slate-700 text-green-500 focus:ring-green-500 focus:ring-offset-slate-800 cursor-pointer"
                  />
                  <span className={`text-sm select-none ${checked ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                    {opt}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
