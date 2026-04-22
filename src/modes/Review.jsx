import { useNavigate, useParams } from 'react-router-dom'

export default function Review() {
  const navigate = useNavigate()
  const { id } = useParams()

  return (
    <main className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center text-center">
      <span className="text-5xl mb-4">🔄</span>
      <h1 className="text-2xl font-bold text-zinc-100 mb-2">Review</h1>
      <p className="text-zinc-500 mb-8">Coming soon</p>
      <button
        onClick={() => navigate(`/sets/${id}`)}
        className="h-10 px-4 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-medium text-sm"
      >
        ← Back to set
      </button>
    </main>
  )
}
