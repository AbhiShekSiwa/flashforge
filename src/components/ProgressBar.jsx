const COLOR_MAP = {
  indigo: 'bg-indigo-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
}

export default function ProgressBar({ value, label, color = 'indigo' }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  const barColor = COLOR_MAP[color] ?? COLOR_MAP.indigo

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-sm text-zinc-400 mb-1.5">
          <span>{label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#7c3aed] rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
