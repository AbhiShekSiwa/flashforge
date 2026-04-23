import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSets } from '../hooks/useSets.js'
import { shuffle } from '../utils/shuffle.js'

// ── Round builder ──────────────────────────────────────────────────────────────

function buildRound(cards, count) {
  const picked = shuffle([...cards]).slice(0, count)
  const tiles = []
  picked.forEach((card, idx) => {
    tiles.push({ id: idx, text: card.term, type: 'term' })
    tiles.push({ id: idx, text: card.definition, type: 'def' })
  })
  return { tiles: shuffle(tiles), count: picked.length }
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

// ── Tile class helper ──────────────────────────────────────────────────────────

function tileClass(state) {
  switch (state) {
    case 'selected': return 'border-2 border-blue-500 bg-blue-900/30 text-white shadow-lg shadow-blue-900/40 scale-[1.03]'
    case 'matched':  return 'border border-green-600 bg-green-900/40 text-green-300 opacity-40 pointer-events-none'
    case 'wrong':    return 'border border-red-500 bg-red-900/40 text-zinc-200 animate-shake'
    default:         return 'border border-zinc-700/60 bg-[#0d1424] text-zinc-100 hover:border-blue-400/60 hover:bg-blue-900/10'
  }
}

function tileKey(id, type) {
  return `${id}-${type}`
}

// ── Position generator ─────────────────────────────────────────────────────────

function generatePositions(tiles) {
  const pos = {}
  const placed = []
  for (const tile of tiles) {
    const key = tileKey(tile.id, tile.type)
    let x, y, attempts = 0
    do {
      x = 2 + Math.random() * 73
      y = 2 + Math.random() * 78
      attempts++
    } while (attempts < 60 && placed.some(p => Math.abs(p.x - x) < 16 && Math.abs(p.y - y) < 14))
    placed.push({ x, y })
    pos[key] = { x, y }
  }
  return pos
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Match() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sets, markStudied } = useSets()
  const set = sets.find(s => s.id === id)

  const totalCards = set?.cards?.length ?? 0

  const [roundCount, setRoundCount] = useState(() => Math.min(8, totalCards))

  // Session state
  const [round, setRound] = useState(null)          // { tiles, count }
  const [tileStates, setTileStates] = useState({})  // key → 'default'|'selected'|'matched'|'wrong'
  const [selected, setSelected] = useState(null)    // { id, type, key } or null
  const [matchedCount, setMatchedCount] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [phase, setPhase] = useState('playing')     // 'playing' | 'results'

  const hasMarkedStudied = useRef(false)
  const timerRef = useRef(null)
  const roundCardCount = useRef(0)

  // Positions — regenerated each time `round` changes
  const positions = useMemo(() => {
    if (!round) return {}
    return generatePositions(round.tiles)
  }, [round])

  // ── Start a new round ───────────────────────────────────────────────────────

  function startRound(count) {
    const newRound = buildRound(set.cards, count)
    roundCardCount.current = newRound.count

    const initStates = {}
    newRound.tiles.forEach(t => { initStates[tileKey(t.id, t.type)] = 'default' })

    setRound(newRound)
    setTileStates(initStates)
    setSelected(null)
    setMatchedCount(0)
    setMistakes(0)
    setElapsed(0)
    setPhase('playing')
  }

  // ── Initialise first round on mount ────────────────────────────────────────

  useEffect(() => {
    if (round !== null) return
    if (!set || totalCards === 0) return
    startRound(Math.min(8, totalCards))
  }, [totalCards]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer ───────────────────────────────────────────────────────────────────

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

  // ── Early guard ─────────────────────────────────────────────────────────────

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

  // ── Tile click handler (symmetric — works for term or def first) ────────────

  function handleTileClick(tileId, type) {
    if (phase !== 'playing') return
    const key = tileKey(tileId, type)
    if (tileStates[key] === 'matched') return

    // Deselect if clicking same tile again
    if (selected && selected.key === key) {
      setTileStates(prev => ({ ...prev, [key]: 'default' }))
      setSelected(null)
      return
    }

    // If no selection yet, select this tile
    if (!selected) {
      setTileStates(prev => ({ ...prev, [key]: 'selected' }))
      setSelected({ id: tileId, type, key })
      return
    }

    // If same type as selected, switch selection to this tile
    if (selected.type === type) {
      setTileStates(prev => ({ ...prev, [selected.key]: 'default', [key]: 'selected' }))
      setSelected({ id: tileId, type, key })
      return
    }

    // Different type — check for a match
    const isMatch = selected.id === tileId

    if (isMatch) {
      const newMatchedCount = matchedCount + 1
      setTileStates(prev => ({ ...prev, [selected.key]: 'matched', [key]: 'matched' }))
      setSelected(null)
      setMatchedCount(newMatchedCount)

      if (newMatchedCount === roundCardCount.current) {
        clearInterval(timerRef.current)
        setPhase('results')
        if (!hasMarkedStudied.current) {
          markStudied(id)
          hasMarkedStudied.current = true
        }
      }
    } else {
      const prevKey = selected.key
      setTileStates(prev => ({ ...prev, [prevKey]: 'wrong', [key]: 'wrong' }))
      setMistakes(prev => prev + 1)
      setTimeout(() => {
        setTileStates(prev => ({
          ...prev,
          ...(prev[prevKey] === 'wrong' ? { [prevKey]: 'default' } : {}),
          ...(prev[key] === 'wrong' ? { [key]: 'default' } : {}),
        }))
      }, 600)
      setSelected(null)
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
        <span className="text-sm font-mono text-blue-300 tabular-nums min-w-[3rem] text-right">
          {formatTime(elapsed)}
        </span>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 bg-[#0d1424] rounded-full h-2 overflow-hidden border border-blue-500/10">
          <div
            className="h-full bg-blue-500 transition-all duration-500 rounded-full"
            style={{ width: `${(matchedCount / roundCardCount.current) * 100}%` }}
          />
        </div>
        <span className="text-xs text-zinc-500 shrink-0">
          {matchedCount}/{roundCardCount.current} matched
        </span>
      </div>

      {/* Scattered board */}
      <div className="relative w-full" style={{ height: '500px' }}>
        {round.tiles.map(tile => {
          const key = tileKey(tile.id, tile.type)
          const pos = positions[key]
          if (!pos) return null
          const state = tileStates[key] ?? 'default'
          return (
            <button
              key={key}
              onClick={() => handleTileClick(tile.id, tile.type)}
              disabled={state === 'matched'}
              style={{
                position: 'absolute',
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                minWidth: '120px',
                maxWidth: '200px',
              }}
              className={[
                'px-4 py-3 rounded-xl text-sm font-medium text-left',
                'transition-all duration-150 cursor-pointer',
                tileClass(state),
              ].join(' ')}
            >
              {tile.text}
            </button>
          )
        })}

        {/* Results overlay */}
        {phase === 'results' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-[#0a0f1e]/95 backdrop-blur-md border border-blue-500/20 rounded-2xl p-8 shadow-2xl text-center max-w-sm w-full mx-4">
              <p className="text-3xl mb-3">✅</p>
              <h2 className="text-2xl font-bold text-zinc-100 mb-1">Round Complete!</h2>

              <div className="flex justify-center gap-1 my-4 text-3xl">
                {[1, 2, 3].map(n => (
                  <span key={n} className={n <= stars ? 'opacity-100' : 'opacity-20'}>
                    ⭐
                  </span>
                ))}
              </div>

              <div className="space-y-1 mb-6 text-sm">
                <p className="text-zinc-300">
                  <span className="text-zinc-500">Time: </span>
                  <span className="font-semibold text-blue-300">
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
                  <p className="text-xs text-blue-400 mt-1">
                    🔥 Nice! Next round adds 2 more cards.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  id="next-round-btn"
                  onClick={() => handleNextRound(mistakes, roundCount)}
                  className="w-full h-11 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-colors font-semibold text-sm"
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

      {/* Hint text */}
      {phase === 'playing' && !selected && matchedCount < roundCardCount.current && (
        <p className="text-center text-xs text-zinc-600 mt-4">
          Click any card to get started
        </p>
      )}
      {phase === 'playing' && selected && (
        <p className="text-center text-xs text-blue-400 mt-4">
          Now click the matching {selected.type === 'term' ? 'definition' : 'term'} →
        </p>
      )}
    </main>
  )
}
