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
          className="glass-card group flex flex-col items-start gap-2 p-6 hover:scale-[1.03] text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-violet-900/30 flex items-center justify-center text-2xl mb-3 border border-violet-500/20">
            {icon}
          </div>
          <span className="text-sm font-semibold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>{label}</span>
          <span className="text-xs text-[#a78bfa]/50">{desc}</span>
        </button>
      ))}
    </div>
  )
}
