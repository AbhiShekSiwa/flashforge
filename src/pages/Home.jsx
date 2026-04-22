import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSets } from '../hooks/useSets.js'
import SetCard from '../components/SetCard.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'

export default function Home() {
  const { sets, deleteSet } = useSets()
  const navigate = useNavigate()
  const [pendingDelete, setPendingDelete] = useState(null)

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">My Sets</h1>
        <button
          onClick={() => navigate('/import')}
          className="h-10 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
        >
          + Import Set
        </button>
      </div>

      {sets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-4xl mb-4 select-none">📚</p>
          <h2 className="text-xl font-semibold text-zinc-300 mb-2">No sets yet</h2>
          <p className="text-sm text-zinc-500 mb-6">
            Import a CSV or TSV file to get started.
          </p>
          <button
            onClick={() => navigate('/import')}
            className="h-10 px-6 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors"
          >
            Import your first set
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {sets.map(set => (
            <SetCard
              key={set.id}
              set={set}
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
  )
}
