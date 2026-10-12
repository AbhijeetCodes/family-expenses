'use client'

import { memo } from 'react'
import type { SortKey, SortDir } from '@/lib/types'
import { ArrowDownIcon } from './icons'

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'cost', label: 'Amount' },
  { key: 'name', label: 'Name' },
]

type Props = {
  sortKey: SortKey
  sortDir: SortDir
  onChangeSortKey: (key: SortKey) => void
  onToggleSortDir: () => void
}

/**
 * Segmented Date / Amount / Name control. Tapping the active segment flips
 * the direction; tapping another switches key. Used by the dashboard sidebar
 * and the History page.
 */
function SortToggleInner({ sortKey, sortDir, onChangeSortKey, onToggleSortDir }: Props) {
  return (
    <div className="flex items-center bg-well rounded-[10px] p-0.5 ring-1 ring-inset ring-line text-xs" role="group" aria-label="Sort">
      {OPTIONS.map(({ key, label }) => {
        const active = sortKey === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => (active ? onToggleSortDir() : onChangeSortKey(key))}
            aria-pressed={active}
            title={active ? `${label}, ${sortDir === 'desc' ? 'descending' : 'ascending'} — tap to flip` : `Sort by ${label.toLowerCase()}`}
            className={`h-8 px-3 rounded-lg inline-flex items-center gap-1 font-medium
              transition-[background-color,color] duration-150 ease-crisp
              ${active ? 'bg-surface2 text-ink shadow-card' : 'text-mutedDim hover:text-ink'}`}
          >
            {label}
            {active && (
              <ArrowDownIcon
                className={`w-3 h-3 text-accent transition-transform duration-150 ease-crisp ${sortDir === 'asc' ? 'rotate-180' : ''}`}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

export default memo(SortToggleInner)
