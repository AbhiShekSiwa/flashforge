import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSets } from '../hooks/useSets.js'
import FlipCard from '../components/FlipCard.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { shuffle } from '../utils/shuffle.js'

export default function Flashcards() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sets, markStudied } = useSets()
  const set = sets.find(s => s.id === id)

  const indexed = set ? set.cards.map((card, i) => ({ card, idx: i })) : []

  const [isShuffled, setIsShuffled] = useState(true)
  const [displayOrder, setDisplayOrder] = useState(() => shuffle(indexed))
  const [currentPos, setCurrentPos] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [starred, setStarred] = useState(new Set())
  const [done, setDone] = useState(false)

  const total = displayOrder.length
  const isLast = currentPos === total - 1
  const currentItem = displayOrder[currentPos]
  const isStarred = currentItem ? starred.has(currentItem.idx) : false

  const handleFlip = useCallback(() => {
    setIsFlipped(f => !f)
  }, [])

  const goNext = useCallback(() => {
    setIsFlipped(false)
    if (isLast) {
      setDone(true)
      markStudied(id)
    } else {
      setCurrentPos(p => p + 1)
    }
  }, [isLast, markStudied, id])

  const goPrev = useCallback(() => {
    setIsFlipped(false)
    setCurrentPos(p => Math.max(0, p - 1))
  }, [])

  // Feature 4: keyboard shortcuts — Space/→ next, ← prev, F flip
  // READ: done, goNext, goPrev, handleFlip; SET: nothing directly (via callbacks)
  useEffect(() => {
    if (done) return
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.code === 'Space' || e.code === 'ArrowRight') { e.preventDefault(); goNext() }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); goPrev() }
      else if (e.key === 'f' || e.key === 'F') handleFlip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done, goNext, goPrev, handleFlip])

  function toggleShuffle() {
    if (isShuffled) {
      setDisplayOrder([...indexed])
      setIsShuffled(false)
    } else {
      setDisplayOrder(shuffle(indexed))
      setIsShuffled(true)
    }
    setCurrentPos(0)
    setIsFlipped(false)
  }

  function toggleStar() {
    if (!currentItem) return
    const { idx } = currentItem
    setStarred(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function studyAgain() {
    setCurrentPos(0)
    setIsFlipped(false)
    setDone(false)
  }

  function shuffleAndRestart() {
    setDisplayOrder(shuffle(indexed))
    setIsShuffled(true)
    setCurrentPos(0)
    setIsFlipped(false)
    setDone(false)
  }

  if (!set || total === 0) {
    return (
      <div className="bg-[#0a0f1e] min-h-screen">
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-zinc-400 mb-4">{!set ? 'Set not found.' : 'This set has no cards.'}</p>
          <button
            onClick={() => navigate('/')}
            className="h-10 px-4 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-medium text-sm"
          >
            Back to My Sets
          </button>
        </main>
      </div>
    )
  }

  if (done) {
    return (
      <div className="bg-[#0a0f1e] min-h-screen">
        <main className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center text-center">
          <p className="text-5xl mb-4">🎉</p>
          <h1 className="text-2xl font-bold text-white mb-2">
            You've reviewed all {total} cards!
          </h1>
          <div className="flex gap-3 mt-8">
            <button
              onClick={studyAgain}
              className="h-10 px-5 rounded-lg border border-[rgba(96,165,250,0.3)] text-[#60a5fa] hover:bg-blue-900/20 transition-colors font-medium text-sm"
            >
              Study Again
            </button>
            <button
              onClick={shuffleAndRestart}
              className="h-10 px-5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium text-sm shadow-lg shadow-blue-900/40"
            >
              Shuffle & Restart
            </button>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 text-sm text-[#60a5fa]/50 hover:text-[#60a5fa] transition-colors"
          >
            ← Back to Set
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-[#0a0f1e] min-h-screen">
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-[#60a5fa]/70 hover:text-[#60a5fa] transition-colors"
          >
            ← Back
          </button>
          <span className="text-sm font-medium text-zinc-300">
            {currentPos + 1} / {total}
          </span>
          <button
            onClick={toggleShuffle}
            className={`h-8 px-3 rounded-lg text-sm font-medium transition-colors border border-[rgba(96,165,250,0.3)] text-[#60a5fa] hover:bg-blue-900/20 ${
              isShuffled ? 'bg-blue-900/20' : ''
            }`}
          >
            🔀 Shuffle
          </button>
        </div>

        <ProgressBar value={(currentPos + 1) / total} />

        <div
          className={`mt-6 mb-4 rounded-2xl transition-shadow duration-200 ${
            isStarred ? 'ring-2 ring-yellow-400' : ''
          }`}
        >
          <FlipCard
            front={currentItem.card.term}
            back={currentItem.card.definition}
            flipped={isFlipped}
            onFlip={handleFlip}
          />
        </div>

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={goPrev}
            disabled={currentPos === 0}
            className="border border-[rgba(96,165,250,0.3)] text-[#60a5fa] hover:bg-blue-900/20 px-6 py-2.5 rounded-xl transition-all font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <button
            onClick={toggleStar}
            className={`text-2xl leading-none transition-colors ${
              isStarred ? 'text-[#60a5fa]' : 'text-zinc-600 hover:text-zinc-400'
            }`}
            aria-label="Star this card"
          >
            {isStarred ? '★' : '☆'}
          </button>
          <button
            onClick={goNext}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/40 text-sm"
          >
            {isLast ? 'Finish' : 'Next →'}
          </button>
        </div>
      </main>

      {/* Feature 4: keyboard hint bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-4 text-xs text-blue-400/40 bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full border border-blue-500/10 pointer-events-none">
        <span>Space / → Next</span>
        <span>← Prev</span>
        <span>F Flip</span>
      </div>
    </div>
  )
}
