'use client'

import { signOut } from 'next-auth/react'

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="shrink-0 h-9 px-3 rounded-lg text-sm font-medium text-muted ring-1 ring-inset ring-line hover:text-ink hover:bg-surface2 transition-colors"
    >
      Sign out
    </button>
  )
}
