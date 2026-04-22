import { useParams, useNavigate } from 'react-router-dom'
import { useSets } from '../hooks/useSets.js'
import ModeGrid from '../components/ModeGrid.jsx'

export default function SetDetail() {
  const { id } = useParams()
  const { sets } = useSets()
  const navigate = useNavigate()

  const set = sets.find(s => s.id === id)

  if (!set) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-16 flex flex-col items-center text-center">
        <p className="text-zinc-400 text-lg mb-4">Set not found.</p>
        <button
          onClick={() => navigate('/')}
          className="h-10 px-4 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-medium"
        >
          Back to My Sets
        </button>
      </main>
    )
  }

  const createdDate = new Date(set.createdAt).toLocaleDateString()

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/')}
        className="mb-6 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        ← My Sets
      </button>

      <h1 className="text-3xl font-bold text-zinc-100 mb-2">{set.name}</h1>
      <div className="flex gap-4 text-sm text-zinc-500 mb-10">
        <span>{set.cards.length} cards</span>
        <span>Created {createdDate}</span>
      </div>

      <h2 className="text-base font-semibold text-zinc-300 mb-4">Choose a study mode</h2>
      <ModeGrid />
    </main>
  )
}
