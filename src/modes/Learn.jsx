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

  const [settings, setSettings] = useState({
    questionType: 'mixed',
    direction: 'term-to-def',
    starredOnly: false,
  })

  const [settingsOpen, setSettingsOpen] = useState(false)

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

  // Feature 1: wrong cards this round
  const [wrongThisRound, setWrongThisRound] = useState([])

  // Feature 2: session streak (already existed — keeping same var name)
  const [sessionStreak, setSessionStreak] = useState(0)
  const [showStreakBurst, setShowStreakBurst] = useState(false)

  // Starred cards (localStorage exception per spec)
  const [starredCards, setStarredCards] = useState(() => {
    try {
      const raw = localStorage.getItem('flashforge_starred')
      const data = raw ? JSON.parse(raw) : {}
      return data[id] || []
    } catch { return [] }
  })

  const [showSkipBadge, setShowSkipBadge] = useState(false)

  const [progressMode, setProgressMode] = useState(() => {
    return localStorage.getItem('flashforge_progress_pref') || 'questions'
  })

  // Feature 2: streak burst animation
  // READ: sessionStreak; SET: showStreakBurst (not in deps)
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
  useEffect(() => {
    if (queue.length === 0) return
    if (currentPos >= queue.length) return
    if (phase !== 'question') return
    if (!set) return
    const cardIndex = queue[currentPos]
    const card = set.cards[cardIndex]
    const qType = getQuestionType(cardIndex)
    const dir = getDirection(currentPos, qType)
    setOptions(generateOptions(card, set.cards, dir))
    // TF: 50% show correct answer, 50% show a wrong answer
    const isTrue = Math.random() < 0.5
    const otherCards = set.cards.filter(c => c !== card)
    const correctVal = dir === 'term-to-def' ? card.definition : card.term
    const wrongVal = otherCards.length > 0
      ? shuffle(otherCards)[0][dir === 'term-to-def' ? 'definition' : 'term']
      : correctVal
    setTfData({ isTrue, shownDef: isTrue ? correctVal : wrongVal, correctDef: correctVal })
  }, [currentPos, phase, queue.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-start session on mount
  useEffect(() => {
    startSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Helpers ──────────────────────────────────────────────────────────────

  // Feature 5: direction mixing only applies to MC
  function getDirection(pos, qType) {
    if (settings.direction === 'term-to-def') return 'term-to-def'
    if (settings.direction === 'def-to-term') return 'def-to-term'
    // mixed: alternate only for MC; TTA/TF default to term-to-def
    if (qType !== 'mc') return 'term-to-def'
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
      learning: 'bg-blue-900/40 text-blue-300 border border-blue-500/20',
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

  function computeNewStreak(currentStreak, correct) {
    if (correct) return currentStreak + 1
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
    setWrongThisRound([])
  }

  const handleAnswer = (correct) => {
    const cardIndex = queue[currentPos]
    setIsCorrect(correct)
    setPhase('feedback')

    const stat = cardStats[cardIndex]
    const newStreak = computeNewStreak(stat.streak, correct)
    const newLearned = newStreak >= 3

    // Feature 1: track wrong cards this round
    if (!correct) {
      setWrongThisRound(prev => prev.includes(cardIndex) ? prev : [...prev, cardIndex])
    }

    setCardStats(prev => {
      const s = prev[cardIndex]
      const ns = computeNewStreak(s.streak, correct)
      return { ...prev, [cardIndex]: { ...s, streak: ns, timesShown: s.timesShown + 1, learned: ns >= 3 } }
    })

    setLearnedCount(prevCount => {
      const delta = (newLearned && !stat.learned) ? 1 : (!newLearned && stat.learned) ? -1 : 0
      return prevCount + delta
    })

    // Feature 2: streak tracking
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
    const qType = getQuestionType(cardIndex)
    const dir = getDirection(currentPos, qType)
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
    setWrongThisRound([])
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

  // Feature 1: study only the cards answered wrong this round
  const handleStudyWrongCards = () => {
    if (!set || wrongThisRound.length === 0) return
    const shuffled = shuffle([...wrongThisRound])
    const newStats = {}
    shuffled.forEach(i => { newStats[i] = { streak: 0, timesShown: 0, learned: false, skips: 0 } })
    resetSessionState(shuffled, newStats)
  }

  // ── Post-mount render guards ───────────────────────────────────────────

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

  // ── Round summary screen (Feature 1 redesign) ────────────────────────────

  if (phase === 'round-summary') {
    const totalThisRound = Object.keys(cardStats).length
    const correctCount = totalThisRound - wrongThisRound.length
    const pct = totalThisRound > 0 ? correctCount / totalThisRound : 1
    const headline = pct >= 0.7 ? 'Round Complete! 🎉' : 'Keep going 💪'

    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold text-white mb-2 ff-heading"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            {headline}
          </h1>
          <p className="text-zinc-400">
            {correctCount} / {totalThisRound} correct this round
          </p>
        </div>

        {wrongThisRound.length > 0 && (
          <div className="glass-card p-4 mb-6">
            <h2 className="text-xs uppercase tracking-widest text-[#60a5fa]/50 font-medium mb-3">
              Missed cards
            </h2>
            <div className="space-y-2">
              {wrongThisRound.map(i => (
                <div key={i} className="border border-blue-500/10 rounded-lg p-3">
                  <p className="text-white font-medium text-sm">{set.cards[i]?.term}</p>
                  <p className="text-zinc-400 text-sm mt-0.5">{set.cards[i]?.definition}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={handleStudyWrongCards}
            disabled={wrongThisRound.length === 0}
            className="h-10 px-5 rounded-lg border border-[rgba(96,165,250,0.3)] text-[#60a5fa] hover:bg-blue-900/20 transition-colors font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Study missed cards again
          </button>
          <button
            onClick={handleRestart}
            className="h-10 px-5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium text-sm"
          >
            Study all cards again
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

        <div className="bg-[#0d1424] rounded-lg overflow-hidden mb-8">
          <div className="grid grid-cols-3 gap-4 p-4 bg-[#111c30] font-medium text-sm text-zinc-200">
            <div>Card</div>
            <div>Stage</div>
            <div>Status</div>
          </div>
          <div className="divide-y divide-zinc-800">
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

  if (queue.length > 0 && !currentCard) {
    return null
  }

  const card = currentCard
  const questionType = getQuestionType(cardIndex)
  const dir = getDirection(currentPos, questionType)
  const question = dir === 'term-to-def' ? card.term : card.definition
  const correctAnswer = dir === 'term-to-def' ? card.definition : card.term
  const prompt = dir === 'term-to-def' ? 'Select the correct definition:' : 'Select the correct term:'
  const totalCards = set.cards.length
  const currentStat = cardStats[cardIndex]
  const isStarred = starredCards.includes(cardIndex)

  const progressValue = progressMode === 'questions'
    ? queue.length > 0 ? currentPos / queue.length : 0
    : learnedCount / totalCards
  const progressLabel = progressMode === 'questions'
    ? `Question ${currentPos + 1} of ${queue.length}`
    : `${learnedCount} of ${totalCards} mastered`

  // Feature 2: show streak at >= 2
  const streakDisplay = sessionStreak >= 2 ? `🔥 ${sessionStreak}` : null
  const streakGlow = sessionStreak >= 5

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* Floating settings button */}
      <button
        onClick={() => setSettingsOpen(true)}
        style={{ position: 'fixed', top: '5rem', right: '1.5rem', zIndex: 50 }}
        className="flex items-center justify-center w-10 h-10 rounded-xl border border-blue-500/30 text-blue-400 hover:bg-blue-900/20 hover:border-blue-500/50 transition-all backdrop-blur-sm bg-black/30"
      >
        ⚙
      </button>

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
              className={`text-sm font-bold text-orange-400 transition-transform duration-150 inline-block ${showStreakBurst ? 'scale-150' : 'scale-100'} ${streakGlow ? 'streak-glow' : ''}`}
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
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/30 px-3 py-1 rounded-lg"
        >
          End Session
        </button>
      </div>

      {/* Progress bar with toggle */}
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

        {showSkipBadge && (
          <div className="text-center text-zinc-400 text-sm mb-4 animate-pulse">
            Skipped →
          </div>
        )}

        <div className="text-center">
          {/* ── Multiple Choice ── */}
          {questionType === 'mc' && (
            <McQuestion
              prompt={prompt}
              question={question}
              options={options}
              phase={phase}
              selectedAnswer={selectedAnswer}
              onAnswer={(option) => {
                if (phase !== 'question') return
                setSelectedAnswer(option)
                handleAnswer(option.isCorrect)
              }}
              onKeySelect={(idx) => {
                if (phase !== 'question' || !options[idx]) return
                setSelectedAnswer(options[idx])
                handleAnswer(options[idx].isCorrect)
              }}
              currentPos={currentPos}
            />
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
                    className="w-full h-12 px-4 rounded-lg bg-[#0d1424] border border-blue-500/20 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <>
                  <p className="text-sm text-zinc-400 mb-3">Think of the answer, then click Got it if you were right</p>
                  <button
                    onClick={() => {
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
                    className="h-10 px-6 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium text-sm"
                  >
                    Got it
                  </button>
                </>
              )}
            </>
          )}

          {/* ── True / False ── */}
          {questionType === 'tf' && tfData && (
            <>
              <p className="text-zinc-400 text-sm mb-4">Is this definition correct for the term shown?</p>
              <div className="text-3xl font-bold text-zinc-100 mb-3">{question}</div>
              <div className={`rounded-lg p-4 mb-8 ${
                phase === 'feedback'
                  ? (isCorrect ? 'bg-green-900/30 border border-green-500/30' : 'bg-red-900/30 border border-red-500/30')
                  : 'bg-[#0d1424]'
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
                  let bg = 'bg-[#0d1424] border border-blue-500/20 text-zinc-200 hover:border-blue-400/60'
                  if (phase === 'feedback') {
                    if (userPicked) {
                      bg = isCorrect ? 'bg-green-500 border border-green-400 text-white' : 'bg-red-500 border border-red-400 text-white'
                    } else if (isCorrectChoice) {
                      bg = 'bg-green-500 border border-green-400 text-white'
                    } else {
                      bg = 'bg-[#0d1424] border border-zinc-700 text-zinc-500'
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

        {/* Skip button */}
        {phase === 'question' && !showSkipBadge && (
          <div className="text-center mt-6">
            <button
              onClick={handleSkip}
              className="text-sm text-blue-400/60 hover:text-blue-400 transition-colors"
            >
              Skip →
            </button>
          </div>
        )}
      </div>

      {/* Feature 4: Learn keyboard hint bar */}
      {questionType === 'mc' && phase === 'question' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-4 text-xs text-blue-400/40 bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full border border-blue-500/10 pointer-events-none">
          <span>1-4 Select</span>
        </div>
      )}

      {/* Settings drawer */}
      {settingsOpen && (
        <>
          <div
            onClick={() => setSettingsOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, height: '100vh', width: '300px',
            zIndex: 51, background: '#111827', borderLeft: '1px solid rgba(96,165,250,0.2)',
            padding: '1.5rem', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>Settings</span>
              <button onClick={() => setSettingsOpen(false)} style={{ color: '#60a5fa', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-zinc-300 mb-3">Question Type</h2>
                <div className="space-y-2">
                  {[
                    { value: 'mc', label: 'Multiple Choice only' },
                    { value: 'tta', label: 'Type the Answer only' },
                    { value: 'tf', label: 'True/False only' },
                    { value: 'mixed', label: 'Mixed (all three)' },
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
                      <span className="ml-3 text-zinc-300 text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-zinc-300 mb-3">Direction</h2>
                <div className="space-y-2">
                  {[
                    { value: 'term-to-def', label: 'Term → Definition' },
                    { value: 'def-to-term', label: 'Definition → Term' },
                    { value: 'mixed', label: 'Mixed (MC alternates)' },
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
                      <span className="ml-3 text-zinc-300 text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-zinc-300 mb-3">Options</h2>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.starredOnly}
                    onChange={e => setSettings(prev => ({ ...prev, starredOnly: e.target.checked }))}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <span className="ml-3 text-zinc-300 text-sm">⭐ Starred cards only</span>
                </label>
                {settings.starredOnly && starredCards.length === 0 && (
                  <p className="mt-2 text-xs text-yellow-400 ml-7">No starred cards yet</p>
                )}
                <p className="mt-3 text-xs text-zinc-500">Direction and type apply immediately. Restart to apply starred filter.</p>
              </div>

              <button
                onClick={() => { startSession(); setSettingsOpen(false) }}
                className="w-full h-10 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors font-medium text-sm"
              >
                Restart with These Settings
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  )
}

// ── McQuestion sub-component with keyboard shortcut support ───────────────────

function McQuestion({ prompt, question, options, phase, selectedAnswer, onAnswer, onKeySelect, currentPos }) {
  // Feature 4: keyboard shortcuts 1-4 for MC
  // READ: phase, options (via currentPos), currentPos; SET: nothing directly (calls onAnswer/onKeySelect)
  useEffect(() => {
    if (phase !== 'question') return
    function handleKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const idx = parseInt(e.key) - 1
      if (idx >= 0 && idx <= 3) onKeySelect(idx)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, currentPos]) // eslint-disable-line react-hooks/exhaustive-deps
  // onKeySelect is a stable inline fn recreated each render; currentPos is the proxy for options changing

  return (
    <>
      <p className="text-zinc-400 text-sm mb-4">{prompt}</p>
      <div className="text-3xl font-bold text-zinc-100 mb-8">{question}</div>
      <div className="grid grid-cols-2 gap-4">
        {options.map((option, idx) => {
          let bg = 'bg-[#0d1424] border border-blue-500/20 text-zinc-200 hover:border-blue-400/60'
          if (selectedAnswer === option) {
            bg = option.isCorrect
              ? 'bg-green-500 border border-green-400 text-white'
              : 'bg-red-500 border border-red-400 text-white'
          } else if (phase === 'feedback' && option.isCorrect) {
            bg = 'bg-green-500 border border-green-400 text-white'
          } else if (phase === 'feedback') {
            bg = 'bg-[#0d1424] border border-zinc-700 text-zinc-500'
          }
          return (
            <button
              key={idx}
              onClick={() => onAnswer(option)}
              disabled={phase !== 'question'}
              className={`p-4 rounded-lg font-medium text-sm transition-all text-left ${bg} ${phase !== 'question' ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <span className="text-[#60a5fa]/40 text-xs mr-2">{idx + 1}</span>
              {option.value}
            </button>
          )
        })}
      </div>
    </>
  )
}
