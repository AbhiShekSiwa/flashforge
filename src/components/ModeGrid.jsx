import { useNavigate, useParams } from 'react-router-dom'

const MODES = [
  { key: 'flashcards', label: 'Flashcards', icon: '🃏', desc: 'Browse & flip' },
  { key: 'learn',      label: 'Learn',      icon: '🧠', desc: 'Adaptive practice' },
  { key: 'test',       label: 'Test',       icon: '📝', desc: 'Mock exam' },
  { key: 'match',      label: 'Match',      icon: '🔗', desc: 'Click-to-pair' },
  { key: 'blast',      label: 'Blast',      icon: '💥', desc: 'Fast-paced quiz' },
  { key: 'review',     label: 'Review',     icon: '🔄', desc: 'Spaced repetition' },
]

export default function ModeGrid() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {MODES.map(({ key, label, icon, desc }) => (
        <button
          key={key}
          onClick={() => navigate(`/sets/${id}/${key}`)}
          className="group flex flex-col items-center gap-2 rounded-xl bg-zinc-800 border border-zinc-700 p-6 hover:bg-indigo-600 hover:border-indigo-500 transition-all duration-200"
        >
          <span className="text-3xl">{icon}</span>
          <span className="text-sm font-medium text-zinc-200 group-hover:text-white">{label}</span>
          <span className="text-xs text-zinc-400 group-hover:text-indigo-200">{desc}</span>
        </button>
      ))}
    </div>
  )
}
