// Heroicons outline (24x24, stroke 1.5). Inlined to avoid a dependency.

type IconProps = { className?: string }

const base = 'w-5 h-5'
const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function HomeIcon({ className = base }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <path d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}

export function ListIcon({ className = base }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <path d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
    </svg>
  )
}

export function PlusIcon({ className = base }: IconProps) {
  return (
    <svg {...svgProps} className={className} strokeWidth={2}>
      <path d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

export function CogIcon({ className = base }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

/** Money-jar icon (matches the app's home-screen logo). */
export function JarIcon({ className = base }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      {/* lid */}
      <rect x="7" y="3" width="10" height="2.6" rx="1.2" />
      {/* body */}
      <path d="M5.5 7h13M5.5 7v12.25A1.75 1.75 0 0 0 7.25 21h9.5A1.75 1.75 0 0 0 18.5 19.25V7" />
      {/* two stylised coins peeking */}
      <circle cx="10" cy="17" r="1.4" fill="currentColor" stroke="none" opacity="0.55" />
      <circle cx="13.5" cy="17.3" r="1.6" fill="currentColor" stroke="none" opacity="0.55" />
    </svg>
  )
}

/** Kept as alias so existing imports still work — both render the jar now. */
export const WalletIcon = JarIcon

export function PencilIcon({ className = base }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
    </svg>
  )
}

/* -------- Category color helpers -------- */

const PALETTE = [
  '#00D689', // green (accent)
  '#3B82F6', // blue
  '#F59E0B', // amber
  '#EF4444', // red
  '#A78BFA', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#FB923C', // orange
]

export function colorForString(s: string): string {
  if (!s) return PALETTE[0]
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}

/* -------- Decorative badges -------- */

type CategoryIconProps = { category: string; size?: 'sm' | 'md' | 'lg' }
export function CategoryIcon({ category, size = 'md' }: CategoryIconProps) {
  const initial = (category || '?').charAt(0).toUpperCase()
  const color = colorForString(category)
  const sizeClass =
    size === 'sm' ? 'w-8 h-8 text-xs rounded-lg' :
    size === 'lg' ? 'w-12 h-12 text-base rounded-2xl' :
    'w-10 h-10 text-sm rounded-xl'
  return (
    <div
      className={`${sizeClass} flex items-center justify-center font-bold flex-shrink-0`}
      style={{ backgroundColor: `${color}26`, color }}
      aria-hidden
    >
      {initial}
    </div>
  )
}

type AvatarBadgeProps = { initial: string; size?: 'sm' | 'md' }
export function AvatarBadge({ initial, size = 'md' }: AvatarBadgeProps) {
  const color = colorForString(initial)
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-[11px]' : 'w-7 h-7 text-xs'
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold border-2`}
      style={{ color, borderColor: color, backgroundColor: `${color}15` }}
      aria-hidden
    >
      {(initial || '?').charAt(0).toUpperCase()}
    </div>
  )
}
