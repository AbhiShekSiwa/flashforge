import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSets } from '../hooks/useSets.js'
import { shuffle } from '../utils/shuffle.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const DIFF = {
  easy:   { label: '🟢 Easy',   secs: 9, border: 'border-green-500',  pill: 'bg-green-900/60 text-green-300',  text: 'Easy' },
  medium: { label: '🟡 Medium', secs: 6, border: 'border-yellow-400', pill: 'bg-yellow-900/60 text-yellow-300', text: 'Medium' },
  hard:   { label: '🔴 Hard',   secs: 3, border: 'border-red-500',    pill: 'bg-red-900/60 text-red-300',     text: 'Hard' },
}

const HS_KEY = 'flashforge_highscores'
const LANE_TOPS = [5, 22, 40, 58] // % of asteroid field height

// ── Pure helpers ──────────────────────────────────────────────────────────────

function readHS() {
  try { return JSON.parse(localStorage.getItem(HS_KEY) || '{}') } catch { return {} }
}

function saveHS(setId, score, difficulty) {
  const data = readHS()
  data[setId] = { score, date: new Date().toISOString(), difficulty }
  localStorage.setItem(HS_KEY, JSON.stringify(data))
}

function makeQuestion(allCards, card, direction) {
  const prompt        = direction === 'term-to-def' ? card.term       : card.definition
  const correctAnswer = direction === 'term-to-def' ? card.definition : card.term
  const field         = direction === 'term-to-def' ? 'definition'    : 'term'
  const others        = shuffle(allCards.filter(c => c !== card))
  const distractors   = []
  for (let i = 0; distractors.length < 3; i++) {
    distractors.push(i < others.length ? others[i][field] : correctAnswer + ' ·'.repeat(distractors.length + 1))
  }
  const options = shuffle([correctAnswer, ...distractors])
  return { prompt, correctAnswer, options, correctIdx: options.indexOf(correctAnswer) }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Blast() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { sets }   = useSets()
  const set        = sets.find(s => s.id === id)
  const totalCards = set?.cards?.length ?? 0

  // Settings — persist across Play Again
  const [difficulty, setDifficulty] = useState('medium')
  const [direction,  setDirection]  = useState('term-to-def')
  const [gamePhase,  setGamePhase]  = useState('settings')

  // Game state
  const [lives,      setLives]      = useState(3)
  const [score,      setScore]      = useState(0)
  const [streak,     setStreak]     = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [correctCt,  setCorrectCt]  = useState(0)
  const [totalCt,    setTotalCt]    = useState(0)

  // Card queue
  const [cardQueue, setCardQueue] = useState([])
  const [qIdx,      setQIdx]      = useState(0)

  // Question display
  const [question,     setQuestion]     = useState(null)
  const [innerPhase,   setInnerPhase]   = useState('question')
  const [feedbackType, setFeedbackType] = useState(null)
  const [clickedIdx,   setClickedIdx]   = useState(-1)
  const [laneOrder,    setLaneOrder]    = useState([0, 1, 2, 3])

  // Timer
  const [questionKey, setQuestionKey] = useState(0)
  const [timeRatio,   setTimeRatio]   = useState(1)
  const timerRef     = useRef(null)
  const startTimeRef = useRef(null)

  // UI effects
  const [scorePopText,  setScorePopText]  = useState(null)
  const [streakBanner,  setStreakBanner]  = useState(null)
  const [bgFlash,       setBgFlash]       = useState(null)

  // Game over
  const [isNewHS, setIsNewHS] = useState(false)
  const [prevHS,  setPrevHS]  = useState(null)

  // Stale-closure-safe refs — updated synchronously before any setTimeout
  const livesRef      = useRef(3)
  const scoreRef      = useRef(0)
  const streakRef     = useRef(0)
  const bestStreakRef = useRef(0)
  const correctCtRef  = useRef(0)
  const totalCtRef    = useRef(0)
  const innerPhaseRef = useRef('question')
  const cardQueueRef  = useRef([])

  const timeLimit = DIFF[difficulty].secs

  // ── Timer effect ────────────────────────────────────────────────────────────
  // READ: questionKey, innerPhase, gamePhase  |  SET: timeRatio (not in deps)
  useEffect(() => {
    if (gamePhase !== 'playing') return
    if (innerPhase !== 'question') return

    startTimeRef.current = Date.now()
    setTimeRatio(1)

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const ratio   = Math.max(0, 1 - elapsed / timeLimit)
      setTimeRatio(ratio)
      if (ratio <= 0) {
        clearInterval(timerRef.current)
        handleTimeout()
      }
    }, 50)

    return () => clearInterval(timerRef.current)
  }, [questionKey, innerPhase, gamePhase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Build question effect ───────────────────────────────────────────────────
  // READ: cardQueue.length (primitive), qIdx  |  SET: question, etc. (not in deps)
  useEffect(() => {
    if (cardQueueRef.current.length === 0) return
    if (gamePhase !== 'playing') return
    if (!set) return

    const q = cardQueueRef.current[qIdx % cardQueueRef.current.length]
    const built = makeQuestion(set.cards, q, direction)
    setQuestion(built)
    setLaneOrder(shuffle([0, 1, 2, 3]))
    setInnerPhase('question')
    innerPhaseRef.current = 'question'
    setFeedbackType(null)
    setClickedIdx(-1)
  }, [cardQueue.length, qIdx, gamePhase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Guard ───────────────────────────────────────────────────────────────────

  if (!set || totalCards === 0) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">{!set ? 'Set not found.' : 'This set has no cards.'}</p>
          <button onClick={() => navigate('/')}
            className="h-10 px-4 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors text-sm">
            Back to My Sets
          </button>
        </div>
      </main>
    )
  }

  // ── Game actions ─────────────────────────────────────────────────────────────

  function startGame() {
    const q = shuffle([...set.cards])
    cardQueueRef.current = q
    setCardQueue(q)
    setQIdx(0)
    setLives(3);      livesRef.current      = 3
    setScore(0);      scoreRef.current      = 0
    setStreak(0);     streakRef.current     = 0
    setBestStreak(0); bestStreakRef.current = 0
    setCorrectCt(0);  correctCtRef.current  = 0
    setTotalCt(0);    totalCtRef.current    = 0
    setTimeRatio(1)
    setInnerPhase('question'); innerPhaseRef.current = 'question'
    setFeedbackType(null)
    setClickedIdx(-1)
    setQuestionKey(k => k + 1)
    setGamePhase('playing')
  }

  function doAdvance() {
    const curLives = livesRef.current
    const curScore = scoreRef.current

    if (curLives <= 0) {
      const hs  = readHS()
      const old = hs[id]?.score ?? null
      setPrevHS(old)
      if (old === null || curScore > old) {
        setIsNewHS(true)
        saveHS(id, curScore, difficulty)
      } else {
        setIsNewHS(false)
      }
      setGamePhase('gameover')
      return
    }

    // Advance queue index (loop with reshuffle)
    setQIdx(prev => {
      const next = prev + 1
      if (next >= cardQueueRef.current.length) {
        const reshuffled = shuffle([...set.cards])
        cardQueueRef.current = reshuffled
        setCardQueue(reshuffled)
        return 0
      }
      return next
    })
    setQuestionKey(k => k + 1)
  }

  function handleTimeout() {
    if (innerPhaseRef.current !== 'question') return
    innerPhaseRef.current = 'feedback'
    clearInterval(timerRef.current)

    const newLives = livesRef.current - 1
    livesRef.current = newLives
    setLives(newLives)
    streakRef.current = 0
    setStreak(0)
    totalCtRef.current++
    setTotalCt(totalCtRef.current)
    setInnerPhase('feedback')
    setFeedbackType('timeout')
    setBgFlash('wrong')
    setTimeout(() => setBgFlash(null), 300)
    setTimeout(doAdvance, 1200)
  }

  function handleAsteroidClick(optionIdx) {
    if (innerPhaseRef.current !== 'question') return
    innerPhaseRef.current = 'feedback'
    clearInterval(timerRef.current)

    const isCorrect = (optionIdx === question.correctIdx)
    const elapsed   = (Date.now() - startTimeRef.current) / 1000
    const speedBonus = elapsed < timeLimit * 0.25

    setInnerPhase('feedback')
    setClickedIdx(optionIdx)
    totalCtRef.current++
    setTotalCt(totalCtRef.current)

    if (isCorrect) {
      let pts = 10 + (speedBonus ? 5 : 0)

      const newStreak = streakRef.current + 1
      streakRef.current = newStreak
      setStreak(newStreak)
      if (newStreak > bestStreakRef.current) {
        bestStreakRef.current = newStreak
        setBestStreak(newStreak)
      }

      // Streak milestone bonus
      let milestoneBonus = 0
      if (newStreak === 5)  milestoneBonus = 5
      if (newStreak === 10) milestoneBonus = 10
      if (milestoneBonus > 0) {
        setStreakBanner(`🔥 Streak bonus! +${milestoneBonus}`)
        setTimeout(() => setStreakBanner(null), 1500)
        pts += milestoneBonus
      }

      const newScore = scoreRef.current + pts
      scoreRef.current = newScore
      setScore(newScore)
      correctCtRef.current++
      setCorrectCt(correctCtRef.current)
      setFeedbackType('correct')
      setScorePopText(`+${pts}${speedBonus ? ' ⚡' : ''}`)
      setTimeout(() => setScorePopText(null), 800)
      setBgFlash('correct')
      setTimeout(() => setBgFlash(null), 300)
      setTimeout(doAdvance, 500)

    } else {
      const newLives = livesRef.current - 1
      livesRef.current = newLives
      setLives(newLives)
      streakRef.current = 0
      setStreak(0)
      setFeedbackType('wrong')
      setBgFlash('wrong')
      setTimeout(() => setBgFlash(null), 300)
      setTimeout(doAdvance, 1200)
    }
  }

  // ── Timer bar color ──────────────────────────────────────────────────────────

  function timerBarClass() {
    if (timeRatio > 0.6)  return 'bg-green-500'
    if (timeRatio > 0.25) return 'bg-yellow-400'
    return 'bg-red-500 animate-pulse'
  }

  // ── Asteroid tile appearance ─────────────────────────────────────────────────

  function asteroidClass(idx) {
    const base = 'w-24 h-24 rounded-full border-2 flex items-center justify-center p-2 cursor-pointer transition-colors duration-150 select-none text-center text-xs font-semibold leading-tight'
    if (innerPhase === 'feedback') {
      if (idx === question?.correctIdx)
        return `${base} bg-green-400 border-green-300 text-gray-900 scale-110`
      if (idx === clickedIdx && feedbackType === 'wrong')
        return `${base} bg-red-500 border-red-300 text-white`
    }
    return `${base} bg-gray-700 border-gray-500 text-gray-100 hover:bg-gray-600 hover:border-blue-400`
  }

  // ── High score for settings screen ──────────────────────────────────────────

  const settingsHS = readHS()[id]?.score ?? null

  // ── SCREEN: SETTINGS ────────────────────────────────────────────────────────

  if (gamePhase === 'settings') {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <button onClick={() => navigate(-1)}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-8 block">
            ← Back
          </button>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-white mb-2">💥 Blast</h1>
            <p className="text-zinc-500 text-sm">
              {settingsHS !== null
                ? <span>Best: <span className="text-yellow-400 font-bold">{settingsHS}</span></span>
                : 'Best: —'}
            </p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 mb-6 space-y-6">
            {/* Difficulty */}
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Difficulty</h2>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(DIFF).map(([key, cfg]) => (
                  <button
                    key={key}
                    id={`diff-${key}`}
                    onClick={() => setDifficulty(key)}
                    className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      difficulty === key
                        ? `${cfg.border} bg-gray-800 text-white`
                        : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {cfg.label}
                    <div className="text-xs font-normal text-gray-500 mt-1">{cfg.secs}s / card</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Direction */}
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Direction</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: 'term-to-def', label: 'Term → Definition' },
                  { val: 'def-to-term', label: 'Definition → Term' },
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => setDirection(opt.val)}
                    className={`py-3 px-2 rounded-xl border-2 text-sm font-medium transition-all ${
                      direction === opt.val
                        ? 'border-blue-500 bg-blue-900/40 text-white'
                        : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            id="start-blast-btn"
            onClick={startGame}
            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg transition-colors shadow-lg shadow-blue-900/50"
          >
            🚀 Start Blast
          </button>
        </div>
      </main>
    )
  }

  // ── SCREEN: GAME OVER ────────────────────────────────────────────────────────

  if (gamePhase === 'gameover') {
    const accuracy = totalCtRef.current > 0
      ? Math.round((correctCtRef.current / totalCtRef.current) * 100)
      : null

    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-4xl font-black text-white mb-6">💥 Game Over</h1>

          <div className="bg-gray-900 rounded-2xl p-8 mb-6 space-y-4">
            <div>
              <p className="text-zinc-500 text-sm mb-1">Final Score</p>
              <p className="text-6xl font-black text-white">{scoreRef.current}</p>
            </div>

            {isNewHS ? (
              <p className="text-yellow-400 font-bold text-lg">🏆 New High Score!</p>
            ) : (
              prevHS !== null && (
                <p className="text-zinc-500 text-sm">Best: <span className="text-zinc-300">{prevHS}</span></p>
              )
            )}

            <div className="border-t border-gray-800 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Correct answers</span>
                <span className="text-white font-semibold">{correctCtRef.current} / {totalCtRef.current}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Accuracy</span>
                <span className="text-white font-semibold">{accuracy !== null ? `${accuracy}%` : '—'}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Best streak</span>
                <span className="text-white font-semibold">{bestStreakRef.current} 🔥</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              id="play-again-btn"
              onClick={startGame}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors"
            >
              🔄 Play Again
            </button>
            <button
              id="change-difficulty-btn"
              onClick={() => setGamePhase('settings')}
              className="w-full h-12 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold transition-colors"
            >
              ⚙️ Change Difficulty
            </button>
            <button
              id="back-to-set-btn"
              onClick={() => navigate(-1)}
              className="w-full h-12 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold transition-colors"
            >
              ← Back to Set
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── SCREEN: PLAYING ───────────────────────────────────────────────────────────

  const bgFlashClass = bgFlash === 'correct'
    ? 'bg-green-950'
    : bgFlash === 'wrong'
    ? 'bg-red-950'
    : 'bg-gray-950'

  return (
    <>
      {/* Asteroid CSS keyframe animations */}
      <style>{`
        @keyframes floatAcross {
          from { transform: translateX(110vw); }
          to   { transform: translateX(-20vw); }
        }
        @keyframes verticalDrift {
          0%, 100% { margin-top: 0px; }
          50%       { margin-top: 15px; }
        }
      `}</style>

      <main className={`min-h-screen flex flex-col transition-colors duration-150 ${bgFlashClass}`}
        style={{ height: '100dvh', overflow: 'hidden' }}>

        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80 backdrop-blur shrink-0">
          {/* Lives */}
          <div className="text-xl tracking-tight">
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i}>{i < lives ? '❤️' : '🖤'}</span>
            ))}
          </div>

          {/* Score + pop */}
          <div className="relative text-center">
            <p className="text-zinc-400 text-xs">Score</p>
            <p className="text-white font-black text-xl tabular-nums">{score}</p>
            {scorePopText && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-yellow-400 font-bold text-sm whitespace-nowrap animate-bounce">
                {scorePopText}
              </span>
            )}
          </div>

          {/* Streak + difficulty */}
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold transition-opacity ${streak >= 2 ? 'opacity-100' : 'opacity-0'}`}>
              🔥 {streak}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DIFF[difficulty].pill}`}>
              {DIFF[difficulty].text}
            </span>
          </div>
        </div>

        {/* Streak banner */}
        {streakBanner && (
          <div className="bg-orange-900/80 text-orange-300 text-center text-sm font-bold py-1 shrink-0">
            {streakBanner}
          </div>
        )}

        {/* ── ASTEROID FIELD ── */}
        <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
          {question && question.options.map((opt, idx) => {
            const lane       = laneOrder[idx]
            const topPct     = LANE_TOPS[lane]
            const delayMap   = [0, 0.4, 0.8, 1.2]
            const animDelay  = `${-delayMap[idx]}s`
            const paused     = innerPhase === 'feedback'
            const aniState   = paused ? 'paused' : 'running'

            return (
              <div
                key={`${questionKey}-${idx}`}
                id={`asteroid-${idx}`}
                onClick={() => handleAsteroidClick(idx)}
                className={asteroidClass(idx)}
                style={{
                  position: 'absolute',
                  top: `${topPct}%`,
                  animationName: 'floatAcross, verticalDrift',
                  animationDuration: `${timeLimit}s, 3s`,
                  animationTimingFunction: 'linear, ease-in-out',
                  animationIterationCount: '1, infinite',
                  animationFillMode: 'forwards, none',
                  animationDelay: `${animDelay}, ${delayMap[idx] * 0.5}s`,
                  animationPlayState: aniState,
                  boxShadow: 'inset -4px -4px 8px rgba(0,0,0,0.5), inset 2px 2px 4px rgba(255,255,255,0.1)',
                }}
              >
                <span className="text-xs leading-tight text-center break-words"
                  style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {opt}
                </span>
              </div>
            )
          })}

          {/* Timeout overlay */}
          {feedbackType === 'timeout' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <p className="text-white font-bold text-lg bg-gray-900/90 px-6 py-3 rounded-xl">
                ⏰ Time&apos;s up!
              </p>
            </div>
          )}
        </div>

        {/* ── QUESTION ZONE ── */}
        <div className="bg-gray-900 shrink-0" style={{ minHeight: '32%' }}>
          {/* Timer bar */}
          <div className="w-full h-1.5 bg-gray-800 rounded-t">
            <div
              className={`h-full rounded-t transition-all ease-linear ${timerBarClass()}`}
              style={{ width: `${timeRatio * 100}%`, transitionDuration: '100ms' }}
            />
          </div>

          <div className="px-4 pt-4 pb-6">
            {/* Prompt */}
            <p className="text-white font-semibold text-xl text-center leading-snug mb-2"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
              {question?.prompt ?? '…'}
            </p>
            <p className="text-center text-xs text-gray-600">Tap the correct answer →</p>
          </div>
        </div>
      </main>
    </>
  )
}
