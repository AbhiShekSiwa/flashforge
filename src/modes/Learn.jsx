import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSets } from '../hooks/useSets.js'
import ProgressBar from '../components/ProgressBar.jsx'
import { shuffle } from '../utils/shuffle.js'
import { similarity } from '../utils/levenshtein.js'

export default function Learn() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sets, markStudied } = useSets()
  const set = sets.find(s => s.id === id)

  const [showSettings, setShowSettings] = useState(true)
  const [settings, setSettings] = useState({
    questionType: 'mixed',
    direction: 'term-to-def',
    starredOnly: false,
  })

  // Core session state
  const [queue, setQueue] = useState([])
  const [currentPos, setCurrentPos] = useState(0)
  const [cardStats, setCardStats] = useState({})
  const [learnedCount, setLearnedCount] = useState(0)
  const [options, setOptions] = useState([])
  const [tfData, setTfData] = useState(null)
  const [phase, setPhase] = useState('question')
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)

  // Enhancement 4 — session-wide consecutive correct streak
  const [sessionStreak, setSessionStreak] = useState(0)
  const [showStreakBurst, setShowStreakBurst] = useState(false)

  // Enhancement 5 — starred cards (localStorage exception per spec)
  const [starredCards, setStarredCards] = useState(() => {
    try {
      const raw = localStorage.getItem('flashforge_starred')
      const data = raw ? JSON.parse(raw) : {}
      return data[id] || []
    } catch { return [] }
  })

  // Enhancement 6 — skip badge
  const [showSkipBadge, setShowSkipBadge] = useState(false)

  // Enhancement 7 — toggleable progress bar
  const [progressMode, setProgressMode] = useState(() => {
    return localStorage.getItem('flashforge_progress_pref') || 'questions'
  })

  // Enhancement 4 — burst animation via useEffect watching sessionStreak
  // sessionStreak is READ (in deps), showStreakBurst is SET (not in deps)
  useEffect(() => {
    if (sessionStreak < 5) {
      setShowStreakBurst(false)
      return
    }
    setShowStreakBurst(true)
    const timer = setTimeout(() => setShowStreakBurst(false), 600)
    return () => clearTimeout(timer)
  }, [sessionStreak])

  // ONE useEffect — generates MC options and TF data for the current card
  // options and tfData are SET here — must NOT be in the dependency array
  // set and cardStats omitted from deps to avoid object identity loops
  useEffect(() => {
    if (showSettings) return
    if (queue.length === 0) return
    if (currentPos >= queue.length) return
    if (phase !== 'question') return
    if (!set) return
    const cardIndex = queue[currentPos]
    const card = set.cards[cardIndex]
    const dir = getDirection(currentPos)
    setOptions(generateOptions(card, set.cards, dir))
    // TF: 50% show correct answer, 50% show a wrong answer
    const isTrue = Math.random() < 0.5
    const otherCards = set.cards.filter(c => c !== card)
    const correctVal = dir === 'term-to-def' ? card.definition : card.term
    const wrongVal = otherCards.length > 0
      ? shuffle(otherCards)[0][dir === 'term-to-def' ? 'definition' : 'term']
      : correctVal
    setTfData({ isTrue, shownDef: isTrue ? correctVal : wrongVal, correctDef: correctVal })
  }, [currentPos, phase, showSettings, queue.length])

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getDirection(pos) {
    if (settings.direction === 'term-to-def') return 'term-to-def'
    if (settings.direction === 'def-to-term') return 'def-to-term'
    return pos % 2 === 0 ? 'term-to-def' : 'def-to-term'
  }

  function generateOptions(card, allCards, direction) {
    const correctValue = direction === 'term-to-def' ? card.definition : card.term
    const distractors = shuffle(allCards.filter(c => c !== card))
      .slice(0, 3)
      .map(c => ({ value: direction === 'term-to-def' ? c.definition : c.term, isCorrect: false }))
    return shuffle([{ value: correctValue, isCorrect: true }, ...distractors])
  }

  function getStage(streak) {
    if (streak >= 3) return 'mastered'
    if (streak >= 1) return 'familiar'
    return 'learning'
  }

  function getStagePill(streak) {
    const stage = getStage(streak)
    const styles = {
      learning: 'bg-red-500/20 text-red-400 border border-red-500/30',
      familiar: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      mastered: 'bg-green-500/20 text-green-400 border border-green-500/30',
    }
    const labels = { learning: 'Learning', familiar: 'Familiar', mastered: 'Mastered ⭐' }
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[stage]}`}>
        {labels[stage]}
      </span>
    )
  }

  function getQuestionType(cardIndex) {
    const stat = cardStats[cardIndex]
    if (!stat) return 'mc'
    if (settings.questionType === 'mc') return 'mc'
    if (settings.questionType === 'tta') return 'tta'
    if (settings.questionType === 'tf') return 'tf'
    // mixed: first show → mc; after wrong → tta; else rotate mc/tta/tf
    if (stat.timesShown === 0) return 'mc'
    if (stat.streak === 0) return 'tta'
    const types = ['mc', 'tta', 'tf']
    return types[stat.timesShown % 3]
  }

  // Shared streak computation — used by handleAnswer and "Got it" handler
  function computeNewStreak(currentStreak, correct) {
    if (correct) return currentStreak + 1
    // Demotion: Mastered (>=3) wrong → Familiar (1); else → Learning (0)
    return currentStreak >= 3 ? 1 : 0
  }

  // ── Session actions ───────────────────────────────────────────────────────

  const startSession = () => {
    if (!set || set.cards.length === 0) return
    let indices = [...Array(set.cards.length).keys()]
    if (settings.starredOnly) {
      indices = indices.filter(i => starredCards.includes(i))
      if (indices.length === 0) return
    }
    const shuffled = shuffle(indices)
    const initialStats = {}
    shuffled.forEach(i => {
      initialStats[i] = { streak: 0, timesShown: 0, learned: false, skips: 0 }
    })
    setQueue(shuffled)
    setCurrentPos(0)
    setCardStats(initialStats)
    setLearnedCount(0)
    setSessionStreak(0)
    setPhase('question')
    setOptions([])
    setTfData(null)
    setShowAnswer(false)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setTypedAnswer('')
    setShowSkipBadge(false)
    setShowSettings(false)
  }

  const handleAnswer = (correct) => {
    const cardIndex = queue[currentPos]
    setIsCorrect(correct)
    setPhase('feedback')

    // Compute new streak synchronously to check round-summary eligibility
    const stat = cardStats[cardIndex]
    const newStreak = computeNewStreak(stat.streak, correct)
    const newLearned = newStreak >= 3

    setCardStats(prev => {
      const s = prev[cardIndex]
      const ns = computeNewStreak(s.streak, correct)
      return { ...prev, [cardIndex]: { ...s, streak: ns, timesShown: s.timesShown + 1, learned: ns >= 3 } }
    })

    setLearnedCount(prevCount => {
      const delta = (newLearned && !stat.learned) ? 1 : (!newLearned && stat.learned) ? -1 : 0
      return prevCount + delta
    })

    setSessionStreak(prev => correct ? prev + 1 : 0)

    // Re-queue logic
    if (correct) {
      if (newStreak < 3) {
        setQueue(prev => {
          const next = [...prev]
          next.splice(Math.min(currentPos + 5, next.length), 0, cardIndex)
          return next
        })
      }
    } else {
      setQueue(prev => {
        const next = [...prev]
        next.splice(Math.min(currentPos + 4, next.length), 0, cardIndex)
        return next
      })
    }

    // Check if all cards are now mastered (using current cardStats snapshot + new result)
    const wouldAllBeMastered = newLearned && Object.entries(cardStats).every(([i, s]) => {
      return parseInt(i) === cardIndex ? newLearned : s.learned
    })

    const delay = correct ? 1200 : 1500
    setTimeout(() => {
      setSelectedAnswer(null)
      setIsCorrect(null)
      setTypedAnswer('')
      setShowAnswer(false)
      if (wouldAllBeMastered) {
        setPhase('round-summary')
      } else {
        setPhase('question')
        setCurrentPos(prev => prev + 1)
      }
    }, delay)
  }

  const handleTypeSubmit = () => {
    if (!set || queue.length === 0) return
    const cardIndex = queue[currentPos]
    const card = set.cards[cardIndex]
    const dir = getDirection(currentPos)
    const correctAnswer = dir === 'term-to-def' ? card.definition : card.term
    const sim = similarity(typedAnswer, correctAnswer)

    if (sim >= 0.8) {
      setShowAnswer(false)
      handleAnswer(true)
    } else if (sim >= 0.6) {
      setShowAnswer(true)
      handleAnswer(true)
    } else {
      setShowAnswer(true)
      setIsCorrect(false)
      setPhase('feedback')
      // wrong TTA: wait for user to click "Got it" — no auto-advance
    }
  }

  const handleSkip = () => {
    const cardIndex = queue[currentPos]
    setCardStats(prev => {
      const s = prev[cardIndex]
      return { ...prev, [cardIndex]: { ...s, skips: (s.skips || 0) + 1 } }
    })
    setQueue(prev => [...prev, cardIndex])
    setShowSkipBadge(true)
    setTimeout(() => {
      setShowSkipBadge(false)
      setCurrentPos(prev => prev + 1)
    }, 600)
  }

  const toggleStar = (cardIndex) => {
    setStarredCards(prev => {
      const next = prev.includes(cardIndex)
        ? prev.filter(i => i !== cardIndex)
        : [...prev, cardIndex]
      try {
        const raw = localStorage.getItem('flashforge_starred')
        const data = raw ? JSON.parse(raw) : {}
        localStorage.setItem('flashforge_starred', JSON.stringify({ ...data, [id]: next }))
      } catch {}
      return next
    })
  }

  const toggleProgressMode = () => {
    setProgressMode(prev => {
      const next = prev === 'questions' ? 'mastered' : 'questions'
      try { localStorage.setItem('flashforge_progress_pref', next) } catch {}
      return next
    })
  }

  const handleEndSession = () => {
    markStudied(id)
    setPhase('complete')
  }

  const resetSessionState = (newQueue, newStats) => {
    setQueue(newQueue)
    setCurrentPos(0)
    setCardStats(newStats)
    setLearnedCount(0)
    setSessionStreak(0)
    setPhase('question')
    setOptions([])
    setTfData(null)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setTypedAnswer('')
    setShowAnswer(false)
    setShowSkipBadge(false)
  }

  const handleRestart = () => {
    if (!set) return
    const shuffled = shuffle([...Array(set.cards.length).keys()])
    const newStats = {}
    shuffled.forEach(i => { newStats[i] = { streak: 0, timesShown: 0, learned: false, skips: 0 } })
    resetSessionState(shuffled, newStats)
  }

  const handleStudyMissedOnly = () => {
    if (!set) return
    const unlearned = Object.entries(cardStats)
      .filter(([, s]) => !s.learned)
      .map(([i]) => parseInt(i))
    if (unlearned.length === 0) { handleRestart(); return }
    const shuffled = shuffle(unlearned)
    const newStats = {}
    shuffled.forEach(i => { newStats[i] = { streak: 0, timesShown: 0, learned: false, skips: 0 } })
    resetSessionState(shuffled, newStats)
  }

  // ── Settings screen ───────────────────────────────────────────────────────

  if (showSettings) {
    const hasStarred = starredCards.length > 0
    const startDisabled = settings.starredOnly && !hasStarred

    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-8"
        >
          ← Back
        </button>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">🧠 Learn — Settings</h1>
          <p className="text-zinc-400 text-sm mb-8">Customize your learning session</p>
        </div>

        <div className="bg-zinc-800 rounded-lg p-6 space-y-8 mb-8">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Question Type</h2>
            <div className="space-y-3">
              {[
                { value: 'mc', label: 'Multiple Choice only' },
                { value: 'tta', label: 'Type the Answer only' },
                { value: 'tf', label: 'True/False only' },
                { value: 'mixed', label: 'Mixed (all three alternating)', isDefault: true },
              ].map(option => (
                <label key={option.value} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="questionType"
                    value={option.value}
                    checked={settings.questionType === option.value}
                    onChange={e => setSettings(prev => ({ ...prev, questionType: e.target.value }))}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span className="ml-3 text-zinc-200">
                    {option.label}
                    {option.isDefault && <span className="text-zinc-400 text-sm ml-1">(default)</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Direction</h2>
            <div className="space-y-3">
              {[
                { value: 'term-to-def', label: 'Term → Definition', isDefault: true },
                { value: 'def-to-term', label: 'Definition → Term' },
                { value: 'mixed', label: 'Mixed' },
              ].map(option => (
                <label key={option.value} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="direction"
                    value={option.value}
                    checked={settings.direction === option.value}
                    onChange={e => setSettings(prev => ({ ...prev, direction: e.target.value }))}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span className="ml-3 text-zinc-200">
                    {option.label}
                    {option.isDefault && <span className="text-zinc-400 text-sm ml-1">(default)</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Options</h2>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.starredOnly}
                onChange={e => setSettings(prev => ({ ...prev, starredOnly: e.target.checked }))}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="ml-3 text-zinc-200">⭐ Study starred cards only</span>
            </label>
            {settings.starredOnly && !hasStarred && (
              <p className="mt-2 text-sm text-yellow-400 ml-7">
                No starred cards yet — star cards during your session to use this feature
              </p>
            )}
          </div>
        </div>

        <button
          onClick={startSession}
          disabled={startDisabled}
          className="w-full h-12 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium text-base disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Start Learning
        </button>
      </main>
    )
  }

  // ── Post-settings render guards ───────────────────────────────────────────

  if (!set || !set.cards || set.cards.length === 0) {
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

  // ── Round summary screen (Enhancement 3) ─────────────────────────────────

  if (phase === 'round-summary') {
    const masteredEntries = Object.entries(cardStats).filter(([, s]) => s.streak >= 3)
    const familiarEntries = Object.entries(cardStats).filter(([, s]) => s.streak >= 1 && s.streak < 3)
    const learningEntries = Object.entries(cardStats).filter(([, s]) => s.streak === 0)
    const totalCards = set.cards.length

    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <p className="text-5xl mb-3">🎯</p>
          <h1 className="text-2xl font-bold text-zinc-100 mb-1">Round Complete!</h1>
          <p className="text-zinc-400 text-sm">{learnedCount} of {totalCards} mastered</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-800 rounded-lg p-4">
            <h2 className="text-green-400 font-semibold mb-3 text-sm">
              Mastered ✅ ({masteredEntries.length})
            </h2>
            <div className="space-y-1">
              {masteredEntries.map(([i]) => (
                <p key={i} className="text-zinc-300 text-xs truncate">{set.cards[parseInt(i)]?.term}</p>
              ))}
              {masteredEntries.length === 0 && <p className="text-zinc-500 text-xs">None yet</p>}
            </div>
          </div>

          <div className="bg-zinc-800 rounded-lg p-4">
            <h2 className="text-yellow-400 font-semibold mb-3 text-sm">
              Familiar 🟡 ({familiarEntries.length})
            </h2>
            <div className="space-y-1">
              {familiarEntries.map(([i]) => (
                <p key={i} className="text-zinc-300 text-xs truncate">{set.cards[parseInt(i)]?.term}</p>
              ))}
              {familiarEntries.length === 0 && <p className="text-zinc-500 text-xs">None</p>}
            </div>
          </div>

          <div className="bg-zinc-800 rounded-lg p-4">
            <h2 className="text-red-400 font-semibold mb-3 text-sm">
              Still Learning 🔴 ({learningEntries.length})
            </h2>
            <div className="space-y-1">
              {learningEntries.map(([i]) => (
                <p key={i} className="text-zinc-300 text-xs truncate">{set.cards[parseInt(i)]?.term}</p>
              ))}
              {learningEntries.length === 0 && <p className="text-zinc-500 text-xs">None</p>}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { markStudied(id); setPhase('complete') }}
            className="h-10 px-6 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium text-sm"
          >
            Continue
          </button>
          <button
            onClick={handleStudyMissedOnly}
            className="h-10 px-5 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-medium text-sm"
          >
            Study Again
          </button>
        </div>
      </main>
    )
  }

  // ── Completion screen ─────────────────────────────────────────────────────

  if (phase === 'complete') {
    const totalCards = set.cards.length
    const allDone = learnedCount === totalCards
    const completionMsg = allDone
      ? `🎉 You've mastered all ${totalCards} cards!`
      : `Session ended — ${learnedCount} of ${totalCards} mastered`
    const unlearnedIndices = Object.entries(cardStats)
      .filter(([, s]) => !s.learned)
      .map(([i]) => parseInt(i))

    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-6"
        >
          ← Back
        </button>

        <div className="text-center mb-8">
          {allDone && <p className="text-5xl mb-4">🎉</p>}
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">{completionMsg}</h1>
        </div>

        <div className="bg-zinc-800 rounded-lg overflow-hidden mb-8">
          <div className="grid grid-cols-3 gap-4 p-4 bg-zinc-700 font-medium text-sm text-zinc-200">
            <div>Card</div>
            <div>Stage</div>
            <div>Status</div>
          </div>
          <div className="divide-y divide-zinc-700">
            {set.cards.map((card, i) => {
              const stat = cardStats[i]
              return (
                <div key={i} className="grid grid-cols-3 gap-4 p-4 text-sm">
                  <div className="text-zinc-300 truncate">{card.term}</div>
                  <div>{getStagePill(stat?.streak || 0)}</div>
                  <div className={stat?.learned ? 'text-green-400' : 'text-red-400'}>
                    {stat?.learned ? '✅ Mastered' : '❌ Not yet'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleRestart}
            className="h-10 px-5 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-medium text-sm"
          >
            Restart
          </button>
          {unlearnedIndices.length > 0 && (
            <button
              onClick={handleStudyMissedOnly}
              className="h-10 px-5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium text-sm"
            >
              Study Missed Only
            </button>
          )}
        </div>
      </main>
    )
  }

  // ── Loading guard ─────────────────────────────────────────────────────────

  if (queue.length === 0 || options.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400">Preparing your session…</p>
      </main>
    )
  }

  // ── Active session ────────────────────────────────────────────────────────

  const cardIndex = queue[currentPos]
  const currentCard = set.cards[cardIndex]

  if (!showSettings && queue.length > 0 && !currentCard) {
    return null
  }

  const card = currentCard
  const dir = getDirection(currentPos)
  const questionType = getQuestionType(cardIndex)
  const question = dir === 'term-to-def' ? card.term : card.definition
  const correctAnswer = dir === 'term-to-def' ? card.definition : card.term
  const prompt = dir === 'term-to-def' ? 'Select the correct definition:' : 'Select the correct term:'
  const totalCards = set.cards.length
  const currentStat = cardStats[cardIndex]
  const isStarred = starredCards.includes(cardIndex)

  // Enhancement 7 — progress bar values
  const progressValue = progressMode === 'questions'
    ? queue.length > 0 ? currentPos / queue.length : 0
    : learnedCount / totalCards
  const progressLabel = progressMode === 'questions'
    ? `Question ${currentPos + 1} of ${queue.length}`
    : `${learnedCount} of ${totalCards} mastered`

  // Enhancement 4 — streak display
  const streakDisplay = sessionStreak >= 10 ? '🔥🔥' : sessionStreak > 0 ? `🔥 ${sessionStreak}` : null

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3">
          {streakDisplay && (
            <span
              className={`text-sm font-bold transition-transform duration-150 inline-block ${showStreakBurst ? 'scale-150' : 'scale-100'}`}
            >
              {streakDisplay}
            </span>
          )}
          <span className="text-sm font-medium text-zinc-300">
            {currentPos + 1} / {queue.length}
          </span>
        </div>
        <button
          onClick={handleEndSession}
          className="text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          End Session
        </button>
      </div>

      {/* Progress bar with toggle (Enhancement 7) */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <ProgressBar
            value={progressValue}
            label={progressLabel}
            color={progressMode === 'mastered' ? 'green' : 'indigo'}
          />
        </div>
        <button
          onClick={toggleProgressMode}
          className="text-lg leading-none p-1 rounded hover:bg-zinc-700 transition-colors"
          title={progressMode === 'questions' ? 'Switch to mastered view' : 'Switch to questions view'}
        >
          {progressMode === 'questions' ? '📊' : '⭐'}
        </button>
      </div>

      {/* Card area */}
      <div className="mt-8">
        {/* Stage pill + star button */}
        <div className="flex items-center justify-between mb-4">
          <div>{currentStat && getStagePill(currentStat.streak)}</div>
          <button
            onClick={() => toggleStar(cardIndex)}
            className={`text-xl leading-none transition-colors ${isStarred ? 'text-yellow-400' : 'text-zinc-600 hover:text-zinc-400'}`}
            title={isStarred ? 'Unstar card' : 'Star card'}
          >
            ⭐
          </button>
        </div>

        {/* Skip badge */}
        {showSkipBadge && (
          <div className="text-center text-zinc-400 text-sm mb-4 animate-pulse">
            Skipped →
          </div>
        )}

        <div className="text-center">
          {/* ── Multiple Choice ── */}
          {questionType === 'mc' && (
            <>
              <p className="text-zinc-400 text-sm mb-4">{prompt}</p>
              <div className="text-3xl font-bold text-zinc-100 mb-8">{question}</div>
              <div className="grid grid-cols-2 gap-4">
                {options.map((option, idx) => {
                  let bg = 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
                  if (selectedAnswer === option) {
                    bg = option.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  } else if (phase === 'feedback' && option.isCorrect) {
                    bg = 'bg-green-500 text-white'
                  } else if (phase === 'feedback') {
                    bg = 'bg-zinc-600 text-zinc-400'
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (phase !== 'question') return
                        setSelectedAnswer(option)
                        handleAnswer(option.isCorrect)
                      }}
                      disabled={phase !== 'question'}
                      className={`p-4 rounded-lg font-medium text-sm transition-all ${bg} ${phase !== 'question' ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      {option.value}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* ── Type the Answer ── */}
          {questionType === 'tta' && (
            <>
              <p className="text-zinc-400 text-sm mb-4">
                {dir === 'term-to-def' ? 'Type the definition:' : 'Type the term:'}
              </p>
              <div className="text-3xl font-bold text-zinc-100 mb-8">{question}</div>

              {showAnswer && (
                <div className={`rounded-lg p-4 mb-6 text-center ${isCorrect ? 'bg-green-900/40' : 'bg-red-900/40'}`}>
                  <p className="text-zinc-200">
                    {isCorrect
                      ? `✅ Close enough! The exact answer: ${correctAnswer}`
                      : `❌ Correct answer: ${correctAnswer}`}
                  </p>
                </div>
              )}

              {phase === 'question' && (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={typedAnswer}
                    onChange={e => setTypedAnswer(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleTypeSubmit()}
                    placeholder="Type your answer…"
                    autoFocus
                    className="w-full h-12 px-4 rounded-lg bg-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleTypeSubmit}
                    disabled={!typedAnswer.trim()}
                    className="w-full h-10 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Check Answer
                  </button>
                </div>
              )}

              {phase === 'feedback' && !isCorrect && (
                <button
                  onClick={() => {
                    // Wrong TTA answer — apply demotion logic same as handleAnswer
                    const s = cardStats[cardIndex]
                    const ns = computeNewStreak(s.streak, false)
                    const newLearned = ns >= 3
                    setCardStats(prev => {
                      const cur = prev[cardIndex]
                      const nextStreak = computeNewStreak(cur.streak, false)
                      return { ...prev, [cardIndex]: { ...cur, streak: nextStreak, timesShown: cur.timesShown + 1, learned: nextStreak >= 3 } }
                    })
                    setLearnedCount(prev => {
                      const delta = (newLearned && !s.learned) ? 1 : (!newLearned && s.learned) ? -1 : 0
                      return prev + delta
                    })
                    setSessionStreak(0)
                    setQueue(prev => {
                      const next = [...prev]
                      next.splice(Math.min(currentPos + 4, next.length), 0, cardIndex)
                      return next
                    })
                    setSelectedAnswer(null)
                    setIsCorrect(null)
                    setTypedAnswer('')
                    setShowAnswer(false)
                    setPhase('question')
                    setCurrentPos(prev => prev + 1)
                  }}
                  className="h-10 px-6 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-medium text-sm"
                >
                  Got it
                </button>
              )}
            </>
          )}

          {/* ── True / False (Enhancement 1) ── */}
          {questionType === 'tf' && tfData && (
            <>
              <p className="text-zinc-400 text-sm mb-4">Is this definition correct for the term shown?</p>
              <div className="text-3xl font-bold text-zinc-100 mb-3">{question}</div>
              <div className={`rounded-lg p-4 mb-8 ${
                phase === 'feedback'
                  ? (isCorrect ? 'bg-green-900/30 border border-green-500/30' : 'bg-red-900/30 border border-red-500/30')
                  : 'bg-zinc-800'
              }`}>
                <p className="text-zinc-200 text-lg">{tfData.shownDef}</p>
                {phase === 'feedback' && !isCorrect && (
                  <p className="text-zinc-400 text-sm mt-2">
                    Correct answer: {tfData.correctDef}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: '✓ True', value: true },
                  { label: '✗ False', value: false },
                ].map(({ label, value }) => {
                  const userPicked = selectedAnswer === value
                  const isCorrectChoice = tfData.isTrue === value
                  let bg = 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600'
                  if (phase === 'feedback') {
                    if (userPicked) {
                      bg = isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    } else if (isCorrectChoice) {
                      bg = 'bg-green-500 text-white'
                    } else {
                      bg = 'bg-zinc-600 text-zinc-400'
                    }
                  }
                  return (
                    <button
                      key={String(value)}
                      onClick={() => {
                        if (phase !== 'question') return
                        setSelectedAnswer(value)
                        handleAnswer(value === tfData.isTrue)
                      }}
                      disabled={phase !== 'question'}
                      className={`p-4 rounded-lg font-semibold text-base transition-all ${bg} ${phase !== 'question' ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Skip button (Enhancement 6) */}
        {phase === 'question' && !showSkipBadge && (
          <div className="text-center mt-6">
            <button
              onClick={handleSkip}
              className="text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              Skip →
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
