'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, ListIcon, PlusIcon, CogIcon } from './icons'

const links = [
  { href: '/',         label: 'Home',     Icon: HomeIcon },
  { href: '/expenses', label: 'History',  Icon: ListIcon },
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
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-base/90 backdrop-blur-md border-t border-line pb-safe">
      <div className="flex max-w-lg mx-auto h-16">
        {links.map(({ href, label, Icon, primary }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
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
