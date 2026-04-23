import { useNavigate } from 'react-router-dom'

export default function SetCard({ set, progress, onDelete }) {
  const navigate = useNavigate()
  const lastStudied = set.lastStudied
    ? new Date(set.lastStudied).toLocaleDateString()
    : 'Never studied'

  return (
    <div
      onClick={() => navigate(`/sets/${set.id}`)}
      className="relative group cursor-pointer rounded-xl bg-zinc-800 border border-zinc-700 p-5 hover:border-indigo-500 hover:scale-[1.02] transition-all duration-200"
    >
      <h3 className="text-base font-bold text-zinc-100 truncate pr-6">{set.name}</h3>
      <p className="mt-1 text-sm text-zinc-400">{set.cards.length} cards</p>
      <p className="mt-0.5 text-xs text-zinc-500">{lastStudied}</p>

      {progress && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {progress.mastered > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/50 text-green-400">
              {progress.mastered} mastered
            </span>
          )}
          {progress.learning > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-900/50 text-indigo-400">
              {progress.learning} learning
            </span>
          )}
          {progress.due > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-900/50 text-yellow-400">
              {progress.due} due
            </span>
          )}
          {progress.new > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">
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
        className="absolute bottom-4 right-4 text-xs text-zinc-500 hover:text-red-400 transition-colors font-medium"
        aria-label="Delete set"
      >
        Delete
      </button>
    </div>
  )
}
