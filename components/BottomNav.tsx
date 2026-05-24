'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/',         label: 'Home',     icon: '🏠' },
  { href: '/expenses', label: 'History',  icon: '📋' },
  { href: '/add',      label: 'Add',      icon: '➕' },
  { href: '/settings', label: 'Settings', icon: '⚙️'  },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 z-40 md:hidden">
      <div className="flex max-w-lg mx-auto">
        {links.map(l => {
          const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors
                ${active ? 'text-green-400' : 'text-slate-500'}`}
            >
              <span className="text-lg leading-none mb-0.5">{l.icon}</span>
              {l.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
