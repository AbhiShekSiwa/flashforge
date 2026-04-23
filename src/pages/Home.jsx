import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSets } from '../hooks/useSets.js'
import SetCard from '../components/SetCard.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import { getSetProgress } from '../utils/spacedRepetition.js'

export default function Home() {
  const { sets, deleteSet } = useSets()
  const navigate = useNavigate()
  const [pendingDelete, setPendingDelete] = useState(null)

  // Sort by lastStudied descending (never-studied sets go last)
  const sortedSets = [...sets].sort((a, b) => {
    if (!a.lastStudied && !b.lastStudied) return 0
    if (!a.lastStudied) return 1
    if (!b.lastStudied) return -1
    return new Date(b.lastStudied) - new Date(a.lastStudied)
  })

  return (
    <div className="bg-[#08070f] min-h-screen">
      <main className="max-w-5xl mx-auto px-4 py-8 relative">
        <div className="absolute inset-0 pointer-events-none" style={{background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%)'}} />
        <div className="flex items-center justify-between mb-8 relative">
          <h1 className="text-3xl font-bold text-white ff-heading" style={{ fontFamily: "'Syne', sans-serif" }}>My Sets</h1>
          <button
            onClick={() => navigate('/import')}
            className="h-10 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors shadow-lg shadow-violet-900/30 border-0"
          >
            + Import Set
          </button>
        </div>

        {sortedSets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center relative">
            <p className="text-4xl mb-4 select-none">📚</p>
            <h2 className="text-xl font-semibold text-zinc-300 mb-2">No sets yet</h2>
            <p className="text-sm text-zinc-500 mb-6">
              Import a CSV or TSV file to get started.
            </p>
            <button
              onClick={() => navigate('/import')}
              className="h-10 px-6 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors shadow-lg shadow-violet-900/30 border-0"
            >
              Import your first set
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 relative">
            {sortedSets.map(set => (
              <SetCard
                key={set.id}
                set={set}
                progress={getSetProgress(set)}
                onDelete={id => setPendingDelete(id)}
              />
            ))}
          </div>
        )}

        <ConfirmModal
          isOpen={pendingDelete !== null}
          message="Delete this set? This can't be undone."
          confirmLabel="Delete"
          onConfirm={() => {
            deleteSet(pendingDelete)
            setPendingDelete(null)
          }}
          onCancel={() => setPendingDelete(null)}
        />
      </main>
    </div>
  )
}
