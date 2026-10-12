'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
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
 *   t=…  excluded types       (repeated key per value: t=Food&t=Rent —
 *                              values may contain commas)
 *   a=…  excluded apps
 *   m=…  excluded payment modes
 *   p=…  excluded paid-by
 *   g=…  excluded taGs        (t is taken)
 *   one=1|0  excludeOneTime, only present when it differs from the page default
 *   sort=date|cost|name       only present when ≠ default
 *   dir=desc|asc              only present when ≠ default
 *   date=YYYY-MM-DD           optional drill-down day
 *   q=…  free-text search     (History page)
 *
 * `month` is owned by the parent server component and is preserved untouched.
 *
 * Updates go through window.history.replaceState, not router.replace: the
 * server components only read `month`, so a filter tap needs no server round
 * trip. Next 15 syncs native history updates into useSearchParams, so the
 * UI re-renders instantly and the URL stays the source of truth.
 */

const SORT_KEYS: SortKey[] = ['date', 'cost', 'name']

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
  search: 'q',
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
  search: string
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
  setSearch: (next: string) => void
  clearAll: () => void
}

export function useFilterParams(defaults: FilterDefaults = {}): FilterState & FilterActions {
  const pathname = usePathname()
  const sp = useSearchParams()


  const defOneTime = defaults.excludeOneTime ?? false
  const defSortKey = defaults.sortKey ?? 'date'
  const defSortDir = defaults.sortDir ?? 'desc'

  const filters: FilterState = useMemo(() => {
    const parseSet = (key: string) => new Set(sp.getAll(key).filter(Boolean))
    const rawOne = sp.get(KEYS.oneTime)
    const rawSort = sp.get(KEYS.sortKey)
    const rawDir = sp.get(KEYS.sortDir)
    const rawDate = sp.get(KEYS.date)
    return {
      excludedTypes:  parseSet(KEYS.types),
      excludedApps:   parseSet(KEYS.apps),
      excludedModes:  parseSet(KEYS.modes),
      excludedPaidBy: parseSet(KEYS.paidBy),
      excludedTags:   parseSet(KEYS.tags),
      excludeOneTime: rawOne === null ? defOneTime : rawOne === '1',
      // Hand-edited / stale URLs must not yield a sort key nothing matches.
      sortKey:        SORT_KEYS.includes(rawSort as SortKey) ? (rawSort as SortKey) : defSortKey,
      sortDir:        rawDir === 'asc' || rawDir === 'desc' ? rawDir : defSortDir,
      selectedDate:   rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null,
      search:         sp.get(KEYS.search) ?? '',
    }
  }, [sp, defOneTime, defSortKey, defSortDir])

  const updateParams = useCallback((updates: Record<string, string | string[] | null>) => {
    // Read the live URL, not the rendered searchParams: chained updates in
    // the same tick (clear filters + search + date) must each see the last.
    const params = new URLSearchParams(window.location.search)
    for (const [key, value] of Object.entries(updates)) {
      params.delete(key)
      if (Array.isArray(value)) value.forEach(v => params.append(key, v))
      else if (value) params.set(key, value)
    }
    const qs = params.toString()
    // `replace` (not `push`) so toggling filters doesn't pile up history
    // entries; back button still takes you to the previous page.
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname)
  }, [pathname])

  const setSet = useCallback((urlKey: string, next: Set<string>) => {
    updateParams({ [urlKey]: [...next] })
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
    const raw = new URLSearchParams(window.location.search).get(KEYS.sortDir)
    const current: SortDir = raw === 'asc' || raw === 'desc' ? raw : defSortDir
    const next: SortDir = current === 'desc' ? 'asc' : 'desc'
    updateParams({ [KEYS.sortDir]: next === defSortDir ? null : next })
  }, [updateParams, defSortDir])

  const setSelectedDate = useCallback((next: string | null) => {
    updateParams({ [KEYS.date]: next })
  }, [updateParams])

  const setSearch = useCallback((next: string) => {
    updateParams({ [KEYS.search]: next })
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
    setSelectedDate, setSearch, clearAll,
  }
}

/**
 * Build an href that keeps the current query string (filters, sort, search,
 * month, day) with `overrides` applied (null removes a key). Used for the
 * links between Dashboard and History and the month arrows, so filters
 * survive navigation instead of being dropped by a bare `?month=` link.
 */
export function useCarriedHref(): (path: string, overrides?: Record<string, string | null>) => string {
  const sp = useSearchParams()
  return useCallback((path, overrides = {}) => {
    const params = new URLSearchParams(sp.toString())
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    const qs = params.toString()
    return qs ? `${path}?${qs}` : path
  }, [sp])
}
