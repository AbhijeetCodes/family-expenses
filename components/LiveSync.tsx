'use client'

import { useEffect, useRef, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getExpensesVersionAction } from '@/app/actions'

// How often to check the sheet for changes while the tab is visible.
const POLL_MS = 10_000
// Don't re-refresh for the same remote version more often than this (guards
// against a refresh loop if a request lands on a serverless instance whose
// cache hasn't caught up yet).
const RETRY_SAME_VERSION_MS = 20_000

/**
 * Keeps the page in step with the Google Sheet. Renders nothing.
 *
 * `version` is the fingerprint of the data this page was rendered from. We
 * ask the server for the sheet's current fingerprint on mount, every
 * POLL_MS while visible, and whenever the app regains focus / comes back
 * online; if it differs, router.refresh() re-renders the page in place
 * (scroll position, filters and open UI are kept).
 */
export default function LiveSync({ version }: { version: string }) {
  const router = useRouter()
  const versionRef = useRef(version)
  versionRef.current = version

  useEffect(() => {
    let disposed = false
    let checking = false
    let lastRefresh = { version: '', at: 0 }

    const check = async () => {
      if (checking || document.visibilityState !== 'visible' || !navigator.onLine) return
      checking = true
      try {
        const latest = await getExpensesVersionAction()
        if (disposed || latest === versionRef.current) return
        const now = Date.now()
        if (latest === lastRefresh.version && now - lastRefresh.at < RETRY_SAME_VERSION_MS) return
        lastRefresh = { version: latest, at: now }
        startTransition(() => router.refresh())
      } catch {
        // Offline / signed out / transient Sheets error — try again next tick.
      } finally {
        checking = false
      }
    }

    check()
    const id = window.setInterval(check, POLL_MS)
    const onWake = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    window.addEventListener('online', onWake)
    return () => {
      disposed = true
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
      window.removeEventListener('online', onWake)
    }
  }, [router])

  return null
}
