'use client'

import { memo } from 'react'
import CategoryBars from '../charts/CategoryBars'

type Datum = { name: string; current: number; prev: number }
type Props = {
  data: Datum[]
  prevMonthName: string
  showComparison: boolean
  onToggleComparison: () => void
}

function CategoryCardInner({ data, prevMonthName, showComparison, onToggleComparison }: Props) {
  return (
    <section className="card flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="eyebrow">By category</h2>
        <div className="flex items-center bg-well rounded-[10px] p-0.5 ring-1 ring-inset ring-line text-xs" role="group" aria-label="Badge shows">
          {[
            { on: false, label: 'Share' },
            { on: true,  label: `vs ${prevMonthName.slice(0, 3)}` },
          ].map(o => {
            const active = showComparison === o.on
            return (
              <button
                key={o.label}
                type="button"
                aria-pressed={active}
                onClick={() => { if (!active) onToggleComparison() }}
                className={`h-7 px-2.5 rounded-lg font-medium transition-[background-color,color] duration-150 ease-crisp
                  ${active ? 'bg-surface2 text-ink shadow-card' : 'text-mutedDim hover:text-ink'}`}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      </div>
      <CategoryBars data={data} showComparison={showComparison} />
    </section>
  )
}

export default memo(CategoryCardInner)
