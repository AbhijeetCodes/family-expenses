/**
 * Instant placeholders rendered by the route-level loading.tsx files. A tap
 * on any nav link swaps to one of these immediately (they're prefetched), so
 * the app never sits frozen while the server renders the real page.
 */

const Bar = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-surface2 ${className}`} />
)

function RowList({ rows = 8 }: { rows?: number }) {
  return (
    <div className="card p-0 overflow-hidden divide-y divide-divider/50">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center px-4 py-3.5 gap-3">
          <Bar className="w-8 h-8 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Bar className="h-3.5 w-2/5" />
            <Bar className="h-3 w-3/5" />
          </div>
          <Bar className="h-4 w-14" />
        </div>
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-base pb-16 md:pb-0">
      <div className="bg-surface border-b border-divider h-14 flex items-center justify-center">
        <Bar className="h-4 w-32" />
      </div>
      <div className="bg-surface/60 border-b border-divider/50 h-[49px]" />
      <main className="max-w-[1400px] mx-auto px-4 py-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="card space-y-3">
                <Bar className="h-3 w-20" />
                <Bar className="h-10 w-2/3" />
                <Bar className="h-24 w-full" />
              </div>
            ))}
          </div>
          <div className="hidden lg:block"><RowList /></div>
        </div>
      </main>
    </div>
  )
}

export function HistorySkeleton() {
  return (
    <div className="min-h-screen pb-24">
      <div className="bg-surface border-b border-divider h-[57px] flex items-center justify-center">
        <Bar className="h-4 w-32" />
      </div>
      <div className="max-w-4xl mx-auto px-4 pt-2 pb-2 space-y-2 border-b border-divider/50">
        <Bar className="h-9 w-full rounded-xl" />
        <div className="flex gap-2">
          {[0, 1, 2, 3].map(i => <Bar key={i} className="h-7 w-16 rounded-full" />)}
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-3 space-y-3">
        <Bar className="h-5 w-40" />
        <RowList />
      </div>
    </div>
  )
}

export function FormSkeleton({ title }: { title: string }) {
  return (
    <div className="min-h-screen pb-24">
      <header className="page-header">
        <span className="w-8 h-8" />
        <h1 className="font-bold text-lg text-ink">{title}</h1>
      </header>
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="space-y-1.5">
            <Bar className="h-3 w-24" />
            <Bar className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SettingsSkeleton() {
  return (
    <div className="min-h-screen pb-24">
      <header className="page-header">
        <h1 className="font-bold text-lg text-ink">Settings</h1>
      </header>
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="card space-y-3">
            <Bar className="h-4 w-32" />
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3].map(j => <Bar key={j} className="h-8 w-20 rounded-full" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
