'use client'

import { useRef, useEffect, useState } from 'react'

type Props = {
  label: string
  options: string[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
}

export default function FilterDropdown({ label, options, selected, onChange }: Props) {
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
    const next = new Set(selected)
    next.has(value) ? next.delete(value) : next.add(value)
    onChange(next)
  }

  const count = selected.size
  const active = count > 0

  if (!options.length) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap
          ${active
            ? 'bg-green-500/15 text-green-400 border-green-500/30'
            : 'bg-slate-700 text-slate-400 border-slate-600 hover:text-slate-200 hover:bg-slate-600'}`}
      >
        {label}
        {active && (
          <span className="bg-green-500 text-slate-900 font-bold rounded-full w-4 h-4 flex items-center justify-center text-[10px] leading-none">
            {count}
          </span>
        )}
        <span className={`transition-transform duration-150 text-[10px] ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 min-w-[160px] py-1 overflow-hidden">
          {active && (
            <>
              <button
                onClick={() => { onChange(new Set()); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Clear filter
              </button>
              <div className="border-t border-slate-700 mx-2 mb-1" />
            </>
          )}
          {options.map(opt => (
            <label
              key={opt}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-700/60 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.has(opt)}
                onChange={() => toggle(opt)}
                className="rounded border-slate-600 bg-slate-700 text-green-500 focus:ring-green-500 focus:ring-offset-slate-800 cursor-pointer"
              />
              <span className="text-sm text-slate-200 select-none">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
