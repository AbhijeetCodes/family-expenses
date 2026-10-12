'use client'

import type { ReactNode } from 'react'
import FilterDropdown from './FilterDropdown'
import { CheckIcon } from './icons'
import type { FilterState, FilterActions } from '@/lib/useFilterParams'

export type FilterOptions = {
  types: string[]
  paidBy: string[]
  apps: string[]
  modes: string[]
  tags: string[]
}

/**
 * Filters that differ from the page's defaults. The one-time toggle only
 * counts when it's been flipped away from the default — otherwise the
 * dashboard (default: hidden) would always show "Clear (1)" and clearing
 * would do nothing.
 */
export function activeFilterCount(f: FilterState, defaultExcludeOneTime: boolean): number {
  return f.excludedTypes.size + f.excludedApps.size + f.excludedModes.size +
    f.excludedPaidBy.size + f.excludedTags.size +
    (f.excludeOneTime !== defaultExcludeOneTime ? 1 : 0)
}

type Props = {
  f: FilterState & FilterActions
  options: FilterOptions
  defaultExcludeOneTime: boolean
  /** Extra controls rendered before the dropdowns (History's date pill). */
  leading?: ReactNode
  className?: string
}

/**
 * One horizontally-scrolling row of filter pills, shared by Dashboard and
 * History. Single line on phones (swipe for more) instead of wrapping into
 * a wall of pills above the content.
 */
export default function FilterBar({ f, options, defaultExcludeOneTime, leading, className = '' }: Props) {
  const count = activeFilterCount(f, defaultExcludeOneTime)
  return (
    <div className={`flex items-center gap-2 overflow-x-auto scrollbar-none ${className}`}>
      {leading}
      <FilterDropdown label="Type"    options={options.types}  excluded={f.excludedTypes}  onChange={f.setExcludedTypes} />
      <FilterDropdown label="Paid by" options={options.paidBy} excluded={f.excludedPaidBy} onChange={f.setExcludedPaidBy} />
      <FilterDropdown label="App"     options={options.apps}   excluded={f.excludedApps}   onChange={f.setExcludedApps} />
      <FilterDropdown label="Mode"    options={options.modes}  excluded={f.excludedModes}  onChange={f.setExcludedModes} />
      <FilterDropdown label="Tags"    options={options.tags}   excluded={f.excludedTags}   onChange={f.setExcludedTags} />

      <span className="w-px h-4 bg-line shrink-0" aria-hidden />

      <button
        type="button"
        onClick={() => f.setExcludeOneTime(!f.excludeOneTime)}
        aria-pressed={f.excludeOneTime}
        title="One-time purchases (big, rare buys) are left out of totals when hidden"
        className={`pill ${f.excludeOneTime ? 'pill-active' : 'pill-default'}`}
      >
        {f.excludeOneTime && <CheckIcon className="w-3 h-3 -ml-0.5" />}
        Hide one-time
      </button>

      {count > 0 && (
        <button
          type="button"
          onClick={f.clearAll}
          className="ml-auto shrink-0 h-8 px-2 text-xs font-medium text-muted hover:text-ink transition-colors"
        >
          Clear ({count})
        </button>
      )}
    </div>
  )
}
