'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, ListIcon, PlusIcon, CogIcon } from './icons'

const links = [
  { href: '/',         label: 'Home',     Icon: HomeIcon },
  { href: '/expenses', label: 'History',  Icon: ListIcon },
  { href: '/add',      label: 'Add',      Icon: PlusIcon },
  { href: '/settings', label: 'Settings', Icon: CogIcon  },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-divider z-40 lg:hidden">
      <div className="flex max-w-lg mx-auto">
        {links.map(l => {
          const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors
                ${active ? 'text-accent' : 'text-mutedDim'}`}
            >
              <l.Icon className="w-5 h-5" />
              {l.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
