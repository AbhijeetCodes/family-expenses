'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { HomeIcon, ListIcon, PlusIcon, CogIcon } from './icons'

const links = [
  { href: '/',         label: 'Home',     Icon: HomeIcon, carry: true },
  { href: '/expenses', label: 'History',  Icon: ListIcon, carry: true },
  { href: '/add',      label: 'Add',      Icon: PlusIcon, primary: true },
  { href: '/settings', label: 'Settings', Icon: CogIcon  },
]

/**
 * Mobile tab bar (hidden on lg). "Add" is the one filled control — logging an
 * expense is the most frequent job on a phone, so it gets the weight a
 * floating action button would, without a second competing "+".
 */
export default function BottomNav() {
  const pathname = usePathname()
  if (pathname.startsWith('/login')) return null
  // useSearchParams needs a Suspense boundary here (root layout, also used
  // by statically rendered pages); the fallback is the same bar without the
  // carried query.
  return (
    <Suspense fallback={<Nav pathname={pathname} query="" />}>
      <NavWithQuery pathname={pathname} />
    </Suspense>
  )
}

function NavWithQuery({ pathname }: { pathname: string }) {
  const sp = useSearchParams()
  // Home ↔ History share the same query keys (month, filters, sort, search),
  // so switching tabs keeps what you were looking at.
  const onFilterPage = pathname === '/' || pathname === '/expenses'
  return <Nav pathname={pathname} query={onFilterPage ? sp.toString() : ''} />
}

function Nav({ pathname, query }: { pathname: string; query: string }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-base/90 backdrop-blur-md border-t border-line pb-safe">
      <div className="flex max-w-lg mx-auto h-16">
        {links.map(({ href, label, Icon, primary, carry }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={carry && query ? `${href}?${query}` : href}
              aria-current={active ? 'page' : undefined}
              className={`group flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors
                ${active ? 'text-ink' : 'text-mutedDim hover:text-muted'}`}
            >
              {primary ? (
                <span className="w-10 h-7 rounded-full bg-accent text-base flex items-center justify-center
                                 transition-transform duration-150 ease-crisp group-active:scale-[0.94]">
                  <Icon className="w-[18px] h-[18px]" />
                </span>
              ) : (
                <span className="h-7 flex items-center">
                  <Icon className={`w-[22px] h-[22px] ${active ? 'text-accent' : ''}`} />
                </span>
              )}
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
