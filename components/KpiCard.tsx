type Props = {
  total: number
  prevTotal: number
  month: string
}

export default function KpiCard({ total, prevTotal, month }: Props) {
  const diff = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null
  const up = diff !== null && diff > 0

  return (
    <div className="bg-brand-600 rounded-2xl p-5 text-white shadow-md">
      <p className="text-brand-100 text-sm font-medium">{month}</p>
      <p className="text-4xl font-bold mt-1">
        ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </p>
      {diff !== null && (
        <p className={`text-sm mt-1 ${up ? 'text-red-200' : 'text-green-200'}`}>
          {up ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}% vs last month
        </p>
      )}
    </div>
  )
}
