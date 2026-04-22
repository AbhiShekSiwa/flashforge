import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSets } from '../hooks/useSets.js'
import FlipCard from '../components/FlipCard.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { shuffle } from '../utils/shuffle.js'
import { getCardsForReview, updateCardAfterReview } from '../utils/spacedRepetition.js'

const RATINGS = [
  { key: 'again', label: 'Again 🔴', bg: 'bg-red-600 hover:bg-red-500',       ring: 'ring-red-500',    badge: 'bg-red-900/50 text-red-400' },
  { key: 'hard',  label: 'Hard 🟡',  bg: 'bg-yellow-600 hover:bg-yellow-500', ring: 'ring-yellow-500', badge: 'bg-yellow-900/50 text-yellow-400' },
  { key: 'good',  label: 'Good 🟢',  bg: 'bg-green-600 hover:bg-green-500',   ring: 'ring-green-500',  badge: 'bg-green-900/50 text-green-400' },
  { key: 'easy',  label: 'Easy 🔵',  bg: 'bg-blue-600 hover:bg-blue-500',     ring: 'ring-blue-500',   badge: 'bg-blue-900/50 text-blue-400' },
]

function getNextDueDisplay(set) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const srData = set.srData ?? {}
  let earliest = null

  for (const entry of Object.values(srData)) {
    if (entry?.nextReview) {
      const d = new Date(entry.nextReview)
      if (!earliest || d < earliest) earliest = d
    }
  }

  if (!earliest) return 'No scheduled reviews'
  const diffDays = Math.ceil((earliest - today) / 86400000)
  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays <= 7) return `in ${diffDays} days`
  return earliest.toLocaleDateString()
}

export default function Review() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sets, updateSrData, markStudied } = useSets()
  const set = sets.find(s => s.id === id)

  const [queue] = useState(() => {
    if (!set) return []
    return shuffle(getCardsForReview(set))
  })
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [flashColor, setFlashColor] = useState(null)
  const [reviewed, setReviewed] = useState([])
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done) markStudied(id)
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  const rate = useCallback((rating) => {
    if (flashColor !== null || !queue.length || currentIdx >= queue.length) return
    const { card, cardIndex } = queue[currentIdx]
    const newSrData = updateCardAfterReview(set.srData, cardIndex, rating)
    updateSrData(id, newSrData)
    setReviewed(prev => [
      ...prev,
      { term: card.term, rating, nextReview: newSrData[String(cardIndex)].nextReview },
    ])
    setFlashColor(rating)
    setTimeout(() => {
      setFlashColor(null)
      setIsFlipped(false)
      if (currentIdx >= queue.length - 1) setDone(true)
      else setCurrentIdx(i => i + 1)
    }, 400)
  }, [flashColor, queue, currentIdx, set?.srData, id, updateSrData])

  useEffect(() => {
    if (!isFlipped || done) return
    function onKey(e) {
      const map = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' }
      const r = map[e.key]
      if (r) rate(r)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFlipped, done, rate])

  if (!set) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400 mb-4">Set not found.</p>
        <button
          onClick={() => navigate('/')}
          className="h-10 px-4 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-medium text-sm"
        >
          Back to My Sets
        </button>
      </main>
    )
  }

  if (queue.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center text-center">
        <p className="text-4xl mb-4">✅</p>
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">You're all caught up!</h1>
        <p className="text-zinc-400 mb-8">
          Next card due:{' '}
          <span className="text-zinc-200 font-medium">{getNextDueDisplay(set)}</span>
        </p>
        <button
          onClick={() => navigate(-1)}
          className="h-10 px-4 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-medium text-sm"
        >
          ← Back to Set
        </button>
      </main>
    )
  }

  if (done) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">Session complete!</h1>
        <p className="text-zinc-400 mb-8">
          Reviewed {reviewed.length} card{reviewed.length !== 1 ? 's' : ''}.
        </p>

        <div className="rounded-xl border border-zinc-700 overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800 border-b border-zinc-700">
                <th className="px-4 py-2.5 text-left text-zinc-400 font-medium">Term</th>
                <th className="px-4 py-2.5 text-left text-zinc-400 font-medium">Rating</th>
                <th className="px-4 py-2.5 text-left text-zinc-400 font-medium">Next Review</th>
              </tr>
            </thead>
            <tbody>
              {reviewed.map((r, i) => {
                const ratingMeta = RATINGS.find(x => x.key === r.rating)
                return (
                  <tr key={i} className="border-t border-zinc-800">
                    <td className="px-4 py-2.5 text-zinc-300 max-w-xs truncate">{r.term}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${ratingMeta?.badge}`}>
                        {r.rating}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400 text-xs">{r.nextReview}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="h-10 px-4 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-medium text-sm"
        >
          ← Back to Set
        </button>
      </main>
    )
  }

  const currentItem = queue[currentIdx]
  const flashRing = flashColor ? RATINGS.find(r => r.key === flashColor)?.ring : null

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Back
        </button>
        <span className="text-sm text-zinc-400">
          {queue.length - currentIdx} card{queue.length - currentIdx !== 1 ? 's' : ''} remaining
        </span>
      </div>

      <ProgressBar value={currentIdx / queue.length} label="Progress" />

      <div
        className={`mt-6 mb-4 rounded-2xl transition-all duration-200 ${
          flashRing ? `ring-2 ${flashRing}` : ''
        }`}
        onClick={() => { if (!isFlipped) setIsFlipped(true) }}
      >
        <FlipCard
          key={currentIdx}
          front={currentItem.card.term}
          back={currentItem.card.definition}
        />
      </div>

      {isFlipped ? (
        <div className="grid grid-cols-4 gap-3 mt-4">
          {RATINGS.map(({ key, label, bg }) => (
            <button
              key={key}
              onClick={() => rate(key)}
              disabled={flashColor !== null}
              className={`h-11 rounded-lg text-white font-medium text-sm transition-colors disabled:opacity-50 ${bg}`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-zinc-500 mt-4">
          Click the card to reveal the answer, then rate yourself
        </p>
      )}

      {isFlipped && (
        <p className="text-center text-xs text-zinc-600 mt-3">
          Keyboard: 1 Again · 2 Hard · 3 Good · 4 Easy
        </p>
      )}
    </main>
  )
}
