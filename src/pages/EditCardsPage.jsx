import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSets } from '../hooks/useSets.js'

function CardRow({ card, index, onUpdate, onDelete }) {
  function handleChange(field, value) {
    onUpdate(index, field, value)
  }

  return (
    <div className="glass-card p-4 flex gap-4 items-start">
      <span className="text-xs text-[#60a5fa]/30 font-mono w-6 shrink-0 pt-2 text-right select-none">
        {index + 1}
      </span>
      <div className="flex-1 grid grid-cols-2 gap-3">
        <textarea
          className="card-textarea w-full bg-transparent text-white text-sm focus:outline-none border-b border-transparent focus:border-blue-500/50 transition-colors py-1 px-2"
          value={card.term}
          onChange={e => handleChange('term', e.target.value)}
          placeholder="Term"
          rows={1}
        />
        <textarea
          className="card-textarea w-full bg-transparent text-white text-sm focus:outline-none border-b border-transparent focus:border-blue-500/50 transition-colors py-1 px-2"
          value={card.definition}
          onChange={e => handleChange('definition', e.target.value)}
          placeholder="Definition"
          rows={1}
        />
      </div>
      <button
        onClick={() => onDelete(index)}
        className="shrink-0 text-[#60a5fa]/20 hover:text-red-400 transition-colors text-lg pt-1"
        aria-label="Delete card"
      >
        🗑
      </button>
    </div>
  )
}

export default function EditCardsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sets, updateCards } = useSets()

  const set = sets.find(s => s.id === id)

  const [cards, setCards] = useState(() =>
    set ? set.cards.map(c => ({ ...c })) : []
  )
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const updateCard = useCallback((index, field, value) => {
    setCards(prev => {
      const next = prev.map((c, i) => i === index ? { ...c, [field]: value } : c)
      return next
    })
    setHasUnsavedChanges(true)
  }, [])

  const deleteCard = useCallback((index) => {
    setCards(prev => prev.filter((_, i) => i !== index))
    setHasUnsavedChanges(true)
  }, [])

  function addCard() {
    setCards(prev => [...prev, { term: '', definition: '' }])
    setHasUnsavedChanges(true)
  }

  function handleSave() {
    updateCards(id, cards)
    navigate(`/sets/${id}`)
  }

  function handleBack() {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Leave anyway?')) return
    navigate(`/sets/${id}`)
  }

  if (!set) {
    return (
      <div className="bg-[#0a0f1e] min-h-screen">
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-zinc-400 mb-4">Set not found.</p>
          <button onClick={() => navigate('/')} className="text-[#60a5fa]/70 hover:text-[#60a5fa]">
            ← My Sets
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-[#0a0f1e] min-h-screen">
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBack}
            className="text-sm text-[#60a5fa]/70 hover:text-[#60a5fa] transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={addCard}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-900/40 transition-colors"
          >
            ＋ Add Card
          </button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <h1
            className="text-3xl font-bold text-white ff-heading"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Edit Cards
          </h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/30 border border-blue-500/20 text-[#60a5fa]/70 font-mono">
            {cards.length}
          </span>
        </div>

        {/* Column headers */}
        {cards.length > 0 && (
          <div className="flex gap-4 px-4 mb-2">
            <span className="w-6 shrink-0" />
            <div className="flex-1 grid grid-cols-2 gap-3">
              <span className="text-xs uppercase tracking-widest text-[#60a5fa]/40 font-medium px-2">Term</span>
              <span className="text-xs uppercase tracking-widest text-[#60a5fa]/40 font-medium px-2">Definition</span>
            </div>
            <span className="w-6 shrink-0" />
          </div>
        )}

        {/* Card list */}
        <div className="flex flex-col gap-3 mb-8">
          {cards.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              No cards. Add one above ↑
            </div>
          ) : (
            cards.map((card, i) => (
              <CardRow
                key={i}
                card={card}
                index={i}
                onUpdate={updateCard}
                onDelete={deleteCard}
              />
            ))
          )}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base shadow-lg shadow-blue-900/40 transition-colors"
        >
          Save Changes
        </button>
      </main>
    </div>
  )
}
