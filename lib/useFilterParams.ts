'use client'

import { useCallback, useMemo, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { SortKey, SortDir } from './types'

/**
 * Single source of truth for the dashboard & history filter UI: every filter
 * Set, the oneTime toggle, the sort key/dir, and the optionally-selected day
 * live in the URL query string. Wins:
 *
 *   - persists across navigation (Dashboard ↔ /expenses keep the same filters)
 *   - shareable / bookmarkable views
 *   - browser back / forward "just works"
 *
 * URL key layout (terse on purpose — these show in the address bar):
 *   t=…  excluded types       (comma-separated)
 *   a=…  excluded apps
 *   m=…  excluded payment modes
 *   p=…  excluded paid-by
 *   g=…  excluded taGs        (t is taken)
 *   one=1|0  excludeOneTime, only present when it differs from the page default
 *   sort=date|cost|name       only present when ≠ default
 *   dir=desc|asc              only present when ≠ default
 *   date=YYYY-MM-DD           optional drill-down day
 *
 * `month` is owned by the parent server component and is preserved untouched.
 */

const KEYS = {
  types: 't',
  apps: 'a',
  modes: 'm',
  paidBy: 'p',
  tags: 'g',
  oneTime: 'one',
  sortKey: 'sort',
  sortDir: 'dir',
  date: 'date',
} as const

export type FilterDefaults = {
  excludeOneTime?: boolean
  sortKey?: SortKey
  sortDir?: SortDir
}

export type FilterState = {
  excludedTypes: Set<string>
  excludedApps: Set<string>
  excludedModes: Set<string>
  excludedPaidBy: Set<string>
  excludedTags: Set<string>
  excludeOneTime: boolean
  sortKey: SortKey
  sortDir: SortDir
  selectedDate: string | null
}

export type FilterActions = {
  setExcludedTypes: (next: Set<string>) => void
  setExcludedApps: (next: Set<string>) => void
  setExcludedModes: (next: Set<string>) => void
  setExcludedPaidBy: (next: Set<string>) => void
  setExcludedTags: (next: Set<string>) => void
  setExcludeOneTime: (next: boolean) => void
  setSortKey: (next: SortKey) => void
  setSortDir: (next: SortDir) => void
  toggleSortDir: () => void
  setSelectedDate: (next: string | null) => void
  clearAll: () => void
}

export function useFilterParams(defaults: FilterDefaults = {}): FilterState & FilterActions {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  // Stale-closure guard: setters reference spRef.current rather than the sp
  // captured in their useCallback closure, so chained updates (e.g. clearAll
  // touching 6 keys) start from the latest URL state.
  const spRef = useRef(sp)
  spRef.current = sp

  const defOneTime = defaults.excludeOneTime ?? false
  const defSortKey = defaults.sortKey ?? 'date'
  const defSortDir = defaults.sortDir ?? 'desc'

  const filters: FilterState = useMemo(() => {
    const parseSet = (key: string) => new Set(sp.get(key)?.split(',').filter(Boolean) ?? [])
    const rawOne = sp.get(KEYS.oneTime)
    return {
      excludedTypes:  parseSet(KEYS.types),
      excludedApps:   parseSet(KEYS.apps),
      excludedModes:  parseSet(KEYS.modes),
      excludedPaidBy: parseSet(KEYS.paidBy),
      excludedTags:   parseSet(KEYS.tags),
      excludeOneTime: rawOne === null ? defOneTime : rawOne === '1',
      sortKey:        (sp.get(KEYS.sortKey) ?? defSortKey) as SortKey,
      sortDir:        (sp.get(KEYS.sortDir) ?? defSortDir) as SortDir,
      selectedDate:   sp.get(KEYS.date),
    }
  }, [sp, defOneTime, defSortKey, defSortDir])

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(spRef.current.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') params.delete(key)
      else params.set(key, value)
    }
    const qs = params.toString()
    // `replace` (not `push`) so toggling filters doesn't pile up history
    // entries; back button still takes you to the previous page.
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [router, pathname])

  const setSet = useCallback((urlKey: string, next: Set<string>) => {
    updateParams({ [urlKey]: next.size ? [...next].join(',') : null })
  }, [updateParams])

  const setExcludedTypes  = useCallback((next: Set<string>) => setSet(KEYS.types,  next), [setSet])
  const setExcludedApps   = useCallback((next: Set<string>) => setSet(KEYS.apps,   next), [setSet])
  const setExcludedModes  = useCallback((next: Set<string>) => setSet(KEYS.modes,  next), [setSet])
  const setExcludedPaidBy = useCallback((next: Set<string>) => setSet(KEYS.paidBy, next), [setSet])
  const setExcludedTags   = useCallback((next: Set<string>) => setSet(KEYS.tags,   next), [setSet])

  const setExcludeOneTime = useCallback((next: boolean) => {
    updateParams({ [KEYS.oneTime]: next === defOneTime ? null : (next ? '1' : '0') })
  }, [updateParams, defOneTime])

  const setSortKey = useCallback((next: SortKey) => {
    updateParams({ [KEYS.sortKey]: next === defSortKey ? null : next })
  }, [updateParams, defSortKey])

  const setSortDir = useCallback((next: SortDir) => {
    updateParams({ [KEYS.sortDir]: next === defSortDir ? null : next })
  }, [updateParams, defSortDir])

  const toggleSortDir = useCallback(() => {
    const current = (spRef.current.get(KEYS.sortDir) ?? defSortDir) as SortDir
    const next: SortDir = current === 'desc' ? 'asc' : 'desc'
    updateParams({ [KEYS.sortDir]: next === defSortDir ? null : next })
  }, [updateParams, defSortDir])

  const setSelectedDate = useCallback((next: string | null) => {
    updateParams({ [KEYS.date]: next })
  }, [updateParams])

  const clearAll = useCallback(() => {
    updateParams({
      [KEYS.types]: null, [KEYS.apps]: null, [KEYS.modes]: null,
      [KEYS.paidBy]: null, [KEYS.tags]: null, [KEYS.oneTime]: null,
    })
  }, [updateParams])

  return {
    ...filters,
    setExcludedTypes, setExcludedApps, setExcludedModes,
    setExcludedPaidBy, setExcludedTags,
    setExcludeOneTime, setSortKey, setSortDir, toggleSortDir,
    setSelectedDate, clearAll,
  }
}
