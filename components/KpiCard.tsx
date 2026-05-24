type Props = {
  total: number
  prevTotal: number
  month: string
}

export default function KpiCard({ total, prevTotal, month }: Props) {
  const diff = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null
  const up = diff !== null && diff > 0

  return (
    <div className="card">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{month}</p>
      <p className="text-4xl font-bold text-slate-100 mt-2">
        ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </p>
      {diff !== null && (
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
            ${up ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'}`}>
            {up ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}%
          </span>
          <span className="text-xs text-slate-600">vs last month</span>
        </div>
      )}
    </div>
  )
}
