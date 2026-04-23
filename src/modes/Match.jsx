import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSets } from '../hooks/useSets.js'
import { shuffle } from '../utils/shuffle.js'

// ── Round builder ──────────────────────────────────────────────────────────────

function buildRound(cards, count) {
  const picked = shuffle([...cards]).slice(0, count)
  // Each tile carries an index into `picked` so we can match pairs
  const terms = shuffle(picked.map((card, idx) => ({ id: idx, text: card.term })))
  const defs  = shuffle(picked.map((card, idx) => ({ id: idx, text: card.definition })))
  return { terms, defs }
}

// ── Timer helpers ──────────────────────────────────────────────────────────────

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Star rating ────────────────────────────────────────────────────────────────

function getStars(mistakes) {
  if (mistakes <= 1) return 3
  if (mistakes <= 4) return 2
  return 1
}

// ── Tile state helpers ─────────────────────────────────────────────────────────

// tileState: 'default' | 'selected' | 'matched' | 'wrong'
function tileClass(state) {
  switch (state) {
    case 'selected': return 'border-2 border-indigo-500 bg-zinc-800 text-white scale-[1.03] shadow-lg shadow-indigo-900/40'
    case 'matched':  return 'border border-green-600 bg-green-900/40 text-green-300 opacity-50 scale-[1.04]'
    case 'wrong':    return 'border border-red-500 bg-red-900/40 text-zinc-200 animate-shake'
    default:         return 'border border-zinc-700 bg-zinc-800 text-zinc-100 hover:border-indigo-400 hover:bg-zinc-750'
  }
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Match() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sets, markStudied } = useSets()
  const set = sets.find(s => s.id === id)

  const totalCards = set?.cards?.length ?? 0

  // roundCount: how many cards to use this round (scales up on success)
  const [roundCount, setRoundCount] = useState(() => Math.min(8, totalCards))

  // Session state
  const [round, setRound] = useState(null)           // { terms, defs }
  const [termStates, setTermStates]   = useState({}) // id → tile state string
  const [defStates, setDefStates]     = useState({}) // id → tile state string
  const [selectedTerm, setSelectedTerm] = useState(null) // id or null
  const [matchedCount, setMatchedCount] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [phase, setPhase] = useState('playing')      // 'playing' | 'results'

  // Refs — stable, never in deps
  const hasMarkedStudied = useRef(false)
  const timerRef = useRef(null)
  const roundCardCount = useRef(0) // how many pairs in current round

  // ── Start a new round ───────────────────────────────────────────────────────

  function startRound(count) {
    const newRound = buildRound(set.cards, count)
    roundCardCount.current = newRound.terms.length

    // Initialise all tiles to 'default'
    const termInit = {}
    const defInit  = {}
    newRound.terms.forEach(t => { termInit[t.id] = 'default' })
    newRound.defs.forEach(d  => { defInit[d.id]  = 'default' })

    setRound(newRound)
    setTermStates(termInit)
    setDefStates(defInit)
    setSelectedTerm(null)
    setMatchedCount(0)
    setMistakes(0)
    setElapsed(0)
    setPhase('playing')
  }

  // ── Initialise first round on mount ────────────────────────────────────────
  // READ: set (via set?.cards?.length primitive), roundCount
  // SET: startRound() sets multiple states — none of those go in deps here
  // Guard: round === null ensures this runs exactly once on mount
  useEffect(() => {
    if (round !== null) return
    if (!set || totalCards === 0) return
    startRound(Math.min(8, totalCards))
  }, [totalCards]) // eslint-disable-line react-hooks/exhaustive-deps
  // `set` and `totalCards` are stable after first load; startRound is a plain function

  // ── Timer: count up while playing ──────────────────────────────────────────
  // READ: phase
  // SET: elapsed — NOT in deps
  useEffect(() => {
    if (phase !== 'playing') {
      clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Early guard: invalid set ────────────────────────────────────────────────

  if (!set || totalCards === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400 mb-4">{!set ? 'Set not found.' : 'This set has no cards.'}</p>
        <button
          onClick={() => navigate('/')}
          className="h-10 px-4 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-medium text-sm"
        >
          Back to My Sets
        </button>
      </main>
    )
  }

  if (!round) return null

  // ── Interaction handlers ────────────────────────────────────────────────────

  function handleTermClick(termId) {
    if (phase !== 'playing') return
    if (termStates[termId] === 'matched') return

    // Click already-selected term → deselect
    if (selectedTerm === termId) {
      setSelectedTerm(null)
      setTermStates(prev => ({ ...prev, [termId]: 'default' }))
      return
    }

    // Deselect previous term (if any), select new one
    setTermStates(prev => {
      const next = { ...prev }
      if (selectedTerm !== null) next[selectedTerm] = 'default'
      next[termId] = 'selected'
      return next
    })
    setSelectedTerm(termId)
  }

  function handleDefClick(defId) {
    if (phase !== 'playing') return
    if (defStates[defId] === 'matched') return
    if (selectedTerm === null) return

    const isMatch = selectedTerm === defId

    if (isMatch) {
      // ✅ Correct
      const newMatchedCount = matchedCount + 1

      setTermStates(prev => ({ ...prev, [selectedTerm]: 'matched' }))
      setDefStates(prev  => ({ ...prev, [defId]:        'matched' }))
      setSelectedTerm(null)
      setMatchedCount(newMatchedCount)

      // Check round complete
      if (newMatchedCount === roundCardCount.current) {
        clearInterval(timerRef.current)
        setPhase('results')

        // markStudied exactly once per session
        if (!hasMarkedStudied.current) {
          markStudied(id)
          hasMarkedStudied.current = true
        }
      }
    } else {
      // ❌ Wrong — flash both red for 600ms then reset
      setTermStates(prev => ({ ...prev, [selectedTerm]: 'wrong' }))
      setDefStates(prev  => ({ ...prev, [defId]:        'wrong' }))
      setMistakes(prev => prev + 1)

      const flashTerm = selectedTerm // capture for timeout closure
      setTimeout(() => {
        setTermStates(prev => {
          // Only reset if still 'wrong' (not matched since)
          if (prev[flashTerm] === 'wrong') return { ...prev, [flashTerm]: 'default' }
          return prev
        })
        setDefStates(prev => {
          if (prev[defId] === 'wrong') return { ...prev, [defId]: 'default' }
          return prev
        })
      }, 600)

      setSelectedTerm(null)
    }
  }

  // ── Next round ──────────────────────────────────────────────────────────────

  function handleNextRound(currentMistakes, currentRoundCount) {
    const nextCount = currentMistakes <= 1
      ? Math.min(totalCards, currentRoundCount + 2)
      : currentRoundCount
    setRoundCount(nextCount)
    startRound(nextCount)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const stars = getStars(mistakes)

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-lg font-semibold text-zinc-100">🔗 Match</h1>
        <span className="text-sm font-mono text-indigo-300 tabular-nums min-w-[3rem] text-right">
          {formatTime(elapsed)}
        </span>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-500 rounded-full"
            style={{ width: `${(matchedCount / roundCardCount.current) * 100}%` }}
          />
        </div>
        <span className="text-xs text-zinc-500 shrink-0">
          {matchedCount}/{roundCardCount.current} matched
        </span>
      </div>

      {/* Board */}
      <div className="grid grid-cols-2 gap-4 relative">
        {/* Terms column */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 text-center">Term</p>
          {round.terms.map(tile => (
            <button
              key={tile.id}
              id={`term-${tile.id}`}
              onClick={() => handleTermClick(tile.id)}
              disabled={termStates[tile.id] === 'matched'}
              className={[
                'w-full min-h-[68px] px-4 py-3 rounded-xl text-sm font-medium text-left',
                'transition-all duration-150 cursor-pointer',
                tileClass(termStates[tile.id] ?? 'default'),
              ].join(' ')}
            >
              {tile.text}
            </button>
          ))}
        </div>

        {/* Definitions column */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 text-center">Definition</p>
          {round.defs.map(tile => (
            <button
              key={tile.id}
              id={`def-${tile.id}`}
              onClick={() => handleDefClick(tile.id)}
              disabled={defStates[tile.id] === 'matched'}
              className={[
                'w-full min-h-[68px] px-4 py-3 rounded-xl text-sm font-medium text-left',
                'transition-all duration-150',
                selectedTerm !== null && defStates[tile.id] !== 'matched'
                  ? 'cursor-pointer'
                  : defStates[tile.id] === 'matched'
                  ? 'cursor-default'
                  : 'cursor-default opacity-60',
                tileClass(defStates[tile.id] ?? 'default'),
              ].join(' ')}
            >
              {tile.text}
            </button>
          ))}
        </div>

        {/* Results overlay */}
        {phase === 'results' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-2xl p-8 shadow-2xl text-center max-w-sm w-full mx-4">
              <p className="text-3xl mb-3">✅</p>
              <h2 className="text-2xl font-bold text-zinc-100 mb-1">Round Complete!</h2>

              {/* Stars */}
              <div className="flex justify-center gap-1 my-4 text-3xl">
                {[1, 2, 3].map(n => (
                  <span key={n} className={n <= stars ? 'opacity-100' : 'opacity-20'}>
                    ⭐
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="space-y-1 mb-6 text-sm">
                <p className="text-zinc-300">
                  <span className="text-zinc-500">Time: </span>
                  <span className="font-semibold text-indigo-300">
                    Completed in {formatTime(elapsed)}
                  </span>
                </p>
                <p className="text-zinc-300">
                  <span className="text-zinc-500">Mistakes: </span>
                  <span className={`font-semibold ${mistakes === 0 ? 'text-green-400' : mistakes <= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {mistakes} mistake{mistakes !== 1 ? 's' : ''}
                  </span>
                </p>
                {mistakes <= 1 && roundCount < totalCards && (
                  <p className="text-xs text-indigo-400 mt-1">
                    🔥 Nice! Next round adds 2 more cards.
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                <button
                  id="next-round-btn"
                  onClick={() => handleNextRound(mistakes, roundCount)}
                  className="w-full h-11 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-semibold text-sm"
                >
                  Next Round →
                </button>
                <button
                  id="back-to-set-btn"
                  onClick={() => navigate(-1)}
                  className="w-full h-11 rounded-xl bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-semibold text-sm"
                >
                  Back to Set
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hint text when no term selected */}
      {phase === 'playing' && selectedTerm === null && matchedCount < roundCardCount.current && (
        <p className="text-center text-xs text-zinc-600 mt-6">
          Click a <span className="text-zinc-400">term</span> to get started
        </p>
      )}
      {phase === 'playing' && selectedTerm !== null && (
        <p className="text-center text-xs text-indigo-400 mt-6">
          Now click the matching definition →
        </p>
      )}
    </main>
  )
}
