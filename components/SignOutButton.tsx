'use client'

import { signOut } from 'next-auth/react'

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-xs text-mutedDim hover:text-ink transition-colors"
    >
      Sign out
    </button>
  )
}
