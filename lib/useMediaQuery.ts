'use client'

import { useEffect, useState } from 'react'

/**
 * Subscribe to a CSS media query. Returns `false` during SSR / before mount;
 * after mount the value reflects the live match state.
 *
 * Used by the dashboard to decide whether a chart-day click should drill in
 * place (desktop) or navigate to /expenses (mobile) without calling
 * `window.matchMedia` on every click.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    setMatches(mql.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}
