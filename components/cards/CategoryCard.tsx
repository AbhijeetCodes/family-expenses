'use client'

import { memo } from 'react'
import CategoryPie from '../charts/CategoryPie'
import CategoryCompare from '../charts/CategoryCompare'

type Datum = { name: string; current: number; prev: number }
type Props = {
  data: Datum[]
  showComparison: boolean
  onToggleComparison: () => void
}

function CategoryCardInner({ data, showComparison, onToggleComparison }: Props) {
  return (
    <div className="card flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="label mb-0">Category</p>
        <button
          onClick={onToggleComparison}
          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors
            ${showComparison
              ? 'text-accent border-accent/40 bg-accent/10'
              : 'text-muted border-divider hover:text-ink hover:bg-surface2'}`}
        >
          {showComparison ? '↕ vs last month' : 'vs last month'}
        </button>
      </div>
      {showComparison
        ? <CategoryCompare data={data} />
        : <CategoryPie data={data.map(d => ({ name: d.name, value: d.current }))} />}
    </div>
  )
}

export default memo(CategoryCardInner)
