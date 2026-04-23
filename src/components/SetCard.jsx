import { useNavigate } from 'react-router-dom'

export default function SetCard({ set, progress, onDelete }) {
  const navigate = useNavigate()
  const lastStudied = set.lastStudied
    ? new Date(set.lastStudied).toLocaleDateString()
    : 'Never studied'

  return (
    <div
      onClick={() => navigate(`/sets/${set.id}`)}
      className="glass-card relative group cursor-pointer p-5 hover:scale-[1.02] border-l-2 border-l-[#7c3aed]"
    >
      <h3 className="text-base font-bold text-white truncate pr-6" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>{set.name}</h3>
      <p className="text-[#a78bfa]/70 text-sm mt-1">{set.cards.length} cards</p>
      <p className="text-[#a78bfa]/40 text-xs mt-0.5">{lastStudied}</p>

      {progress && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {progress.mastered > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-500/20">
              {progress.mastered} mastered
            </span>
          )}
          {progress.learning > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-violet-900/30 text-violet-400 border border-violet-500/20">
              {progress.learning} learning
            </span>
          )}
          {progress.due > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400 border border-amber-500/20">
              {progress.due} due
            </span>
          )}
          {progress.new > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-400 border border-zinc-600/30">
              {progress.new} new
            </span>
          )}
        </div>
      )}

      <button
        onClick={e => {
          e.stopPropagation()
          onDelete(set.id)
        }}
        className="absolute bottom-4 right-4 text-xs text-[#a78bfa]/30 hover:text-red-400 transition-colors font-medium"
        aria-label="Delete set"
      >
        Delete
      </button>
    </div>
  )
}
