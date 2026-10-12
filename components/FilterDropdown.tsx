'use client'

import { useRef, useEffect, useState, useId, useLayoutEffect } from 'react'
import { ChevronDownIcon, CheckIcon } from './icons'

type Props = {
  label: string
  options: string[]
  excluded: Set<string>
  onChange: (next: Set<string>) => void
}

const MENU_W = 220

export default function FilterDropdown({ label, options, excluded, onChange }: Props) {
  const [open, setOpen] = useState(false)
  // Viewport coords: the menu is position:fixed so the (horizontally
  // scrollable) filter row can't clip it.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const left = Math.max(8, Math.min(r.left, window.innerWidth - MENU_W - 8))
    setPos({ top: r.bottom + 6, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = (refocus: boolean) => {
      setOpen(false)
      if (refocus) triggerRef.current?.focus()
    }
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) close(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(true) }
    // A fixed menu would detach from its trigger on scroll — just close it.
    const onScroll = (e: Event) => { if (!menuRef.current?.contains(e.target as Node)) close(false) }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    const onResize = () => close(false)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

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
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-haspopup="true"
        className={`pill ${active ? 'pill-active' : 'pill-default'}`}
      >
        {label}
        {active && (
          <span className="text-[11px] text-muted tabular-nums">
            {excludedCount} off
          </span>
        )}
        <ChevronDownIcon className={`w-3 h-3 -mr-0.5 transition-transform duration-150 ease-crisp ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && pos && (
        <div
          ref={menuRef}
          id={menuId}
          role="group"
          aria-label={`${label} filter`}
          style={{ top: pos.top, left: pos.left, width: MENU_W }}
          className="fixed z-50 bg-surface2 rounded-xl shadow-popover overflow-hidden animate-pop-in origin-top-left"
        >
          <div className="flex items-center justify-between px-3 h-10 border-b border-line">
            <span className="eyebrow">{label}</span>
            <div className="flex gap-1">
              <button type="button" onClick={allOn}  className="text-xs font-medium text-muted hover:text-ink px-2 h-7 rounded-md hover:bg-surface3 transition-colors">All</button>
              <button type="button" onClick={allOff} className="text-xs font-medium text-muted hover:text-ink px-2 h-7 rounded-md hover:bg-surface3 transition-colors">None</button>
            </div>
          </div>

          <div className="max-h-[280px] overflow-y-auto overscroll-contain p-1">
            {options.map(opt => {
              const checked = !excluded.has(opt)
              return (
                <label
                  key={opt}
                  className="flex items-center gap-2.5 px-2.5 h-10 rounded-lg hover:bg-surface3 cursor-pointer transition-colors"
                >
                  <input type="checkbox" checked={checked} onChange={() => toggle(opt)} className="peer sr-only" />
                  <span
                    className={`w-[18px] h-[18px] rounded-[5px] shrink-0 flex items-center justify-center ring-1 ring-inset
                      transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent
                      ${checked ? 'bg-accent ring-accent text-base' : 'bg-well ring-line-strong text-transparent'}`}
                    aria-hidden
                  >
                    <CheckIcon className="w-3 h-3" />
                  </span>
                  <span className={`text-sm truncate select-none ${checked ? 'text-ink' : 'text-mutedDim'}`}>
                    {opt}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
