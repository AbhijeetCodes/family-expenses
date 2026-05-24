'use client'

import { useRef, useEffect, useState } from 'react'

type Props = {
  label: string
  options: string[]
  excluded: Set<string>
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
        className={`pill ${active ? '!bg-down/15 !text-down !border-down/30' : 'pill-default'}`}
      >
        {label}
        {active && (
          <span className="bg-down text-ink font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] leading-none">
            ✕{excludedCount}
          </span>
        )}
        <span className={`transition-transform duration-150 text-[10px] ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-surface border border-divider rounded-xl shadow-2xl z-50 min-w-[180px] py-1 overflow-hidden">
          <div className="flex gap-1 px-2 pt-1 pb-1.5 border-b border-divider/70">
            <button
              onClick={allOn}
              className="flex-1 text-xs py-1 rounded-md bg-surface2/50 hover:bg-surface2 text-muted hover:text-ink transition-colors"
            >
              All
            </button>
            <button
              onClick={allOff}
              className="flex-1 text-xs py-1 rounded-md bg-surface2/50 hover:bg-surface2 text-muted hover:text-ink transition-colors"
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
                  className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-surface2/60 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt)}
                    className="rounded border-divider bg-surface2 text-accent focus:ring-accent focus:ring-offset-surface cursor-pointer"
                  />
                  <span className={`text-sm select-none ${checked ? 'text-ink' : 'text-mutedDim line-through'}`}>
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
