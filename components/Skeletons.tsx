/**
 * Instant placeholders rendered by the route-level loading.tsx files. A tap
 * on any nav link swaps to one of these immediately (they're prefetched), so
 * the app never sits frozen while the server renders the real page. Shapes
 * mirror the real layouts so nothing jumps when content lands.
 */

const Bar = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-surface2 ${className}`} />
)

function RowList({ rows = 8 }: { rows?: number }) {
  return (
    <div className="card p-0 md:p-0 overflow-hidden py-2">
      <div className="px-4 pt-2 pb-1.5"><Bar className="h-3 w-16" /></div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center px-4 min-h-[60px] gap-3">
          <Bar className="w-9 h-9 shrink-0 rounded-[10px]" />
          <div className="flex-1 space-y-1.5">
            <Bar className="h-3.5 w-2/5" />
            <Bar className="h-3 w-1/4" />
          </div>
          <Bar className="h-4 w-14" />
        </div>
      ))}
    </div>
  )
}

const HeaderShell = ({ children }: { children?: React.ReactNode }) => (
  <div className="bg-base/90 border-b border-line pt-safe">
    <div className="h-14 flex items-center justify-center">{children ?? <Bar className="h-4 w-32" />}</div>
  </div>
)

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-base pb-nav">
      <HeaderShell />
      <div className="border-b border-line h-[53px] max-w-[1400px] mx-auto px-4 flex items-center gap-2">
        {[0, 1, 2, 3, 4].map(i => <Bar key={i} className="h-8 w-20 rounded-full" />)}
      </div>
      <main className="max-w-[1400px] mx-auto px-4 py-4 lg:py-6">
        <div className="grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card md:p-6 md:col-span-2 space-y-4">
              <Bar className="h-3 w-28" />
              <Bar className="h-14 w-1/2" />
              <Bar className="h-4 w-2/3" />
              <Bar className="h-2 w-full mt-6" />
            </div>
            {[0, 1].map(i => (
              <div key={i} className="card space-y-4">
                <Bar className="h-3 w-24" />
                <Bar className="h-[200px] w-full" />
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
    <div className="min-h-screen pb-nav">
      <div className="bg-base/90 border-b border-line pt-safe">
        <div className="h-14 flex items-center justify-center"><Bar className="h-4 w-32" /></div>
        <div className="max-w-4xl mx-auto px-4"><Bar className="h-10 w-full rounded-xl" /></div>
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex gap-2">
          {[0, 1, 2, 3, 4].map(i => <Bar key={i} className="h-8 w-20 rounded-full" />)}
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-2">
        <Bar className="h-3 w-28" />
        <Bar className="h-8 w-40" />
      </div>
      <div className="max-w-4xl mx-auto px-4 py-4"><RowList /></div>
    </div>
  )
}

export function FormSkeleton({ title }: { title: string }) {
  return (
    <div className="min-h-screen pb-nav">
      <header className="page-header">
        <div className="page-header-row">
          <span className="w-10 h-10" />
          <h1 className="text-[17px] font-semibold text-ink">{title}</h1>
        </div>
      </header>
      <div className="max-w-lg mx-auto px-4 py-5 space-y-6">
        <div className="card space-y-3"><Bar className="h-3 w-16" /><Bar className="h-12 w-1/2" /></div>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="space-y-2">
            <Bar className="h-3 w-24" />
            <Bar className="h-12 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SettingsSkeleton() {
  return (
    <div className="min-h-screen pb-nav">
      <header className="page-header">
        <div className="page-header-row px-4">
          <h1 className="text-[17px] font-semibold text-ink">Settings</h1>
        </div>
      </header>
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="card space-y-3">
            <Bar className="h-4 w-32" />
            <div className="flex flex-wrap gap-1.5">
              {[0, 1, 2, 3].map(j => <Bar key={j} className="h-8 w-20 rounded-full" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
